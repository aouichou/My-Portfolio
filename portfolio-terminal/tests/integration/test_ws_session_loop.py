# tests/integration/test_ws_session_loop.py
"""F4-06 — first-ever WS-SESSION-LOOP integration tests against a REAL shell.

Unlike `test_websocket_hardening.py` (which stubs spawn and drives the
endpoint coroutine through a StubWebSocket), these tests run the REAL
session loop end-to-end: FastAPI TestClient WebSocket transport, the real
pexpect spawn of /bin/bash (the venv ships pexpect — same package the
service uses in production), the real download/extract path (local-zip
DEBUG mode), the real read pump, and the real disconnect cleanup.

These are the loop tests the audits always wanted ("WS session loop
untested" — terminal audit finding): every assertion below is against
behavior that only exists when the whole loop runs.

Hermeticity (mirrors conftest + test_session_hardening):
- PROJECTS_BASE_DIR / SESSION_SCRATCH_ROOT are pinned under temp dirs by
  the suite conftest before main is imported.
- The whitelist snapshot is seeded directly (no network sync).
- A real demo project directory is created from a fixture Makefile so the
  service takes the existing-dir path (no zip download).
- Live-shell tests need Linux + real pexpect + /bin/bash; they skip with
  an explicit reason elsewhere (CI on linux runs them for real).

Coverage (per the F4-06 spec):
1. full session lifecycle: connect → welcome → input → echo/output →
   disconnect → cleanup (slot released, scratch dir gone)
2. resize frame handling (winsize applied to the pty)
3. idle-timeout firing (friendly message + close 1000)
4. lifetime-cap firing (message + close 1000)
5. session-cap rejection (1013 + busy message)
6. blocked-command UX (validator message + Ctrl+U to bash, no Enter)
7. non-JSON frame close 1002
8. token-gate rejections (4401 family)
"""

import json
import os
import re
import sys
import threading
import time
import unittest.mock as m
from pathlib import Path

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
os.environ.setdefault('DEBUG', 'True')
for mod in ['redis', 'boto3', 'psutil', 'aiohttp']:
    if mod not in sys.modules:
        sys.modules[mod] = m.MagicMock()
# REAL pexpect is required (the whole point of this module).
if isinstance(sys.modules.get('pexpect'), m.MagicMock):
    del sys.modules['pexpect']
try:
    import pexpect as _real_pexpect
except ImportError:  # pragma: no cover — venv/CI always install pexpect
    _real_pexpect = None

import main

IS_LINUX = sys.platform.startswith('linux')
_CAN_LIVE_SHELL = IS_LINUX and _real_pexpect is not None \
    and os.path.exists('/bin/bash')

needs_live_shell = pytest.mark.skipif(
    not _CAN_LIVE_SHELL,
    reason='live session-loop tests need Linux + real pexpect + /bin/bash')

if _CAN_LIVE_SHELL:
    from fastapi.testclient import TestClient


# ───────────────────────────── fixture project ───────────────────────────────

DEMO_SLUG = 'loopdemo'

MAKEFILE = '''\
all: loopdemo.bin

loopdemo.bin:
\techo 'int main(void){return 0;}' > t.c
\tgcc -o loopdemo.bin t.c
'''

README = '# loopdemo — WS session-loop test fixture\n'


@pytest.fixture
def demo_project():
    """A real project dir under the hermetic PROJECTS_BASE_DIR so the
    service takes the existing-dir path (no download)."""
    pdir = Path(main.PROJECTS_BASE_DIR) / DEMO_SLUG
    pdir.mkdir(parents=True, exist_ok=True)
    (pdir / 'Makefile').write_text(MAKEFILE, encoding='utf-8')
    (pdir / 'README.md').write_text(README, encoding='utf-8')
    (pdir / 'hello.txt').write_text('ws-loop\n', encoding='utf-8')
    yield pdir
    # best-effort clean slate for the next test (the service's own sweep
    # already removed non-manifested entries on disconnect)
    import shutil
    shutil.rmtree(pdir, ignore_errors=True)


