# tests/integration/test_security_hotfixes.py
"""Integration tests for the pre-rework security hotfix batch (API side).

Covers:
- POST /api/import-data/ is gone (404) — was AllowAny DB+R2 mutation
- GET /api/ returns a minimal static body — no header reflection
- settings.RATELIMIT_VIEW resolves and returns a clean 429
- TerminalConsumer dials the terminal service with the X-Proxy-Secret header
  and fails closed (no dial) in production when the secret is missing

Async consumer scenarios use asyncio.run() directly: pytest-asyncio is not
part of this suite's dependencies.
"""

import asyncio
import json
from unittest import mock

import projects.consumers as consumers
import pytest
from django.test import override_settings


def run(coro):
    """Run an async coroutine to completion."""
    return asyncio.run(coro)


@pytest.mark.django_db
class TestImportDataRemoved:

    def test_import_data_returns_404(self, api_client):
        response = api_client.post('/api/import-data/')
        assert response.status_code == 404

    def test_import_data_get_also_404(self, api_client):
        response = api_client.get('/api/import-data/')
        assert response.status_code == 404


@pytest.mark.django_db
class TestApiRootStatic:

    def test_root_returns_200(self, api_client):
        response = api_client.get('/api/')
        assert response.status_code == 200

    def test_root_returns_static_body(self, api_client):
        response = api_client.get('/api/')
        assert response.json() == {'status': 'ok', 'service': 'portfolio-api'}

    def test_root_does_not_echo_request_headers(self, api_client):
        response = api_client.get(
            '/api/',
            HTTP_X_SECRET_PROBE='leak-me-if-you-echo',
        )
        body = json.dumps(response.json())
        assert 'leak-me-if-you-echo' not in body
        assert 'headers' not in response.json()

    def test_root_does_not_echo_query_params(self, api_client):
        response = api_client.get('/api/?debug=1&token=xyz')
        body = json.dumps(response.json())
        assert 'xyz' not in body


class TestRateLimitView:

    def test_ratelimit_view_setting_resolves(self):
        """The dotted path in settings must import to a callable."""
        from django.conf import settings
        from django.utils.module_loading import import_string

        view = import_string(settings.RATELIMIT_VIEW)
        assert callable(view)

    def test_ratelimit_view_returns_429_json(self, rf):
        from portfolio_api.views import rate_limit_response

        request = rf.get('/api/contact/', REMOTE_ADDR='1.2.3.4')
        response = rate_limit_response(request)

        assert response.status_code == 429
        data = json.loads(response.content)
        # Contract v2 §4.1: 429 body is {"detail": ...} — the legacy "error"
        # key was renamed in F2-03 so v2 has ONE error type.
        assert 'too many' in data['detail'].lower()
        assert 'error' not in data

    def test_ratelimited_contact_returns_429_not_500(self, api_client):
        """End-to-end: a tripped contact-form limit must yield a clean 429 —
        previously the raised Ratelimited surfaced as a 500 (dangling
        RATELIMIT_VIEW) or a 403 (DRF intercepting PermissionDenied)."""
        with override_settings(RATELIMIT_ENABLE=True), \
             mock.patch('django_ratelimit.core.get_usage',
                        return_value={'should_limit': True}):
            response = api_client.post(
                '/api/contact/',
                data={'name': 'A', 'email': 'a@example.com', 'message': 'm'},
                format='json',
            )
        assert response.status_code == 429
        # Contract v2 §4.1: the 429 detail key (legacy "error" is killed).
        assert 'too many' in str(response.json().get('detail', '')).lower()


class TestTerminalProxySecret:
    """Hotfix 6 (Django side): shared secret on the Django->terminal hop."""

    def _make_consumer(self):
        import datetime

        import jwt as pyjwt
        from django.conf import settings

        token = pyjwt.encode(
            {
                'user_id': None,
                'username': 'guest',
                'purpose': 'terminal_access',
                # F4-02: tokens are slug-bound; the factory route is minishell
                'slug': 'minishell',
                'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=5),
            },
            settings.SECRET_KEY,
            algorithm='HS256',
        )
        consumer = consumers.TerminalConsumer()
        consumer.scope = {
            'url_route': {'kwargs': {'project_slug': 'minishell'}},
            'query_string': f'token={token}'.encode(),
        }
        consumer.channel_name = 'test-channel'
        return consumer

    def test_sends_secret_header_on_upstream_dial(self):
        async def scenario():
            consumer = self._make_consumer()

            async def fake_accept():
                pass

            async def fake_send(*args, **kwargs):
                pass

            consumer.accept = fake_accept
            consumer.send = fake_send

            captured = {}

            class FakeUpstream:
                async def recv(self):
                    await asyncio.sleep(3600)  # keep forwarding task idle

            async def fake_connect(url, **kwargs):
                captured.update(kwargs)
                return FakeUpstream()

            with override_settings(
                DEBUG=False,
                TERMINAL_SERVICE_URL='ws://terminal:8000',
                TERMINAL_PROXY_SECRET='topsecret',
            ), mock.patch.object(consumers.websockets, 'connect', fake_connect):
                await consumer.connect()

            return captured

        captured = run(scenario())
        assert captured.get('additional_headers') == {'X-Proxy-Secret': 'topsecret'}

    def test_fails_closed_without_secret_in_production(self):
        async def scenario():
            consumer = self._make_consumer()
            closed = []

            async def fake_accept():
                pass

            async def fake_send(*args, **kwargs):
                pass

            async def fake_close(code=None):
                closed.append(code)

            consumer.accept = fake_accept
            consumer.send = fake_send
            consumer.close = fake_close

            async def fake_connect(url, **kwargs):
                raise AssertionError('must not dial without secret in production')

            with override_settings(
                DEBUG=False,
                TERMINAL_SERVICE_URL='ws://terminal:8000',
                TERMINAL_PROXY_SECRET=None,
            ), mock.patch.object(consumers.websockets, 'connect', fake_connect):
                await consumer.connect()  # must return without dialing

            return closed

        closed = run(scenario())
        assert closed, 'consumer must close when refusing to dial'

    def test_allows_without_secret_in_debug(self):
        async def scenario():
            consumer = self._make_consumer()

            async def fake_accept():
                pass

            async def fake_send(*args, **kwargs):
                pass

            consumer.accept = fake_accept
            consumer.send = fake_send

            captured = {}

            class FakeUpstream:
                async def recv(self):
                    await asyncio.sleep(3600)

            async def fake_connect(url, **kwargs):
                captured.update(kwargs)
                return FakeUpstream()

            with override_settings(
                DEBUG=True,
                TERMINAL_SERVICE_URL='ws://terminal:8000',
                TERMINAL_PROXY_SECRET=None,
            ), mock.patch.object(consumers.websockets, 'connect', fake_connect):
                await consumer.connect()

            return captured

        captured = run(scenario())
        assert captured.get('additional_headers') is None
