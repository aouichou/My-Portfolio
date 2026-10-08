# portfolio-terminal/main.py

import asyncio
import hmac
import json
import logging
import os
import re
import shutil
import tempfile
import time
import uuid
import zipfile
from contextlib import asynccontextmanager
from pathlib import Path

import aiohttp
import boto3
import jwt
import psutil
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from pexpect import EOF, spawn

logger = logging.getLogger(__name__)

# ─── DB-driven demo whitelist (F4-01) ────────────────────────────────────────
# The API's has_demo flag is the single source of truth for which demos are
# enabled. This service syncs the frozen feed (contract §1 #3 + §6):
#   GET {API_BASE_URL}/api/projects/?has_demo=true&limit=100
# and keeps the slug set in memory. Enabling a demo = admin toggle + zip
# upload — zero code changes on this side (Batman's crown-jewel note).
#
# Env (§ comments inline below): API_BASE_URL, TERMINAL_WHITELIST_REFRESH_SECS.
API_BASE_URL = (
	os.getenv('API_BASE_URL')
	or os.getenv('BACKEND_URL')
	or 'https://api.aouichou.me'
).rstrip('/')
DEMO_FEED_PATH = '/api/projects/?has_demo=true&limit=100'

# Refresh cadence floor: a smaller configured value would hot-loop the API.
_WHITELIST_REFRESH_SECS_MIN = 10.0
_raw_refresh_secs = float(os.getenv('TERMINAL_WHITELIST_REFRESH_SECS', '300'))
if _raw_refresh_secs < _WHITELIST_REFRESH_SECS_MIN:
	logger.warning(
		'TERMINAL_WHITELIST_REFRESH_SECS=%s below floor %.0f — clamped',
		_raw_refresh_secs, _WHITELIST_REFRESH_SECS_MIN)
TERMINAL_WHITELIST_REFRESH_SECS = max(_raw_refresh_secs, _WHITELIST_REFRESH_SECS_MIN)
WHITELIST_RETRY_BACKOFF_SECS = 5.0       # sync-failure retry start, doubles…
WHITELIST_RETRY_BACKOFF_MAX_SECS = 60.0  # …up to this cap
WHITELIST_FORCED_DEBOUNCE_SECS = 2.0     # min spacing between forced refreshes
DEMO_NOT_ENABLED_MESSAGE = (
	'Project not found — this demo may not be enabled yet.'
)
_SLUG_RE = re.compile(r'^[a-zA-Z0-9_-]+$')


def parse_demo_feed(body: object) -> 'set[str] | None':
	"""Parse the contract §3.1 list envelope ({"count", "next", "previous",
	"results"}) into the set of demo-enabled slugs.

	Returns None when the envelope is malformed — the caller treats that as a
	failed sync (stale-keep on refresh, empty on first sync). A feed whose
	count exceeds the page also yields None: a truncated whitelist would
	silently reject demos the admin enabled.
	"""
	if not isinstance(body, dict):
		return None
	results = body.get('results')
	if not isinstance(results, list):
		return None
	slugs: set = set()
	for item in results:
		if not isinstance(item, dict):
			return None
		slug = item.get('slug')
		if not isinstance(slug, str) or not _SLUG_RE.match(slug):
			return None
		slugs.add(slug.lower())
	count = body.get('count')
	if isinstance(count, int) and count > len(results):
		logger.error(
			'Demo feed truncated: count=%d > page=%d — refusing partial whitelist',
			count, len(results))
		return None
	return slugs


class DemoWhitelist:
	"""In-memory snapshot of demo-enabled slugs synced from the API.

	Failure semantics (documented tradeoffs, F4-01):
	- first-sync failure  -> EMPTY set (fail-closed: nothing is enabled until
	  the API proves otherwise; startup retries with backoff, loudly)
	- refresh failure     -> keep serving the STALE set (stale-yes beats a
	  false-negative rejection of a demo the admin just enabled)
	"""

	def __init__(self) -> None:
		self.slugs: set = set()          # replaced wholesale on each sync
		self.last_sync: 'float | None' = None   # time.monotonic() of last SUCCESS
		self.last_attempt: float = 0.0   # time.monotonic() of last refresh attempt
		self._lock = asyncio.Lock()

	@property
	def synced(self) -> bool:
		return self.last_sync is not None

	def contains(self, slug: str) -> bool:
		return slug.lower() in self.slugs

	async def _fetch_slugs(self) -> 'set[str] | None':
		"""One HTTP GET against the demo feed. Returns the slug set, or None
		on any failure (transport, status, payload)."""
		url = f'{API_BASE_URL}{DEMO_FEED_PATH}'
		timeout = aiohttp.ClientTimeout(total=10)
		async with aiohttp.ClientSession(timeout=timeout) as session:
			async with session.get(url) as response:
				if response.status != 200:
					logger.error('Demo feed %s returned HTTP %d', url, response.status)
					return None
				body = await response.json(content_type=None)
		return parse_demo_feed(body)

	async def refresh(self, reason: str) -> bool:
		"""Sync from the API; True on success. Never raises for transport or
		parse failures (graceful degradation — see class docstring); task
		cancellation still propagates."""
		async with self._lock:
			self.last_attempt = time.monotonic()
			try:
				slugs = await self._fetch_slugs()
			except asyncio.CancelledError:
				raise
			except Exception as exc:
				# Any transport failure is a sync failure: stale-keep (or
				# stay empty before first sync). Logged loudly, never silent.
				logger.error('Whitelist sync (%s) failed: %s', reason, exc)
				return False
			if slugs is None:
				logger.error('Whitelist sync (%s): unusable feed payload', reason)
				return False
			self.slugs = slugs
			self.last_sync = time.monotonic()
			logger.info(
				'Whitelist sync (%s): %d demo slugs %s',
				reason, len(slugs), sorted(slugs))
			return True

	async def refresh_on_miss(self, slug: str) -> bool:
		"""One forced sync before rejecting a cache-miss (the just-enabled
		case: admin flips has_demo, a visitor connects before the cadence
		fires). Debounced so a flood of misses cannot stampede the API."""
		if time.monotonic() - self.last_attempt < WHITELIST_FORCED_DEBOUNCE_SECS:
			return self.contains(slug)
		await self.refresh(reason=f'cache-miss:{slug}')
		return self.contains(slug)


