# tests/conftest.py
"""Shared fixtures for the portfolio-terminal test suite.

The service no longer connects to Redis (session keys were written but never
read); DEBUG=True keeps the service in dev mode for tests (security
self-checks skipped, proxy-secret gate permissive like docker-compose.dev).

F4-03: the suite runs hermetically — PROJECTS_BASE_DIR / SESSION_SCRATCH_ROOT
are pinned under a temp dir BEFORE main is imported anywhere, so no test
(including the lifespan boot sweep inside TestClient contexts) can touch the
real /home/coder/projects or /tmp/terminal-sessions.
"""

import atexit
import os
import shutil
import tempfile

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault('DEBUG', 'True')

# Hermetic FS roots — set before any `import main` (module constants read
# the env at import time). A real dir is required: TestClient contexts run
# the lifespan boot sweep, which lists/walks these paths.
_HERMETIC_ROOT = tempfile.mkdtemp(prefix='terminal-tests-fs-')
os.environ.setdefault('TERMINAL_PROJECTS_DIR', os.path.join(_HERMETIC_ROOT, 'projects'))
os.environ.setdefault('TERMINAL_SESSION_SCRATCH_ROOT', os.path.join(_HERMETIC_ROOT, 'scratch'))
os.makedirs(os.environ['TERMINAL_PROJECTS_DIR'], exist_ok=True)
os.makedirs(os.environ['TERMINAL_SESSION_SCRATCH_ROOT'], exist_ok=True)


@atexit.register
def _cleanup_hermetic_root():
	"""Best-effort teardown of the temp dir (session-scoped, after all
	tests — atexit because pytest has no after-session hook)."""
	shutil.rmtree(_HERMETIC_ROOT, ignore_errors=True)


@pytest.fixture(scope='session')
def client():
    """
    A Starlette TestClient wrapping the FastAPI app.
    Replaces the background health-check coroutine so no real network calls
    are made during tests.
    """
    import asyncio
    from unittest.mock import patch

    async def _idle():
        try:
            await asyncio.sleep(86400)
        except asyncio.CancelledError:
            pass

    async def _idle_sync(sleep=asyncio.sleep):
        # F4-01: the whitelist sync loop would hit the API feed — parked.
        try:
            await asyncio.sleep(86400)
        except asyncio.CancelledError:
            pass

    with patch('main.periodic_health_checks', new=_idle), \
         patch('main.whitelist_sync_loop', new=_idle_sync):
        import main
        # Seed a deterministic snapshot for any test that only needs
        # "some demo is enabled" (endpoint-level tests seed their own).
        main.demo_whitelist.slugs = {'minishell', 'push_swap', 'philosophers'}
        main.demo_whitelist.last_sync = 0.0
        from main import app
        with TestClient(app, raise_server_exceptions=True) as c:
            yield c
