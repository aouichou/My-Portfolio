# tests/integration/test_health.py
"""Integration tests for healthcheck endpoints (contract v2 §3.9).

/api/health/ is KILLED (contract §7 kill-list — it duplicated /healthz);
these tests pin the kill so the duplicate can't silently return."""

import pytest


@pytest.mark.django_db
class TestHealthEndpoints:

    def test_root_healthz_returns_200(self, api_client):
        response = api_client.get('/healthz')
        assert response.status_code == 200

    def test_root_healthz_returns_healthy_status(self, api_client):
        response = api_client.get('/healthz')
        data = response.json()
        assert data.get('status') == 'healthy'

    def test_api_health_duplicate_is_killed(self, api_client):
        """Contract §7: /api/health/ duplicated /healthz (endpoint #2) —
        it must 404, not serve a second health surface."""
        response = api_client.get('/api/health/')
        assert response.status_code == 404

    def test_healthz_serves_the_health_role(self, api_client):
        """The surviving health endpoint is root-level /healthz (Render's
        health check path, contract §1 endpoint #2)."""
        response = api_client.get('/healthz')
        assert response.status_code != 401
        assert response.status_code != 403
        assert response.json() == {'status': 'healthy'}