demo_whitelist = DemoWhitelist()

def is_demo_enabled(slug: str) -> bool:
	"""Sync membership test against the in-memory snapshot (no network).
	The forced refresh-on-miss lives in resolve_enabled_slug (endpoint path)."""
	return demo_whitelist.contains(slug)

async def whitelist_sync_loop(sleep=asyncio.sleep) -> None:
	"""Keep demo_whitelist fresh: sync at startup (backoff-retrying until the
	first success — EMPTY list until then, fail-closed), then refresh every
	TERMINAL_WHITELIST_REFRESH_SECS. Post-first-success failures keep the
	stale set and retry on the backoff schedule instead of the full cadence."""
	backoff = WHITELIST_RETRY_BACKOFF_SECS
	while True:
		reason = 'startup' if not demo_whitelist.synced else 'periodic'
		if await demo_whitelist.refresh(reason=reason):
			backoff = WHITELIST_RETRY_BACKOFF_SECS
			await sleep(TERMINAL_WHITELIST_REFRESH_SECS)
		else:
			logger.error(
				'Whitelist sync (%s) failed — %s; retrying in %.0fs',
				reason,
				'EMPTY whitelist, failing closed' if not demo_whitelist.synced
				else 'serving STALE whitelist',
				backoff)
			await sleep(backoff)
			backoff = min(backoff * 2, WHITELIST_RETRY_BACKOFF_MAX_SECS)

async def resolve_enabled_slug(raw_slug: str) -> str:
	"""sanitize_project_slug + one forced whitelist refresh on a 403
	cache-miss (the just-enabled case) before rejecting for good.
	Raises HTTPException (400 format / 403 not-enabled)."""
	try:
		return sanitize_project_slug(raw_slug)
	except HTTPException as exc:
		if exc.status_code != 403:
			raise
		if await demo_whitelist.refresh_on_miss(raw_slug.strip().lower()):
			return sanitize_project_slug(raw_slug)
		raise

# Service mode (env-driven; tests and docker-compose.dev run with DEBUG=True)
DEBUG_MODE = os.getenv('DEBUG', 'False').lower() in ('true', '1', 't')

# Session hardening (env-tunable):
#   TERMINAL_MAX_SESSIONS - hard cap on concurrent bash sessions
#   TERMINAL_IDLE_TIMEOUT - seconds without client input before disconnect
#   TERMINAL_MAX_LIFETIME - hard per-session lifetime cap in seconds
TERMINAL_MAX_SESSIONS = int(os.getenv('TERMINAL_MAX_SESSIONS', '10'))
TERMINAL_IDLE_TIMEOUT = float(os.getenv('TERMINAL_IDLE_TIMEOUT', '300'))
TERMINAL_MAX_LIFETIME = float(os.getenv('TERMINAL_MAX_LIFETIME', '900'))

# Shared secret for the Django->terminal proxy hop. When set, every WS
# connection must carry a matching X-Proxy-Secret header. Unset + DEBUG is
# allowed with a loud warning (dev-compose); unset in production fails closed.
PROXY_SECRET = os.getenv('TERMINAL_PROXY_SECRET')
PROXY_SECRET_HEADER = 'x-proxy-secret'

# F4-02 slug-bound guest tokens. The mint (Django) embeds the project slug
# in the HS256 guest JWT and Django now forwards the token on this hop
# (fixes the old "hop drops the token" audit finding). TERMINAL_JWT_SECRET
# must be the API's SECRET_KEY (shared secret, dashboard/CLI-set — never
# committed). Same posture as the proxy secret: unset + DEBUG allows with a
# loud warning (dev direct-connect has no Django in front to mint); unset
# in production fails closed.
TERMINAL_JWT_SECRET = os.getenv('TERMINAL_JWT_SECRET')
TOKEN_QUERY_PARAM = 'token'

def sanitize_project_slug(project_slug: str) -> str:
	"""
	Validate and sanitize project slug to prevent path traversal attacks.
	Returns sanitized slug or raises HTTPException.
	"""
	# Remove any whitespace
	project_slug = project_slug.strip()
	
	# Check if empty
	if not project_slug:
		raise HTTPException(status_code=400, detail="Project slug cannot be empty")
	
	# Only allow alphanumeric, underscore, and hyphen
	if not re.match(r'^[a-zA-Z0-9_-]+$', project_slug):
		raise HTTPException(status_code=400, detail="Invalid project slug format")
	
	# Check against the DB-driven whitelist (in-memory snapshot synced from
	# the API's has_demo feed). The forced refresh-on-miss for the
	# just-enabled case happens in resolve_enabled_slug().
	if project_slug.lower() not in demo_whitelist.slugs:
		raise HTTPException(status_code=403, detail=DEMO_NOT_ENABLED_MESSAGE)
	
	# Prevent path traversal attempts
	if '..' in project_slug or '/' in project_slug or '\\' in project_slug:
		raise HTTPException(status_code=400, detail="Invalid characters in project slug")
	
	return project_slug.lower()