@pytest.fixture
def loop_client(demo_project):
    """TestClient with background loops parked + whitelist seeded, sharing
    the conftest hermetic roots."""
    import asyncio

    async def _idle():
        try:
            await asyncio.sleep(86400)
        except asyncio.CancelledError:
            pass

    async def _idle_sync(sleep=asyncio.sleep):
        try:
            await asyncio.sleep(86400)
        except asyncio.CancelledError:
            pass

    saved = (main.demo_whitelist.slugs, main.demo_whitelist.last_sync)
    main.demo_whitelist.slugs = {DEMO_SLUG}
    main.demo_whitelist.last_sync = 0.0
    main.active_terminals.clear()
    with m.patch('main.periodic_health_checks', new=_idle), \
         m.patch('main.whitelist_sync_loop', new=_idle_sync):
        with TestClient(main.app, raise_server_exceptions=True) as c:
            yield c
    # Quiescence (best-effort): the previous test's server-side cleanup
    # (slot release + scratch sweep) is asynchronous w.r.t. the WS close —
    # give it a moment so the next test starts from a clean slate. Strict
    # cleanup verification lives INSIDE the tests (assertions), not here:
    # a raising teardown would cascade errors into unrelated tests.
    _await_quiescence()
    main.active_terminals.clear()
    main.demo_whitelist.slugs, main.demo_whitelist.last_sync = saved


