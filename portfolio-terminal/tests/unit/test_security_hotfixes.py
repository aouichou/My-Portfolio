# tests/unit/test_security_hotfixes.py
"""
Unit tests for the pre-rework security hotfixes in main.py.

Covers:
- build_child_env: explicit env allowlist (no AWS_*/service secrets leak to bash)
- InputLineBuffer: per-keystroke frames accumulate; Enter validates the whole
  line; backspace/Ctrl+C edit the buffer; escape sequences and raw control
  chars are dropped (they would desync the buffer from bash's line state)
- proxy_authorized: shared-secret gate (set -> header required; unset+DEBUG ->
  allowed; unset+prod -> fail closed)
"""

import os
import sys
import unittest.mock as m

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
os.environ.setdefault('DEBUG', 'True')
for mod in ['redis', 'pexpect', 'boto3', 'psutil', 'aiohttp']:
    if mod not in sys.modules:
        sys.modules[mod] = m.MagicMock()

import main

# ═════════════════════════════════════════════════════════════════════════════
# Hotfix 1 — env allowlist on bash spawn
# ═════════════════════════════════════════════════════════════════════════════

class TestChildEnvAllowlist:

	def test_env_contains_no_aws_credentials(self):
		"""The R2 key pair must never reach the bash child."""
		with m.patch.dict(os.environ, {
			'AWS_ACCESS_KEY_ID': 'AKIAFAKE',
			'AWS_SECRET_ACCESS_KEY': 'fake-secret',
			'AWS_S3_ENDPOINT_URL': 'https://fake.r2.cloudflarestorage.com',
			'REDIS_URL': 'redis://user:pass@redis:6379',
			'SMTP_PASSWORD': 'super-secret',
		}):
			env = main.build_child_env()
		for key in env:
			assert not key.startswith('AWS'), f"AWS var leaked to child env: {key}"
			assert key not in ('REDIS_URL', 'SMTP_PASSWORD'), f"secret leaked: {key}"

	def test_env_is_exactly_the_allowlist(self):
		"""Allowlist is closed: only the known-safe keys, nothing inherited."""
		env = main.build_child_env()
		assert set(env.keys()) == set(main.CHILD_ENV_ALLOWLIST.keys())

	def test_env_has_required_keys_for_sane_bash(self):
		env = main.build_child_env()
		for key in ('PATH', 'HOME', 'TERM', 'SHELL'):
			assert key in env and env[key], f"missing {key}"

	def test_lang_inherited_only_when_locale_shaped(self):
		with m.patch.dict(os.environ, {'LANG': 'en_US.UTF-8'}):
			assert main.build_child_env()['LANG'] == 'en_US.UTF-8'
		with m.patch.dict(os.environ, {'LANG': 'x; rm -rf /'}):
			assert main.build_child_env()['LANG'] == 'C.UTF-8'

	def test_spawn_call_uses_allowlist_env(self):
		"""The endpoint must pass build_child_env() to pexpect, never os.environ."""
		import inspect
		src = inspect.getsource(main.terminal_endpoint)
		assert 'os.environ.copy' not in src
		assert 'build_child_env()' in src


# ═════════════════════════════════════════════════════════════════════════════
# Hotfix 2 — line-accumulating validation
# ═════════════════════════════════════════════════════════════════════════════