def safe_join_path(base_dir: str, *paths: str) -> str:
	"""
	Safely join paths and ensure result is within base_dir.
	Prevents path traversal attacks.
	"""
	# Resolve the base directory to an absolute path
	base = Path(base_dir).resolve()
	
	# Join and resolve the full path
	full_path = Path(base, *paths).resolve()
	
	# Ensure the resolved path is within the base directory
	try:
		full_path.relative_to(base)
	except ValueError:
		raise HTTPException(status_code=403, detail="Access denied: path traversal detected")
	
	return str(full_path)

# The ONLY environment the bash child may ever see. This is an explicit
# allowlist -- never os.environ.copy(): the service environment carries the
# Cloudflare R2 credentials (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) and
# other deploy secrets, and an inherited env leaks them to any
# `echo $AWS_SECRET_ACCESS_KEY` typed into the demo terminal.
CHILD_ENV_ALLOWLIST = {
	'SHELL': '/bin/bash',
	'HOME': '/home/coder',
	'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
	'TERM': 'xterm-256color',
	'LANG': 'C.UTF-8',
	'PS1': '\\[\\033[1;32m\\]\\u@\\h:\\[\\033[1;34m\\]\\w\\[\\033[0m\\]\\$ ',
}

_LANG_RE = re.compile(r'^[A-Za-z0-9_.@+-]+$')

def build_child_env():
	"""Return the exact environment dict for the bash child process.

	Hotfix (C2/N1): the previous code copied os.environ into the child and ran
	a "scrub" AFTER spawn whose result was discarded (dead code), exposing
	every service secret to the shell. The child now gets ONLY the values
	above. LANG is the single value read from the service environment --
	sanitized to a locale-shaped string -- because bash needs it for sane
	behavior; it cannot carry credentials.
	"""
	env = dict(CHILD_ENV_ALLOWLIST)
	lang = os.environ.get('LANG', '')
	if lang and _LANG_RE.match(lang):
		env['LANG'] = lang
	return env

@asynccontextmanager
async def lifespan(app: FastAPI):
	# Startup code
	print("Starting terminal service...")

	# Start health check task
	health_check_task = asyncio.create_task(periodic_health_checks())

	# F4-01: keep the DB-driven demo whitelist in sync (starts EMPTY —
	# fail-closed — until the first successful feed fetch)
	whitelist_task = asyncio.create_task(whitelist_sync_loop())

	# Check terminal security (skip in development mode)
	if not DEBUG_MODE and not check_terminal_security():
		print("Security check failed. Shutting down...")
		yield
		return
	elif DEBUG_MODE:
		print("Running in development mode - security checks skipped")

	yield

	# Shutdown code
	print("Shutting down terminal service...")

	# Cancel health check task
	health_check_task.cancel()
	try:
		await health_check_task
	except asyncio.CancelledError:
		pass

	# Cancel whitelist sync task
	whitelist_task.cancel()
	try:
		await whitelist_task
	except asyncio.CancelledError:
		pass

	# Terminate all active terminals (reserved-but-unspawned slots hold None)
	for session_id, child in list(active_terminals.items()):
		try:
			if child is not None:
				child.close()
				print(f"Terminated terminal session {session_id}")
		except Exception as e:
			print(f"Error terminating session {session_id}: {e}")

	print("Terminal service shutdown complete")

app = FastAPI(lifespan=lifespan)

async def periodic_health_checks():
	"""Send periodic health checks to other services to prevent shutdown"""
	services = {
		"backend": os.environ.get("BACKEND_URL", "https://api.aouichou.me"),
		"frontend": os.environ.get("FRONTEND_URL", "https://aouichou.me")
	}

	while True:
		try:
			async with aiohttp.ClientSession() as session:
				for name, url in services.items():
					try:
						async with session.get(f"{url}/healthz", timeout=5) as response:
							print(f"Health check to {name}: {response.status}")
					except Exception as e:
						print(f"Failed health check to {name}: {str(e)}")
		except Exception as e:
			print(f"Error in health checks: {str(e)}")

		# Wait for 10 minutes before next check
		await asyncio.sleep(600)  # 600 seconds = 10 minutes

active_terminals = {}
error_counter = 0
last_error_message = ""
last_error_timestamp = None

@app.get("/metrics")
async def metrics():
	memory = psutil.virtual_memory()
	return {
		"memory_used_percent": memory.percent,
		"active_terminals": len(active_terminals),
		"uptime": time.time() - app_start_time
	}

app_start_time = time.time()

@app.get("/healthz")
async def health_check():
	return {"status": "healthy"}

def proxy_authorized(websocket: WebSocket) -> bool:
	"""Enforce the shared proxy secret on the Django->terminal hop.

	Fail-closed: when TERMINAL_PROXY_SECRET is set, every connection must
	carry a matching X-Proxy-Secret header (constant-time compare). When the
	secret is unset we allow only in development (DEBUG) with a loud warning
	-- production without the secret is a misconfiguration and is refused.
	NOTE: dev-compose intentionally runs without the secret because the dev
	UI connects DIRECTLY to :8001 (browsers cannot send custom WS headers),
	so an unset secret in DEBUG keeps the documented current dev behavior.
	"""
	if PROXY_SECRET:
		provided = websocket.headers.get(PROXY_SECRET_HEADER, '')
		return hmac.compare_digest(provided.encode('utf-8'), PROXY_SECRET.encode('utf-8'))
	if DEBUG_MODE:
		logger.warning(
			"TERMINAL_PROXY_SECRET is not set -- accepting unauthenticated "
			"terminal connections (DEBUG mode only). Set TERMINAL_PROXY_SECRET "
			"in production."
		)
		return True
	logger.error("TERMINAL_PROXY_SECRET is not set and DEBUG is off -- failing closed")
	return False

