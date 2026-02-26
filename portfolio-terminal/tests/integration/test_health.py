# tests/integration/test_health.py
"""Integration tests for terminal service HTTP endpoints."""

import os
import sys
import unittest.mock as m

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
os.environ.setdefault('REDIS_URL', 'redis://localhost:6379')
for mod in ['redis', 'pexpect', 'boto3', 'psutil', 'aiohttp']:
    if mod not in sys.modules:
        sys.modules[mod] = m.MagicMock()

import pytest


@pytest.fixture(scope='module')
def app_client():
    """Lightweight test client — replaces the background health-check loop."""
    import asyncio
    from unittest.mock import patch

    async def _idle():
        """Replace periodic_health_checks: sleep until cancelled."""
        try:
            await asyncio.sleep(86400)
        except asyncio.CancelledError:
            pass

    with patch('main.periodic_health_checks', new=_idle), \
         patch('main.redis_client') as mock_redis:
        mock_redis.setex.return_value = True
        mock_redis.get.return_value = None

        from fastapi.testclient import TestClient
        from main import app
        with TestClient(app) as client:
            yield client


class TestHealthEndpoint:

    def test_healthz_returns_200(self, app_client):
        response = app_client.get('/healthz')
        assert response.status_code == 200

    def test_healthz_returns_healthy_status(self, app_client):
        response = app_client.get('/healthz')
        assert response.json() == {'status': 'healthy'}


class TestMetricsEndpoint:

    def test_metrics_returns_200(self, app_client):
        with m.patch('main.psutil') as mock_psutil:
            mock_psutil.virtual_memory.return_value.percent = 42.0
            response = app_client.get('/metrics')
        assert response.status_code == 200

    def test_metrics_contains_expected_keys(self, app_client):
        with m.patch('main.psutil') as mock_psutil:
            mock_psutil.virtual_memory.return_value.percent = 55.0
            data = app_client.get('/metrics').json()
        assert 'memory_used_percent' in data
        assert 'active_terminals' in data
        assert 'uptime' in data

    def test_metrics_active_terminals_is_int(self, app_client):
        with m.patch('main.psutil') as mock_psutil:
            mock_psutil.virtual_memory.return_value.percent = 0.0
            data = app_client.get('/metrics').json()
        assert isinstance(data['active_terminals'], int)