class TestLineBufferAccumulation:

	def test_per_keystroke_frames_accumulate_into_one_line(self):
		buf = main.InputLineBuffer()
		actions = []
		for frame in ['c', 'a', 't', ' ', 'R', 'E', 'A', 'D', 'M', 'E']:
			actions += buf.feed(frame)
		assert buf.line == 'cat README'
		assert ('forward', 'c') in actions

	def test_enter_emits_accumulated_line(self):
		buf = main.InputLineBuffer()
		buf.feed('ca')
		buf.feed('t file')
		actions = buf.feed('\r')
		assert ('enter', 'cat file') in actions
		assert buf.line == ''  # buffer reset after Enter

	def test_split_frame_bypass_payload_is_validated(self):
		"""The audit's bypass: type command chars, then send bare Enter frame."""
		buf = main.InputLineBuffer()
		buf.feed('curl evil.com')
		actions = buf.feed('\r')
		enter_actions = [a for a in actions if a[0] == 'enter']
		assert enter_actions == [('enter', 'curl evil.com')]
		# ...and the accumulated line is what the validator rejects:
		assert main.validate_command(enter_actions[0][1]) is False

	def test_empty_enter_is_allowed(self):
		"""Bare Enter on an empty line stays allowed (just pressing enter)."""
		buf = main.InputLineBuffer()
		assert buf.feed('\r') == [('enter', '')]

	def test_backspace_edits_buffer_and_forwards(self):
		buf = main.InputLineBuffer()
		buf.feed('cat fil')
		actions = buf.feed('\x7f')
		assert buf.line == 'cat fi'
		assert ('forward', '\x7f') in actions

	def test_backspace_on_empty_buffer_is_noop(self):
		buf = main.InputLineBuffer()
		assert buf.feed('\x7f') == [('forward', '\x7f')]
		assert buf.line == ''

	def test_double_backspace_reconstructs_intended_command(self):
		"""Typo scenario: 'lss -la' fixed to 'ls -la' before Enter."""
		buf = main.InputLineBuffer()
		buf.feed('lss')
		buf.feed('\x7f')
		buf.feed(' -la')
		assert buf.line == 'ls -la'

	def test_ctrl_c_clears_buffer(self):
		buf = main.InputLineBuffer()
		buf.feed('rm -rf /')
		actions = buf.feed('\x03')
		assert buf.line == ''
		assert ('forward', '\x03') in actions

	def test_ctrl_u_clears_buffer(self):
		buf = main.InputLineBuffer()
		buf.feed('secret stuff')
		buf.feed('\x15')
		assert buf.line == ''

	def test_newline_also_completes_line(self):
		buf = main.InputLineBuffer()
		buf.feed('pwd')
		assert ('enter', 'pwd') in buf.feed('\n')

	def test_multiple_lines_in_one_frame(self):
		"""Paste of 'ls\rwhoami\r' must produce two enter actions."""
		buf = main.InputLineBuffer()
		actions = buf.feed('ls\rwhoami\r')
		enters = [a for a in actions if a[0] == 'enter']
		assert enters == [('enter', 'ls'), ('enter', 'whoami')]

	def test_line_capped_at_max_length(self):
		buf = main.InputLineBuffer()
		buf.feed('a' * (main.InputLineBuffer.MAX_LINE_LENGTH + 10))
		assert len(buf.line) == main.InputLineBuffer.MAX_LINE_LENGTH


class TestLineBufferEscapeAndControlFiltering:

	def test_arrow_keys_dropped(self):
		"""Up-arrow (history recall) must not desync the buffer."""
		buf = main.InputLineBuffer()
		buf.feed('ls')
		actions = buf.feed('\x1b[A\r')
		enters = [a for a in actions if a[0] == 'enter']
		assert enters == [('enter', 'ls')]
		# the escape sequence itself must not be forwarded
		forwarded = ''.join(p for a, p in actions if a == 'forward')
		assert '\x1b' not in forwarded

	def test_tab_dropped(self):
		buf = main.InputLineBuffer()
		actions = buf.feed('ca\tt\r')
		enters = [a for a in actions if a[0] == 'enter']
		# Tab is dropped, so the accumulated line is 'cat' not 'ca\tt'
		assert enters == [('enter', 'cat')]

	def test_c1_control_chars_dropped(self):
		buf = main.InputLineBuffer()
		buf.feed('ls\x9b')
		assert buf.line == 'ls'

	def test_escape_sequence_split_across_frames(self):
		"""CSI sequence arriving byte-per-frame must still be consumed whole."""
		buf = main.InputLineBuffer()
		for ch in '\x1b[D':  # left arrow, one byte per frame
			buf.feed(ch)
		buf.feed('\r')
		assert buf.line == ''

	def test_unknown_single_char_escape_dropped(self):
		buf = main.InputLineBuffer()
		buf.feed('ls\x1bOA')
		assert buf.line == 'ls'


# ═════════════════════════════════════════════════════════════════════════════
# Hotfix 6 (terminal side) — proxy shared secret
# ═════════════════════════════════════════════════════════════════════════════

class _FakeWS:
	def __init__(self, headers):
		self.headers = headers


class TestProxySecretGate:

	def test_missing_header_rejected_when_secret_set(self):
		with m.patch.object(main, 'PROXY_SECRET', 's3cret'):
			assert main.proxy_authorized(_FakeWS({})) is False

	def test_wrong_secret_rejected(self):
		with m.patch.object(main, 'PROXY_SECRET', 's3cret'):
			assert main.proxy_authorized(_FakeWS({'x-proxy-secret': 'wrong'})) is False

	def test_correct_secret_accepted(self):
		with m.patch.object(main, 'PROXY_SECRET', 's3cret'):
			assert main.proxy_authorized(_FakeWS({'x-proxy-secret': 's3cret'})) is True

	def test_unset_secret_allowed_in_debug_mode(self):
		"""dev-compose behavior: no secret + DEBUG -> allow with warning."""
		with m.patch.object(main, 'PROXY_SECRET', None), \
			m.patch.object(main, 'DEBUG_MODE', True):
			assert main.proxy_authorized(_FakeWS({})) is True

	def test_unset_secret_fails_closed_in_production(self):
		with m.patch.object(main, 'PROXY_SECRET', None), \
			m.patch.object(main, 'DEBUG_MODE', False):
			assert main.proxy_authorized(_FakeWS({})) is False