def verify_guest_token(token, project_slug):
	"""Verify the slug-bound guest JWT forwarded by Django (F4-02).

	Checks signature (TERMINAL_JWT_SECRET = the API's SECRET_KEY), exp,
	purpose, and that the token's slug claim matches the requested project
	-- a minted token may only open ITS OWN project's terminal.

	Returns (ok, error_message): error_message is None when ok. Mirror of
	the proxy-secret posture: no secret configured + DEBUG allows (dev
	direct-connect mints nothing); no secret + production fails closed.
	"""
	if not TERMINAL_JWT_SECRET:
		if DEBUG_MODE:
			logger.warning(
				"TERMINAL_JWT_SECRET is not set -- accepting connections "
				"without token verification (DEBUG mode only). Set "
				"TERMINAL_JWT_SECRET (the API SECRET_KEY) in production."
			)
			return True, None
		logger.error(
			"TERMINAL_JWT_SECRET is not set and DEBUG is off -- failing closed"
		)
		return False, 'terminal auth is not configured'

	if not token:
		return False, 'missing terminal token'
	try:
		payload = jwt.decode(token, TERMINAL_JWT_SECRET, algorithms=['HS256'])
	except jwt.ExpiredSignatureError:
		return False, 'terminal token has expired'
	except jwt.InvalidTokenError:
		return False, 'invalid terminal token'
	if payload.get('purpose') != 'terminal_access':
		return False, 'invalid terminal token'
	if payload.get('slug') != project_slug:
		logger.warning(
			"Token slug %r does not match requested project %r",
			payload.get('slug'), project_slug)
		return False, 'terminal token is not valid for this project'
	return True, None

class InputLineBuffer:
	"""Accumulate per-session keystrokes into logical lines for validation.

	Fixes the split-frame bypass: the official xterm.js client sends every
	keystroke as its own frame, so validating only frames that contain
\t\r/\n let normally-typed commands reach bash unvalidated. Validation must
	run on the line assembled ACROSS frames, at the moment Enter arrives.

	Handling:
	- printable characters: accumulated AND forwarded
	- Enter (\r/\n): completes the line -> ('enter', line) action
	- Backspace (\x7f/\x08): edits the buffer AND is forwarded
	- Ctrl+C (\x03), Ctrl+D (\x04), Ctrl+U (\x15): clear the buffer AND are
	  forwarded (they interrupt/clear the shell line too)
	- every other control character, Tab, and escape sequence (arrow keys,
	  history recall, etc.): DROPPED -- bash-side line editing or history
	  recall would desync this buffer from what bash actually executes.
	  Known UX trade-off (no arrows/Tab in the demo), accepted for the hotfix.

	feed() returns ordered actions:
	  ('forward', str)  -- bytes to write to the shell
	  ('enter', line)   -- Enter pressed; validate `line` before forwarding '\r'
	"""

	MAX_LINE_LENGTH = 512
	_FORWARDED_CONTROLS = {'\x03', '\x04', '\x15'}  # Ctrl+C, Ctrl+D, Ctrl+U

	def __init__(self):
		self._line = ''
		self._escape_state = 0  # 0: none, 1: saw ESC, 2: inside CSI/SS3

	def feed(self, text):
		"""Consume one client input frame; return ordered (action, payload) tuples."""
		actions = []
		forward = []

		def flush_forward():
			if forward:
				actions.append(('forward', ''.join(forward)))
				forward.clear()

		for ch in text:
			if self._escape_state == 1:
				# Second byte of an escape sequence: CSI/SS3 introducer or single-char seq
				self._escape_state = 2 if ch in ('[', 'O') else 0
				continue
			if self._escape_state == 2:
				# CSI/SS3 sequences terminate on a byte in 0x40-0x7E
				if '@' <= ch <= '~':
					self._escape_state = 0
				continue
			if ch == '\x1b':
				flush_forward()
				self._escape_state = 1
				continue
			if ch in ('\r', '\n'):
				flush_forward()
				line = self._line
				self._line = ''
				actions.append(('enter', line))
				continue
			if ch in ('\x7f', '\x08'):
				self._line = self._line[:-1]
				forward.append(ch)
				continue
			if ch in self._FORWARDED_CONTROLS:
				self._line = ''
				forward.append(ch)
				continue
			if ch < ' ' or '\x80' <= ch <= '\x9f':
				# Any other control character (Tab, Ctrl+whatever, C1): drop
				continue
			if len(self._line) >= self.MAX_LINE_LENGTH:
				# Over-cap characters are dropped, never forwarded
				continue
			self._line += ch
			forward.append(ch)
		flush_forward()
		return actions

	@property
	def line(self):
		"""Current (incomplete) accumulated line -- for tests/introspection."""
		return self._line

