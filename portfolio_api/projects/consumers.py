# In portfolio_api/projects/consumers.py

import asyncio
import json
import logging
import os
from urllib.parse import parse_qs

import jwt
import websockets
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings

# Set up logging
logger = logging.getLogger(__name__)

def validate_jwt(token):
	"""Validate JWT token for terminal access.

	F4-02: tokens are slug-bound at mint time; the slug↔route match is
	checked separately in connect() (validate_jwt stays shape-only so its
	unit tests remain purpose/exp-focused).
	"""
	try:
		payload = jwt.decode(
			token, 
			settings.SECRET_KEY,
			algorithms=["HS256"]
		)
		# Check if token is for terminal access
		if payload.get('purpose') != 'terminal_access':
			logger.warning("Token has wrong purpose")
			return False

		# Check if token is expired
		exp = payload.get('exp')
		if not exp:
			logger.warning("Token has no expiration")
			return False

		return True
	except jwt.ExpiredSignatureError:
		logger.warning("Token has expired")
		return False
	except jwt.InvalidTokenError:
		logger.warning("Invalid token")
		return False
	except Exception:
		logger.error("Token validation error")
		return False

def token_slug(token):
	"""Return the decoded slug claim of a terminal token (None if absent).

	Only called AFTER validate_jwt() proved signature and exp — the decode
	here cannot fail for cryptographic reasons, so the claim lookup is the
	only branch.
	"""
	try:
		return jwt.decode(
			token, settings.SECRET_KEY, algorithms=["HS256"]
		).get('slug')
	except jwt.InvalidTokenError:
		# Defensive: validate_jwt already accepted this exact token, so a
		# decode failure here means a race (key rotation) — treat as unbound.
		logger.warning("Token re-decode failed while reading slug claim")
		return None
