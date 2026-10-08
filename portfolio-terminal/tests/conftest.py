# tests/conftest.py
"""Shared fixtures for the portfolio-terminal test suite.

The service no longer connects to Redis (session keys were written but never
read); DEBUG=True keeps the service in dev mode for tests (security
self-checks skipped, proxy-secret gate permissive like docker-compose.dev).
"""

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault('DEBUG', 'True')


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