@app.websocket("/terminal/{project_slug}/")
async def terminal_endpoint(websocket: WebSocket, project_slug: str):
	await websocket.accept()
	logger.info("WebSocket connection accepted for %s", project_slug)
	
	# Initialize variables that might be used in finally block
	read_task = None

	# Proxy shared secret gate -- cheapest check first
	if not proxy_authorized(websocket):
		await websocket.send_json({'error': 'unauthorized: missing or invalid proxy secret'})
		await websocket.close(code=4401)
		return

	# F4-02 slug-bound guest token gate (Django forwards the verified token
	# on this hop). Kept after the proxy gate, before any session work.
	token = websocket.query_params.get(TOKEN_QUERY_PARAM)
	token_ok, token_error = verify_guest_token(token, project_slug)
	if not token_ok:
		await websocket.send_json({'error': f'unauthorized: {token_error}'})
		await websocket.close(code=4401)
		return

	# Hard cap on concurrent sessions -- reject before doing any work
	if len(active_terminals) >= TERMINAL_MAX_SESSIONS:
		logger.warning(
			"Rejecting connection: session cap reached (%d active >= %d max)",
			len(active_terminals), TERMINAL_MAX_SESSIONS
		)
		await websocket.send_json({
			'error': f'Server busy: all {TERMINAL_MAX_SESSIONS} terminal sessions are in use. Please try again in a few minutes.'
		})
		await websocket.close(code=1013)
		return

	try:
		# Validate, sanitize and enforce DB-driven demo enablement (one
		# forced whitelist refresh on a cache-miss before rejecting)
		project_slug = await resolve_enabled_slug(project_slug)
	except HTTPException as e:
		await websocket.send_json({'error': e.detail})
		await websocket.close()
		return

	# Create unique session ID and reserve its slot immediately (before the
	# potentially slow project download) so concurrent connects cannot
	# overshoot the session cap. The slot holds None until bash is spawned.
	session_id = str(uuid.uuid4())
	logger.info("Generated session ID: %s", session_id)
	active_terminals[session_id] = None
	
	try:
		# Check for project directory and download files if needed
		# Use safe_join_path to prevent path traversal
		base_projects_dir = "/home/coder/projects"
		project_dir = safe_join_path(base_projects_dir, project_slug)
		should_download = False
		
		if not os.path.exists(project_dir):
			os.makedirs(project_dir, exist_ok=True)
			should_download = True
		else:
			# Directory exists, but check if it's empty or just contains README
			files = os.listdir(project_dir)
			if not files or (len(files) == 1 and 'README.md' in files):
				should_download = True
		
		if should_download:
			await websocket.send_json({
				'output': f"\r\n📦 Downloading project files for {project_slug}...\r\n"
			})
			await websocket.send_json({
				'output': "This may take 1-2 minutes for large projects. Please wait...\r\n\r\n"
			})
			
			# Download in a separate thread to avoid blocking
			loop = asyncio.get_event_loop()
			files_downloaded = await loop.run_in_executor(
				None, download_project_files, project_slug, project_dir
			)
			
			if not files_downloaded:
				await websocket.send_json({
					'output': "\r\n⚠️  Failed to download project files. Using empty project.\r\n"
				})
			else:
				await websocket.send_json({
					'output': "\r\n✅ Project files downloaded successfully!\r\n"
				})
		else:
			logger.info("Using existing project directory: %s, contains: %s", project_dir, os.listdir(project_dir))
		
		# Explicit env allowlist -- the child must NOT inherit service secrets
		env = build_child_env()

		# Initialize terminal with bash instead of zsh - more reliable
		await websocket.send_json({
			'output': "\r\n🚀 Spawning terminal session...\r\n"
		})
		
		# Use bash instead of zsh for more reliable prompt detection
		child = spawn('/bin/bash', ['--login'], cwd=project_dir, env=env, encoding='utf-8', timeout=300)
		child.setwinsize(40, 120)  # Initial size

		
		# More permissive prompt detection with longer timeout
		# Account for:
		# - Shell initialization scripts (bashrc, profile)
		# - Network-mounted home directories
		# - Slow I/O on Render free tier
		try:
			# More lenient prompt patterns to catch various bash prompt styles
			# Including: colored prompts, custom PS1, unicode characters
			await asyncio.wait_for(
				asyncio.get_event_loop().run_in_executor(
					None, lambda: child.expect([
						r'[$#>]',  # Basic prompt chars
					r'bash.*[$#>]',  # bash-4.4$
					r'[@\w-]+[:~].*[$#>]',  # user@host:path$
					r'\[.*\].*[$#>]',  # Colored prompts with escape codes
					r'.*[$#>]\s*$',  # Any prompt ending with $/#/>
				])
				),
				timeout=45  # Increased from 15s to 45s to handle slow initialization
			)
			logger.info("Bash prompt detected successfully")
		except asyncio.TimeoutError:
			# Don't fail - just log and continue
			# The terminal might be ready even if we didn't detect the prompt
			logger.warning("Prompt detection timed out after 45s, but continuing anyway")
			await websocket.send_json({
				'output': "\r\n⚠️  Prompt detection timed out, but terminal should be ready.\r\n"
			})
		except Exception as e:
			logger.error("Error waiting for prompt: %s", e)
			await websocket.send_json({
				'output': f"\r\n⚠️  Prompt detection error: {str(e)}, but terminal may still work.\r\n"
			})
		
		active_terminals[session_id] = child
		
		# Send welcome message
		await websocket.send_json({
			'output': f"\r\n\r\nWelcome to {project_slug} terminal! Type 'ls' to see project files.\r\n"
		})
		
		# Read from terminal in background task
		read_task = asyncio.create_task(read_terminal_output(websocket, child))
		
		# Per-session line accumulator: validation must see the whole command
		# assembled across frames, not whatever single frame carries Enter.
		line_buffer = InputLineBuffer()
		
		# Process client messages under idle + hard-lifetime budgets
		session_started = time.monotonic()
		while True:
			elapsed = time.monotonic() - session_started
			if elapsed >= TERMINAL_MAX_LIFETIME:
				await websocket.send_json({
					'output': f"\r\n⏱ Maximum session duration ({int(TERMINAL_MAX_LIFETIME)}s) reached — disconnecting. Refresh for a new session.\r\n"
				})
				await websocket.close(code=1000)
				break
			budget = min(TERMINAL_IDLE_TIMEOUT, TERMINAL_MAX_LIFETIME - elapsed)
			try:
				data = await asyncio.wait_for(websocket.receive_text(), timeout=budget)
			except asyncio.TimeoutError:
				if time.monotonic() - session_started >= TERMINAL_MAX_LIFETIME:
					await websocket.send_json({
						'output': f"\r\n⏱ Maximum session duration ({int(TERMINAL_MAX_LIFETIME)}s) reached — disconnecting. Refresh for a new session.\r\n"
					})
				else:
					await websocket.send_json({
						'output': f"\r\n⏱ Disconnected after {int(TERMINAL_IDLE_TIMEOUT)}s of inactivity. Refresh to reconnect.\r\n"
					})
				await websocket.close(code=1000)
				break
			
			# Protocol gate: every frame must be a JSON object. The old code
			# wrote non-JSON frames straight to bash, bypassing all validation.
			try:
				message = json.loads(data)
				if not isinstance(message, dict):
					raise ValueError('frame is not a JSON object')
			except (json.JSONDecodeError, ValueError):
				logger.warning("Protocol violation: non-JSON frame received — closing connection")
				await websocket.send_json({'error': 'protocol violation: frames must be JSON objects'})
				await websocket.close(code=1002)
				break
			
			try:
				# Handle resize commands
				if 'resize' in message and isinstance(message['resize'], dict):
					rows = message['resize'].get('rows', 24)
					cols = message['resize'].get('cols', 80)
					logger.info("Resizing terminal to %sx%s", rows, cols)
					child.setwinsize(rows, cols)
				
				# Handle input with line-accumulating validation
				elif 'input' in message:
					user_input = message['input']
					if not isinstance(user_input, str):
						await websocket.send_json({'error': "invalid 'input' frame: expected a string"})
						continue
					
					for action, payload in line_buffer.feed(user_input):
						if action == 'forward':
							child.write(payload)
						elif action == 'enter':
							# Validate the ACCUMULATED line before Enter reaches bash
							if validate_command(payload):
								child.write('\r')
							else:
								# Kill bash's copy of the rejected line (Ctrl+U);
								# never forward the Enter keystroke itself.
								child.write('\x15')
								await websocket.send_json({
									'output': f"\r\n❌ Command blocked by security policy: '{payload}'\r\n"
								})
								await websocket.send_json({
									'output': "Only basic file inspection and compilation commands are allowed.\r\n"
								})
				
				else:
					# Unknown frame keys (mfa_code etc.) are ignored, not forwarded
					logger.debug("Ignoring frame with unknown keys: %s", sorted(message.keys()))
				
			except Exception as e:
				logger.error("Error processing message: %s", e)
				await websocket.send_json({
					'output': f"\r\nError: {str(e)}\r\n"
				})
				
	except WebSocketDisconnect:
		logger.info("WebSocket disconnected for session %s", session_id)
	except Exception as e:
		logger.error("Terminal session error: %s", e)
		try:
			await websocket.send_json({
				'output': f"\r\n\r\nTerminal error: {str(e)}\r\n"
			})
		except (RuntimeError, ConnectionError) as send_error:
			logger.debug("Failed to send error message: %s", send_error)
	finally:
		if read_task and not read_task.done():
			read_task.cancel()
			try:
				await read_task
			except asyncio.CancelledError:
				pass
		# Cleanup on disconnect (slot may still hold None if spawn never happened)
		child = active_terminals.pop(session_id, None)
		if child is not None:
			try:
				child.terminate()
				logger.info("Terminated session %s", session_id)
			except Exception as cleanup_error:
				logger.error("Failed to terminate session %s: %s", session_id, cleanup_error)
		else:
			logger.info("Released reserved session slot %s", session_id)