class TerminalConsumer(AsyncWebsocketConsumer):
	# F4-04: this consumer opts OUT of the channel layer entirely.
	#
	# Rationale (verified against channels 4.3.2 + channels-redis 4.3.0):
	# the terminal data plane never touches the layer — browser frames
	# arrive via the raw ASGI receive queue and upstream frames via this
	# consumer's OWN `websockets` connection; nothing here calls
	# group_send/group_add. The layer's only role was AsyncConsumer's
	# background BRPOP poll (every 5s), so when Render's free-tier Redis
	# idled out and evicted connections, that poll raised
	# redis.exceptions.TimeoutError and Daphne tore down LIVE sessions.
	# With channel_layer_alias = None, get_channel_layer(None) returns
	# None and channels runs the consumer without the layer — Redis is
	# structurally out of the terminal path (a full Redis outage can no
	# longer kill a session). If a future feature genuinely needs groups,
	# remove this AND re-read the F4-04 report: settings.CHANNEL_LAYERS is
	# pre-hardened (keepalive/health-check/retry_on_timeout) precisely so
	# that day is safe — but sessions then carry the poll again.
	channel_layer_alias = None

	async def connect(self):
		# Extract token from query string
		query_string = self.scope['query_string'].decode()
		query_params = parse_qs(query_string)
		token = query_params.get('token', [None])[0]
		
		if not token or not validate_jwt(token):
			logger.warning("Terminal access denied - invalid or missing token")
			await self.close(code=4003)
			return

		self.project_slug = self.scope['url_route']['kwargs']['project_slug']

		# F4-02 slug binding: the mint embeds the project slug and the token
		# may only open ITS OWN project's terminal. A token without a slug
		# claim is a pre-F4-02 token — rejected (v2 UI is the only client and
		# mints with ?slug= in lockstep; no compat window needed).
		if token_slug(token) != self.project_slug:
			logger.warning(
				"Terminal access denied - token slug does not match route "
				"(route=%s)", self.project_slug
			)
			await self.close(code=4003)
			return

		# Accept WebSocket connection from browser
		await self.accept()

		# Get terminal service URL from environment. No baked-in default:
		# a hardcoded Render URL in code (the pre-F2-07 state) silently
		# routes prod traffic to a specific deployment even when the env
		# var is missing — env-only fails loud at connect time instead.
		terminal_base_url = getattr(
			settings, 'TERMINAL_SERVICE_URL', None
		) or os.environ.get('TERMINAL_SERVICE_URL')
		if not terminal_base_url:
			logger.error(
				'TERMINAL_SERVICE_URL is not set — cannot dial the terminal '
				'service. Set it to the terminal service base URL (e.g. '
				'wss://terminal.example.com).'
			)
			await self.close(code=1011)
			return
		if terminal_base_url.startswith(('wss://', 'ws://')):
			self.terminal_url = f"{terminal_base_url}/terminal/{self.project_slug}/"
		else:
			# For development or if base URL doesn't include protocol
			self.terminal_url = f"wss://{terminal_base_url}/terminal/{self.project_slug}/"

		logger.info("Connecting to terminal service at: %s", self.terminal_url)
		
		# Shared-secret auth for the Django -> terminal hop. The old code dialed
		# the upstream with no credentials, so anyone who could reach the
		# terminal service directly got a shell. Fail-closed in production:
		# refuse to dial without the secret unless DEBUG is on (dev-compose
		# intentionally runs without it; the terminal service logs a loud
		# warning on its side and still accepts in DEBUG).
		proxy_secret = getattr(settings, 'TERMINAL_PROXY_SECRET', None)
		if not proxy_secret:
			if settings.DEBUG:
				logger.warning(
					"TERMINAL_PROXY_SECRET is not set - dialing terminal service "
					"without proxy authentication (DEBUG mode only). Set "
					"TERMINAL_PROXY_SECRET in production."
				)
			else:
				logger.error(
					"TERMINAL_PROXY_SECRET is not set and DEBUG is off - refusing "
					"to connect to terminal service (fail closed)."
				)
				await self.send(text_data=json.dumps({
					'output': "Terminal service is not configured (missing proxy secret). Contact the administrator.\r\n"
				}))
				await self.close()
				return
		
		upstream_headers = {'X-Proxy-Secret': proxy_secret} if proxy_secret else None
		
		try:
			# F4-02: forward the verified guest token upstream — the old hop
			# dropped it (audit finding), so the terminal service could not
			# verify anything but the proxy secret. Query param, not header:
			# the terminal service's dev direct-connect path (browser → :8001,
			# no custom WS headers possible) reuses the same param.
			dial_url = f"{self.terminal_url}?token={token}"
			# Connect to terminal service with increased timeout for S3 downloads
			# Timeout increased to account for:
			# - Render free tier cold start (10-30s)
			# - S3 file download for large projects (30-60s)
			# - ZIP extraction and bash initialization (10-20s)
			self.terminal_ws = await asyncio.wait_for(
				websockets.connect(
					dial_url,
					ping_interval=30,
					ping_timeout=120,
					additional_headers=upstream_headers,
				),
				timeout=180  # Increased from 60s to 180s (3 minutes)
			)
			
			# Start forwarding messages from terminal to browser
			self.forward_task = asyncio.create_task(self.forward_from_terminal())
			
			# Send welcome message
			await self.send(text_data=json.dumps({
				'output': "Connecting to terminal for {}...\r\n".format(self.project_slug)
			}))
			
		except asyncio.TimeoutError:
			error_msg = "Connection to terminal service timed out after 180 seconds. Server may be downloading project files.\r\n"
			logger.error(error_msg)
			await self.send(text_data=json.dumps({'output': error_msg}))
			await self.close()
		except Exception as e:
			# Handle connection errors
			error_msg = f"Error connecting to terminal service: {str(e)}\r\n"
			logger.error("Terminal connection error: %s", e)
			await self.send(text_data=json.dumps({'output': error_msg}))
			await self.close()

	async def disconnect(self, close_code):
		logger.info("WebSocket disconnecting with code: %s", close_code)
		# Clean up terminal connection when browser disconnects
		if hasattr(self, 'terminal_ws'):
			try:
				await self.terminal_ws.close()
				logger.info("Terminal WebSocket connection closed")
			except Exception as e:
				logger.error("Error closing terminal connection: %s", e)
		
		# Cancel forwarding task if active
		if hasattr(self, 'forward_task') and not self.forward_task.done():
			self.forward_task.cancel()
			try:
				await self.forward_task
				logger.info("Forward task cancelled")
			except asyncio.CancelledError:
				logger.info("Forward task was cancelled")

	async def forward_from_terminal(self):
		try:
			while True:
				try:
					message = await asyncio.wait_for(
						self.terminal_ws.recv(),
						timeout=300  # 5-minute timeout for receiving messages
					)
					logger.debug("Forwarding terminal message: %s...", message[:30])
					await self.send(text_data=message)
				except asyncio.TimeoutError:
					# Send a ping to keep the connection alive
					logger.info("Terminal read timeout - sending ping")
					await self.terminal_ws.ping()
					await self.send(text_data=json.dumps({
						'output': '\r\n[Terminal connection is still active...]\r\n'
					}))
		except websockets.ConnectionClosed as e:
			logger.warning("Terminal WebSocket closed with code %s: %s", e.code, e.reason)
			try:
				await self.send(text_data=json.dumps({
					'output': '\r\n\r\nTerminal connection closed. Refresh to reconnect.\r\n'
				}))
			except Exception as notify_exc:
				# Connection might already be closed
				logger.error("Failed to notify client about closed terminal connection: %s", str(notify_exc))
		except (ConnectionError, RuntimeError, ValueError) as e:
			logger.error("Error in forward_from_terminal: %s", str(e), exc_info=True)
			try:
				await self.send(text_data=json.dumps({
					'output': f'\r\n\r\nTerminal error: {str(e)}\r\n'
				}))
			except Exception as notify_exc:
				# Connection might already be closed
				logger.error("Failed to notify client about terminal error: %s", str(notify_exc))
				# Connection might already be closed
		finally:
			# Close the WebSocket connection when forwarding ends
			try:
				# Replace the is_closed check with a direct try/except
				await self.close()
			except (RuntimeError, Exception) as e:
				# Connection is likely already closed
				logger.debug("WebSocket connection already closed: %s", type(e).__name__)
	
	async def receive(self, text_data):
		if hasattr(self, 'terminal_ws'):
			try:
				# Check connection is still open by attempting to send
				await self.terminal_ws.send(text_data)
			except websockets.exceptions.ConnectionClosed:
				# Handle closed connection
				logger.warning("Terminal WebSocket closed when trying to send data")
				await self.send(text_data=json.dumps({
					'output': '\r\nTerminal connection lost, please refresh.\r\n'
				}))

class HealthCheckConsumer(AsyncWebsocketConsumer):
	# F4-04: same layer opt-out as TerminalConsumer — the handshake is a
	# single send+close over raw ASGI; the layer was pure crash surface
	# (see TerminalConsumer's note for the full rationale).
	channel_layer_alias = None

	async def connect(self):
		await self.accept()
		await self.send(text_data=json.dumps({
			'status': 'healthy',
			'service': 'websocket'
		}))
		await self.close()