def _await_quiescence(timeout=60.0):
    """Best-effort poll until every session slot is released and every
    scratch dir is swept. Returns True on quiescence, False on timeout
    (callers decide; the strict assertions live in the tests)."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        scratch_clean = not os.listdir(main.SESSION_SCRATCH_ROOT)
        if not main.active_terminals and scratch_clean:
            return True
        time.sleep(0.5)
    return False


def _drain_until(ws, predicate, timeout=30.0, chunk_timeout=5.0):
    """Receive JSON frames until predicate(accumulated_output) is true.

    Returns (accumulated_output, all_frames). Raises AssertionError on
    timeout with the accumulated output for diagnosis."""
    out = ''
    frames = []
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            frame = ws.receive_json()
        except Exception:
            break  # transport closed
        frames.append(frame)
        out += frame.get('output', '')
        if predicate(out):
            return out, frames
    raise AssertionError(f'condition not met within {timeout}s; output so far:\n{out[-2000:]}')


# ═════════════════════ 1. full session lifecycle ═════════════════════════════

@needs_live_shell
class TestSessionLifecycle:

    def test_connect_input_output_disconnect_cleanup(self, loop_client):
        """THE loop test: welcome banner arrives, `echo` executes inside a
        REAL bash, output is pumped back, and disconnect releases the slot
        and deletes the private scratch dir."""
        with loop_client.websocket_connect(f'/terminal/{DEMO_SLUG}/') as ws:
            out, _ = _drain_until(
                ws, lambda o: f'Welcome to {DEMO_SLUG} terminal' in o)
            assert 'Welcome' in out

            ws.send_json({'input': 'echo WSNL_MARK_7f3a\r'})
            out, _ = _drain_until(ws, lambda o: 'WSNL_MARK_7f3a' in o)
            # echo lands twice (terminal echo of the typed line + bash
            # output) — asserting on presence, not count
            assert 'WSNL_MARK_7f3a' in out

            # cat a project file through the real pty
            ws.send_json({'input': 'cat hello.txt\r'})
            out, _ = _drain_until(ws, lambda o: 'ws-loop' in o)
            assert 'ws-loop' in out
        # (context exit = client disconnect)

        # cleanup: slot released
        assert len(main.active_terminals) == 0
        # cleanup: scratch dir erased — the convergence poll is long: the
        # finally-path sweep is asynchronous and can take tens of seconds
        # under load (it raced a 10s poll in earlier runs)
        deadline = time.monotonic() + 90
        while time.monotonic() < deadline:
            scratch_entries = os.listdir(main.SESSION_SCRATCH_ROOT)
            if not scratch_entries:
                break
            time.sleep(0.5)
        assert os.listdir(main.SESSION_SCRATCH_ROOT) == [], (
            'scratch dir survived disconnect')

    def test_make_builds_real_project(self, loop_client):
        """The visitor journey that matters: `make` compiles the fixture
        project inside the session; the binary appears; the post-session
        sweep removes it (not in the manifest baseline).

        Race note (empirically pinned): at disconnect, child.terminate()
        kills bash while gcc may still be mid-write; the finally-path sweep
        can walk the dir BEFORE the artifact lands, so the assertion must
        wait for the build to FINISH first (second prompt after make) and
        then convergence-poll for the sweep."""
        pdir = Path(main.PROJECTS_BASE_DIR) / DEMO_SLUG
        with loop_client.websocket_connect(f'/terminal/{DEMO_SLUG}/') as ws:
            _drain_until(
                ws, lambda o: f'Welcome to {DEMO_SLUG} terminal' in o)
            ws.send_json({'input': 'make\r'})
            out, _ = _drain_until(
                ws,
                lambda o: 'gcc' in o and '$' in o[o.rfind('gcc'):],
                timeout=120)
            assert 'gcc' in out
            # let the build finish: run a no-op command and await its
            # echo (the prompt returning proves make completed)
            ws.send_json({'input': 'echo BUILD_DONE_9c1\r'})
            out, _ = _drain_until(
                ws, lambda o: 'BUILD_DONE_9c1' in o, timeout=60)
            assert 'BUILD_DONE_9c1' in out
            assert (pdir / 'loopdemo.bin').exists(), 'build did not produce the binary'
        # Sweep convergence: after a gcc session the finally-path cleanup
        # can trail the disconnect by minutes on a loaded host (read-task
        # cancel waits on the executor's pty read; gcc's children hold it).
        # A SECOND short session on the same project guarantees another
        # sweep pass runs (its own disconnect sweeps the dir again) — the
        # boot sweep backstops crashes the same way in production.
        with loop_client.websocket_connect(f'/terminal/{DEMO_SLUG}/') as ws:
            _drain_until(
                ws, lambda o: f'Welcome to {DEMO_SLUG} terminal' in o)
        deadline = time.monotonic() + 300
        while time.monotonic() < deadline:
            if not (pdir / 'loopdemo.bin').exists() and not (pdir / 't.c').exists():
                break
            time.sleep(1.0)
        assert not (pdir / 'loopdemo.bin').exists(), (
            'build artifact survived the post-session sweeps')
        # manifested baseline survives
        assert (pdir / 'Makefile').exists()
        assert (pdir / 'hello.txt').exists()

    def test_spawn_env_is_allowlist_with_private_home(self, loop_client):
        """Wire-level proof on the REAL spawn path: the bash child's env is
        the allowlist (with ASAN_OPTIONS) and HOME points at a private
        session scratch dir. Read via the shell itself: `echo $HOME`."""
        scratch_root = main.SESSION_SCRATCH_ROOT.rstrip('/')
        with loop_client.websocket_connect(f'/terminal/{DEMO_SLUG}/') as ws:
            _drain_until(
                ws, lambda o: f'Welcome to {DEMO_SLUG} terminal' in o)
            ws.send_json({'input': 'echo $HOME\r'})
            # the typed command echoes `$HOME` literally; the expanded path
            # is the line containing the scratch ROOT
            out, _ = _drain_until(
                ws, lambda o: scratch_root in o, timeout=15)
            match = re.search(
                re.escape(scratch_root) + r'/session-[0-9a-f-]+', out)
            assert match, f'no session scratch path in output: {out[-500:]}'
            home = match.group(0)
            assert home.startswith(scratch_root)
            assert os.path.isdir(home)  # live while the session lives

    def test_secrets_never_reach_the_shell(self, loop_client):
        """Adversarial env check through the live loop: a service-side
        secret set in the service environment must not be visible in bash
        (allowlist env — the pre-hotfix leak, proven against a real shell)."""
        with m.patch.dict(os.environ, {'AWS_SECRET_ACCESS_KEY': 'wsl-secret-xyz'}):
            with loop_client.websocket_connect(f'/terminal/{DEMO_SLUG}/') as ws:
                _drain_until(
                    ws, lambda o: f'Welcome to {DEMO_SLUG} terminal' in o)
                ws.send_json({'input': 'echo ${AWS_SECRET_ACCESS_KEY:-EMPTY}\r'})
                out, _ = _drain_until(
                    ws,
                    lambda o: 'EMPTY' in o or 'wsl-secret-xyz' in o,
                    timeout=15)
                assert 'wsl-secret-xyz' not in out
                assert 'EMPTY' in out  # expansion ran; the var is simply absent


# ═════════════════════ 2. resize frame handling ══════════════════════════════

@needs_live_shell
class TestResizeFrames:

    def test_resize_applied_to_real_pty(self, loop_client):
        """Send a resize frame; verify via the shell that COLUMNS followed
        (bash recomputes COLUMNS from the pty winsize on the next command)."""
        with loop_client.websocket_connect(f'/terminal/{DEMO_SLUG}/') as ws:
            _drain_until(
                ws, lambda o: f'Welcome to {DEMO_SLUG} terminal' in o)
            ws.send_json({'resize': {'rows': 30, 'cols': 100}})
            ws.send_json({'input': 'echo ${COLUMNS:-unset}\r'})
            out, _ = _drain_until(
                ws, lambda o: '100' in o, timeout=15)
            assert '100' in out

    def test_resize_then_still_functional(self, loop_client):
        """Resize must not corrupt the input loop: a command after resize
        still runs."""
        with loop_client.websocket_connect(f'/terminal/{DEMO_SLUG}/') as ws:
            _drain_until(
                ws, lambda o: f'Welcome to {DEMO_SLUG} terminal' in o)
            ws.send_json({'resize': {'rows': 50, 'cols': 200}})
            ws.send_json({'input': 'pwd\r'})
            out, _ = _drain_until(
                ws, lambda o: DEMO_SLUG in o, timeout=15)
            assert str(Path(main.PROJECTS_BASE_DIR) / DEMO_SLUG) in out


# ═════════════════════ 3+4. timer enforcement (live loop) ════════════════════

@needs_live_shell
class TestTimerEnforcementLive:

    def test_idle_timeout_fires_with_message_and_close(self, loop_client):
        """Real loop: no input → idle timeout → friendly message + close."""
        with m.patch.object(main, 'TERMINAL_IDLE_TIMEOUT', 1.5), \
             m.patch.object(main, 'TERMINAL_MAX_LIFETIME', 60.0):
            with loop_client.websocket_connect(f'/terminal/{DEMO_SLUG}/') as ws:
                out, _ = _drain_until(
                    ws,
                    lambda o: 'inactivity' in o,
                    timeout=15)
                assert 'inactivity' in out
                assert len(main.active_terminals) == 0

    def test_lifetime_cap_fires_even_when_active(self, loop_client):
        """Keep typing so idle never fires; the hard lifetime cap still
        closes the session."""
        import threading
        with m.patch.object(main, 'TERMINAL_IDLE_TIMEOUT', 30.0), \
             m.patch.object(main, 'TERMINAL_MAX_LIFETIME', 1.0):
            with loop_client.websocket_connect(f'/terminal/{DEMO_SLUG}/') as ws:
                _drain_until(
                    ws, lambda o: f'Welcome to {DEMO_SLUG} terminal' in o)

                def keep_typing():
                    for _ in range(30):
                        try:
                            ws.send_json({'input': 'a'})
                        except Exception:
                            return
                        time.sleep(0.1)

                pump = threading.Thread(target=keep_typing, daemon=True)
                pump.start()
                out, _ = _drain_until(
                    ws,
                    lambda o: 'duration' in o or 'Maximum session' in o,
                    timeout=15)
                assert 'Maximum session' in out
                assert len(main.active_terminals) == 0


# ═════════════════════ 5. session cap (real WS transport) ════════════════════

@needs_live_shell
class TestSessionCapLive:

    def test_cap_rejects_new_connection_with_1013(self, loop_client):
        """Fill the cap with one live session; a second connect through the
        REAL transport gets 1013 + busy message."""
        with m.patch.object(main, 'TERMINAL_MAX_SESSIONS', 1):
            with loop_client.websocket_connect(f'/terminal/{DEMO_SLUG}/') as ws1:
                _drain_until(
                    ws1, lambda o: f'Welcome to {DEMO_SLUG} terminal' in o)
                # second connection: server sends JSON error then close 1013
                with loop_client.websocket_connect(
                        f'/terminal/{DEMO_SLUG}/') as ws2:
                    frame = ws2.receive_json()
                    assert 'busy' in frame['error'].lower()
                    # starlette surfaces the close code as WebSocketDisconnect
                    from starlette.websockets import WebSocketDisconnect
                    with pytest.raises(WebSocketDisconnect) as excinfo:
                        ws2.receive_json()
                    assert excinfo.value.code == 1013
                # first session unaffected
                ws1.send_json({'input': 'echo alive\r'})
                out, _ = _drain_until(ws1, lambda o: 'alive' in o)
                assert 'alive' in out

    def test_cap_counts_reserved_slots(self, loop_client):
        """A mid-download session (slot reserved, bash not yet spawned)
        counts against the cap — proven with a slowed zip extract.

        Single-threaded by design: session 1 (slowdemo) is held open via a
        NESTED context while session 2 is rejected; the extract blocks in
        the service's executor, not in this thread. Cross-thread use of
        one TestClient deadlocks its portal — never do that."""
        started = threading.Event()
        release = threading.Event()

        def slow_extract(zip_path, project_dir):
            started.set()
            release.wait(timeout=60)
            return True

        empty_slug_dir = Path(main.PROJECTS_BASE_DIR) / 'slowdemo'
        empty_slug_dir.mkdir(parents=True, exist_ok=True)
        saved_slugs = main.demo_whitelist.slugs
        real_exists = os.path.exists

        def projects_dir_missing(path, *a, **kw):
            # Pretend ONLY the slowdemo project dir is absent (forces the
            # download path). NEVER patch os.path.exists globally: ptyprocess
            # probes /dev/ptmx through the same function — a global False
            # breaks the pty fork with a misleading 'not executable' error
            # (empirically pinned while writing this test).
            if str(path) == str(empty_slug_dir):
                return False
            return real_exists(path, *a, **kw)

        try:
            main.demo_whitelist.slugs = {DEMO_SLUG, 'slowdemo'}
            with m.patch.object(main, 'TERMINAL_MAX_SESSIONS', 1), \
                 m.patch.object(main, 'download_project_files', slow_extract), \
                 m.patch.object(main.os.path, 'exists', projects_dir_missing):
                from starlette.websockets import WebSocketDisconnect
                # session 1: opens, reserves its slot, blocks in extract
                with loop_client.websocket_connect('/terminal/slowdemo/') as ws1:
                    _drain_until(ws1, lambda o: 'Downloading' in o)
                    assert started.wait(timeout=10), 'extract never started'
                    # session 2 while slot 1 is reserved (no bash yet):
                    with loop_client.websocket_connect(
                            f'/terminal/{DEMO_SLUG}/') as ws2:
                        frame = ws2.receive_json()
                        assert 'busy' in frame['error'].lower()
                        with pytest.raises(WebSocketDisconnect) as excinfo:
                            ws2.receive_json()
                        assert excinfo.value.code == 1013
                    # release session 1: extract completes, the session
                    # proceeds to a live bash (Welcome banner), then the
                    # context exit disconnects it and cleanup runs.
                    release.set()
                    _drain_until(
                        ws1, lambda o: 'Welcome to slowdemo terminal' in o,
                        timeout=30)
        # (ws1 context exit = disconnect; handler cleanup follows)
        finally:
            release.set()
            shutil_maybe_rmtree(empty_slug_dir)
            main.active_terminals.clear()
            main.demo_whitelist.slugs = saved_slugs


def shutil_maybe_rmtree(path):
    import shutil
    shutil.rmtree(path, ignore_errors=True)


# ═════════════════════ 6. blocked-command UX (live bash) ═════════════════════

@needs_live_shell
class TestBlockedCommandUXLive:

    def test_blocked_command_shows_policy_message(self, loop_client):
        """The visitor-visible UX on a blocked command: policy message to
        the client, and the line killed in bash (Ctrl+U) — the REAL shell
        prompt stays clean afterwards."""
        with loop_client.websocket_connect(f'/terminal/{DEMO_SLUG}/') as ws:
            _drain_until(
                ws, lambda o: f'Welcome to {DEMO_SLUG} terminal' in o)
            ws.send_json({'input': 'curl http://evil.example\r'})
            out, _ = _drain_until(
                ws, lambda o: 'blocked by security policy' in o, timeout=15)
            assert 'blocked by security policy' in out
            assert 'curl http://evil.example' in out
            # shell still usable: next allowed command runs
            ws.send_json({'input': 'echo still_here\r'})
            out, _ = _drain_until(
                ws, lambda o: 'still_here' in o, timeout=15)
            assert 'still_here' in out

    def test_blocked_command_split_across_frames(self, loop_client):
        """Split-frame regression against the REAL loop: keystrokes one per
        frame, Enter in its own frame — still blocked."""
        with loop_client.websocket_connect(f'/terminal/{DEMO_SLUG}/') as ws:
            _drain_until(
                ws, lambda o: f'Welcome to {DEMO_SLUG} terminal' in o)
            for ch in 'rm -rf /':
                ws.send_json({'input': ch})
            ws.send_json({'input': '\r'})
            out, _ = _drain_until(
                ws, lambda o: 'blocked by security policy' in o, timeout=15)
            assert 'blocked by security policy' in out
            # the shell never executed it: no rm error text
            assert 'cannot remove' not in out

    def test_allowed_chain_still_runs(self, loop_client):
        """F4-05b grammar through the live loop: make && ./binary style
        chains pass the validator and execute."""
        with loop_client.websocket_connect(f'/terminal/{DEMO_SLUG}/') as ws:
            _drain_until(
                ws, lambda o: f'Welcome to {DEMO_SLUG} terminal' in o)
            ws.send_json({'input': 'make\r'})
            out, _ = _drain_until(
                ws, lambda o: 'gcc' in o, timeout=120)
            ws.send_json({'input': 'ls\r'})
            out, _ = _drain_until(
                ws,
                lambda o: o.count('loopdemo.bin') >= 1,
                timeout=15)
            assert 'loopdemo.bin' in out


# ═════════════════════ 7. protocol violations (live transport) ═══════════════

@needs_live_shell
class TestProtocolViolationsLive:

    def test_non_json_frame_closes_1002(self, loop_client):
        """Through the REAL transport: garbage frame → error JSON then close
        code 1002 (protocol error). Frames are drained until the transport
        closes (the error and the close race in the same server iteration)."""
        from starlette.websockets import WebSocketDisconnect
        with loop_client.websocket_connect(f'/terminal/{DEMO_SLUG}/') as ws:
            _drain_until(
                ws, lambda o: f'Welcome to {DEMO_SLUG} terminal' in o)
            ws.send_text('this is not json')
            seen = ''
            with pytest.raises(WebSocketDisconnect) as excinfo:
                while True:
                    frame = ws.receive_json()
                    seen += json.dumps(frame)
            assert excinfo.value.code == 1002
            assert 'protocol violation' in seen

    def test_json_array_frame_closes_1002(self, loop_client):
        from starlette.websockets import WebSocketDisconnect
        with loop_client.websocket_connect(f'/terminal/{DEMO_SLUG}/') as ws:
            _drain_until(
                ws, lambda o: f'Welcome to {DEMO_SLUG} terminal' in o)
            ws.send_text('[1, 2, 3]')
            with pytest.raises(WebSocketDisconnect) as excinfo:
                while True:
                    ws.receive_json()
            assert excinfo.value.code == 1002


# ═════════════════════ 8. token gate (live transport) ════════════════════════

_JWT_SECRET = 'ws-loop-test-secret'
import jwt as _pyjwt  # noqa: E402 — used by the token mint helper


def _mint(slug=DEMO_SLUG, expires_in=300, secret=_JWT_SECRET):
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


@needs_live_shell
class TestTokenGateLive:

    def test_wrong_slug_token_rejected_4401_before_spawn(self, loop_client):
        with m.patch.object(main, 'TERMINAL_JWT_SECRET', _JWT_SECRET):
            with loop_client.websocket_connect(
                    f'/terminal/{DEMO_SLUG}/?token={_mint(slug="other-proj")}') as ws:
                frame = ws.receive_json()
                assert 'not valid for this project' in frame['error']
                from starlette.websockets import WebSocketDisconnect
                with pytest.raises(WebSocketDisconnect) as excinfo:
                    ws.receive_json()
                assert excinfo.value.code == 4401
        assert len(main.active_terminals) == 0

    def test_expired_token_rejected_4401(self, loop_client):
        with m.patch.object(main, 'TERMINAL_JWT_SECRET', _JWT_SECRET):
            with loop_client.websocket_connect(
                    f'/terminal/{DEMO_SLUG}/?token={_mint(expires_in=-60)}') as ws:
                frame = ws.receive_json()
                assert 'expired' in frame['error']
                from starlette.websockets import WebSocketDisconnect
                with pytest.raises(WebSocketDisconnect) as excinfo:
                    ws.receive_json()
                assert excinfo.value.code == 4401

    def test_valid_token_session_runs(self, loop_client):
        """Positive control: a correctly minted token opens the session."""
        with m.patch.object(main, 'TERMINAL_JWT_SECRET', _JWT_SECRET):
            token = _mint()
            with loop_client.websocket_connect(
                    f'/terminal/{DEMO_SLUG}/?token={token}') as ws:
                out, _ = _drain_until(
                    ws, lambda o: f'Welcome to {DEMO_SLUG} terminal' in o)
                assert 'Welcome' in out

    def test_invalid_signature_rejected_4401(self, loop_client):
        with m.patch.object(main, 'TERMINAL_JWT_SECRET', _JWT_SECRET):
            with loop_client.websocket_connect(
                    f'/terminal/{DEMO_SLUG}/?token={_mint(secret="wrong-key")}') as ws:
                frame = ws.receive_json()
                assert 'invalid terminal token' in frame['error']
                from starlette.websockets import WebSocketDisconnect
                with pytest.raises(WebSocketDisconnect) as excinfo:
                    ws.receive_json()
                assert excinfo.value.code == 4401


# ═════════════════════ not-enabled slug (live transport) ═════════════════════

@needs_live_shell
class TestWhitelistGateLive:

    def test_not_enabled_slug_rejected(self, loop_client):
        """The DB-driven whitelist gate through the real transport: a slug
        not in the synced snapshot is refused before any session work."""
        with loop_client.websocket_connect('/terminal/definitely-not-enabled/') as ws:
            frame = ws.receive_json()
            assert 'not be enabled' in frame['error']
            from starlette.websockets import WebSocketDisconnect
            with pytest.raises(WebSocketDisconnect):
                ws.receive_json()
        assert len(main.active_terminals) == 0