async def read_terminal_output(websocket, child):
	while True:
		try:
			output = await asyncio.get_event_loop().run_in_executor(
				None, lambda: child.read_nonblocking(size=1024, timeout=0.1)
			)
			if output:
				print(f"Read from terminal: {output[:20]}...")
				try:
					await websocket.send_text(json.dumps({
						'output': output
					}))
					print(f"Sent message to client, length: {len(output)}")
				except Exception as e:
					print(f"Error sending to WebSocket: {e}")
					break  # Break the loop if WebSocket is disconnected
		except EOF:
			await websocket.send_text(json.dumps({
				'output': "\r\nSession terminated.\r\n"
			}))
			break
		except Exception:
			# Timeout or other error, just continue
			await asyncio.sleep(0.1)

def validate_command(command):
	"""Validate terminal commands with improved security"""
	# Strip whitespace for cleaner matching
	command = command.strip()
	
	# Allow empty commands (just pressing enter)
	if not command:
		return True
	
	# Allowlist approach for basic commands
	allowed_patterns = [
		# Basic navigation and file inspection
		r'^ls(\s+-[altrh]+)*(\s+[\w\./-]+)*$',
		r'^cat(\s+[\w\./-]+)+$',
		r'^cd(\s+[\w\./-]+)?$',
		r'^pwd$',
		r'^echo\s+.*$',
		r'^clear$',
		
		# Development commands
		r'^make(\s+[\w-]+)?$',
		r'^gcc(\s+-[a-zA-Z]+)*(\s+[\w\./-]+)+$',
		r'^./[\w-]+$',  # Run executables in current directory
		
		# Basic file manipulation
		r'^touch\s+[\w\./-]+$',
		r'^mkdir(\s+-p)?\s+[\w\./-]+$',
		
		# Help commands
		r'^help$',
		r'^man\s+[\w-]+$',
		r'^download\s+[\w\./-]+$',
	]
	
	# Check if command matches any allowed pattern
	for pattern in allowed_patterns:
		if re.match(pattern, command):
			logger.info("Command allowed by pattern: %s", command)
			return True
		
	# Container escape checks - CRITICAL SECURITY
	blocked_sequences = [
		'docker', 'kubectl', 'sudo', 'su ', 'ssh',
		'--privileged', '--cap-add', 'nsenter', 
		'unshare', 'mount', 'umount', 'chroot',
		'pivot_root', 'cgroup', 'setns', 'ptrace',
		'ld.so', 'proc', '/dev/'
	]
	
	if any(seq in command for seq in blocked_sequences):
		logger.warning("Blocked command with suspicious sequence: %s", command)
		return False
		
	# Path traversal protection
	if any('../' in part for part in command.split()):
		logger.warning("Blocked command with path traversal: %s", command)
		return False
		
	# Protect against command chaining/injection
	command_operators = [';', '&&', '||', '`', '$(',  '|', '>', '<']
	if any(op in command for op in command_operators):
		logger.warning("Blocked command with operator: %s", command)
		return False
		
	# Additional deny list for extra security
	dangerous_commands = [
		'rm -rf', 'chmod 777', ':(){', 'curl | bash',
		'wget | bash', '> /dev', '> /proc', '> /sys'
	]
	
	if any(cmd in command for cmd in dangerous_commands):
		logger.warning("Blocked dangerous command: %s", command)
		return False

	# If nothing matched, deny by default (security first)
	logger.warning("Command denied (no matching pattern): %s", command)
	return False

