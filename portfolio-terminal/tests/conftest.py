# tests/conftest.py
"""Shared fixtures for the portfolio-terminal test suite."""

import os

import pytest
from fastapi.testclient import TestClient

# Ensure Redis/external connections are mocked before importing the app.
# The app creates a redis.Redis client at module import time, so we patch
# REDIS_URL to a dummy value; actual Redis calls are mocked in tests.
os.environ.setdefault('REDIS_URL', 'redis://localhost:6379')
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

    with patch('main.periodic_health_checks', new=_idle), \
         patch('main.redis_client') as _mock_redis:
        _mock_redis.setex.return_value = True
        _mock_redis.get.return_value = None
        _mock_redis.delete.return_value = True

        from main import app
        with TestClient(app, raise_server_exceptions=True) as c:
            yield c
