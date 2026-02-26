# tests/integration/test_health.py
"""Integration tests for healthcheck endpoints."""

import pytest
from django.urls import reverse


@pytest.mark.django_db
class TestHealthEndpoints:

    def test_root_healthz_returns_200(self, api_client):
        response = api_client.get('/healthz')
        assert response.status_code == 200

    def test_root_healthz_returns_healthy_status(self, api_client):
        response = api_client.get('/healthz')
        data = response.json()
        assert data.get('status') == 'healthy'

    def test_api_health_returns_200(self, api_client):
        url = reverse('health-check')
        response = api_client.get(url)
        assert response.status_code == 200

    def test_api_health_returns_healthy_body(self, api_client):
        url = reverse('health-check')
        response = api_client.get(url)
        assert response.json() == {'status': 'healthy'}

    def test_api_health_does_not_require_auth(self, api_client):
        """Health endpoint is public — no credentials needed."""
        url = reverse('health-check')
        response = api_client.get(url)
        assert response.status_code != 401
        assert response.status_code != 403