@app.get("/error-stats")
async def error_statistics():
	return {
		"errors": error_counter,
		"last_error": last_error_message,
		"last_error_time": last_error_timestamp
	}

def download_project_files(project_slug, project_dir):
	"""Download project files from S3 if they exist, or copy from local backend in DEBUG mode"""
	try:
		# Check if running in DEBUG mode (local development)
		if DEBUG_MODE:
			# Local development: copy from backend media directory
			local_zip_path = f'/backend-media/project-files/{project_slug}.zip'
			if os.path.exists(local_zip_path):
				print(f"Using local project files: {local_zip_path}")
				try:
					with zipfile.ZipFile(local_zip_path, 'r') as zip_ref:
						zip_ref.extractall(project_dir)
					print(f"✅ Extracted project files to {project_dir}")
					return True
				except Exception as e:
					print(f"Failed to extract local zip: {e}")
					return False
			else:
				print(f"Local project file not found: {local_zip_path}")
				return False
		
		# Production: download from Cloudflare R2 (S3-compatible)
		logger.info("Production mode: downloading from R2 for project: %s", project_slug)
		# Initialize R2 client with environment variables
		s3 = boto3.client(
			's3',
			aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
			aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
			region_name=os.environ.get('AWS_S3_REGION_NAME', 'auto'),
			endpoint_url=os.environ.get('AWS_S3_ENDPOINT_URL')  # R2 endpoint
		)
		
		# The expected file path in R2 (matches your Django view)
		s3_path = f'project-files/{project_slug}.zip'
		bucket_name = os.environ.get('AWS_STORAGE_BUCKET_NAME', 'portfolio-bucket')
		
		if not bucket_name:
			print("Missing R2 bucket configuration")
			return False
			
		print(f"Looking for R2 object: {s3_path} in bucket {bucket_name}")

		# Check if we've already downloaded this project in the last 24 hours
		cache_marker = os.path.join(project_dir, ".cached_download")
		if os.path.exists(cache_marker):
			with open(cache_marker, 'r') as f:
				try:
					timestamp = float(f.read().strip())
					if time.time() - timestamp < 86400:  # 24 hours
						print("Using cached project files (downloaded less than 24h ago)")
						return True
				except Exception as exc:
					logger.debug("Ignoring invalid cache marker: %s", exc)

		try:
			# Get object metadata to check if it exists and get size
			obj = s3.head_object(Bucket=bucket_name, Key=s3_path)
			file_size = obj['ContentLength']
			print(f"Found object in S3. Size: {file_size} bytes")
			
			# For large files, check if we have enough disk space
			free_space = shutil.disk_usage(project_dir).free
			if free_space < file_size * 2:  # Need twice the space for zip + extracted files
				print(f"Not enough disk space to download and extract {file_size} bytes")
				return False
				
		except s3.exceptions.ClientError as e:
			if e.response['Error']['Code'] == '404':
				print(f"Project file {s3_path} doesn't exist in S3 bucket")
				return False
			else:
				print(f"Error checking S3 object: {e}")
				raise

		# Create temp file for downloading
		with tempfile.NamedTemporaryFile(suffix='.zip') as temp_file:
			try:
				# Download the zip file from S3 with progress reporting
				print(f"Downloading {s3_path} to {temp_file.name}")
				
				# Set up a callback to track download progress
				downloaded = 0
				last_reported = 0
				
				def download_progress(chunk):
					nonlocal downloaded, last_reported
					downloaded += chunk
					progress = int((downloaded / file_size) * 100)
					if progress > last_reported + 4:  # Report every 5%
						last_reported = progress
						print(f"Download progress: {progress}%")
				
				# Use TransferConfig with reduced threads for Render free tier
				config = boto3.s3.transfer.TransferConfig(
					multipart_threshold=1024 * 50,  # 50MB
					max_concurrency=2,  # Reduced from 10 to avoid thread exhaustion
					use_threads=False  # Disable threading on free tier
				)
				
				s3.download_file(
					bucket_name, 
					s3_path, 
					temp_file.name,
					Callback=download_progress,
					Config=config
				)
				
				# Check if file downloaded correctly
				file_size = os.path.getsize(temp_file.name)
				print(f"Downloaded file size: {file_size} bytes")
				if file_size == 0:
					print("Downloaded file is empty")
					return False
				
				# Extract the zip file to the project directory with progress updates
				print(f"Opening ZIP file {temp_file.name}")
				# Use blocklist instead of allowlist - block dangerous file types
				BLOCKED_EXTENSIONS = {'.exe', '.dll', '.so', '.dylib', '.bin', '.app', '.dmg', '.pkg', '.deb', '.rpm'}
				with zipfile.ZipFile(temp_file.name, 'r') as zip_ref:
					for file in zip_ref.namelist():
						# Skip directory entries (end with /)
						if file.endswith('/'):
							continue
						# Check for dangerous file extensions
						file_ext = os.path.splitext(file)[1].lower()
						if file_ext in BLOCKED_EXTENSIONS:
							print(f"Warning: Skipping blocked file type: {file}")
							continue
						# Block path traversal attempts
						if '..' in file or file.startswith('/'):
							print(f"Warning: Skipping file with suspicious path: {file}")
							continue
					total_files = len([f for f in zip_ref.namelist() if not f.endswith('/')])
					print(f"ZIP contains {total_files} files (excluding directories): {zip_ref.namelist()[:5]}...")
					
					# Extract in smaller batches to avoid memory issues
					for i, file in enumerate(zip_ref.namelist()):
						# Skip directories
						if file.endswith('/'):
							continue
						# Skip blocked extensions
						file_ext = os.path.splitext(file)[1].lower()
						if file_ext in BLOCKED_EXTENSIONS:
							continue
						# Skip path traversal
						if '..' in file or file.startswith('/'):
							continue
							
						zip_ref.extract(file, project_dir)
						if i % 10 == 0:  # Report progress every 10 files
							print(f"Extracted {i}/{total_files} files")
					
					# Verify extraction
					extracted = os.listdir(project_dir)
					print(f"Files in project dir after extraction: {extracted}")
					if len(extracted) == 0:
						print("No files extracted")
						return False
						
					# Create cache marker
					with open(cache_marker, 'w') as f:
						f.write(str(time.time()))
						
					return True
			except zipfile.BadZipFile as e:
				print(f"Bad ZIP file: {e}")
				# Try to get file format info
				with open(temp_file.name, 'rb') as f:
					header = f.read(10)
					print(f"File header (hex): {header.hex()}")
				return False
			except Exception as e:
				print(f"Error extracting project: {e}")
				return False
	except Exception as e:
		print(f"Project file download error: {e}")
		return False

@app.get("/images/{project_slug}/{image_name}")
async def get_project_image(project_slug: str, image_name: str):
	"""Serve project generated images"""
	try:
		# Validate and sanitize project slug
		project_slug = sanitize_project_slug(project_slug)
		
		# Validate image name - only allow alphanumeric, dots, hyphens, underscores
		if not re.match(r'^[a-zA-Z0-9._-]+$', image_name):
			raise HTTPException(status_code=400, detail="Invalid image name")
		
		# Prevent path traversal in image name
		if '..' in image_name or '/' in image_name or '\\' in image_name:
			raise HTTPException(status_code=400, detail="Invalid characters in image name")
		
		# Use safe_join_path to construct the path
		base_projects_dir = "/home/coder/projects"
		project_dir = safe_join_path(base_projects_dir, project_slug)
		image_path = safe_join_path(project_dir, "images", image_name)
		
		# Verify the file exists and is within the expected directory
		if not os.path.exists(image_path):
			raise HTTPException(status_code=404, detail="Image not found")
		
		# Additional security: verify it's actually a file, not a directory
		if not os.path.isfile(image_path):
			raise HTTPException(status_code=403, detail="Invalid file type")
		
		return FileResponse(image_path)
		
	except HTTPException:
		raise
	except Exception as e:
		logger.error("Error serving image: %s", e)
		raise HTTPException(status_code=500, detail="Internal server error")

def check_terminal_security():
	"""Verify security setup of terminal environment"""
	logger.info("Verifying terminal security...")
	
	# Check if running as non-root
	if os.geteuid() == 0:
		logger.error("SECURITY ERROR: Running as root!")
		return False
	
	# Check if in privileged mode by attempting a blocked syscall
	try:
		# Try to create a user namespace which should be blocked
		pid = os.fork()
		if pid == 0:
			os.unshare(0x10000000)  # CLONE_NEWUSER
			os._exit(0)
		os.waitpid(pid, 0)
		logger.error("SECURITY ERROR: Container has user namespace privileges!")
		return False
	except OSError:
		# This is expected - we want this to fail
		logger.info("Security check passed: User namespace creation blocked")
	
	# Check filesystem permissions
	if os.access('/proc/kcore', os.R_OK):
		logger.error("SECURITY ERROR: Can access sensitive kernel files!")
		return False
	
	logger.info("Security checks passed. Terminal environment is secure")
	return True