# tests/integration/test_terminal_consumer.py
"""F2-08 — critical-path coverage for the terminal WS proxy (consumers.py).

TerminalConsumer is the browser↔terminal-service proxy. This path carried
a token-dropping class of bug before the rework, so its auth and failure
branches are tested directly:

- validate_jwt: every accept/reject branch (wrong purpose, missing exp,
  expired, malformed, unexpected error → fail closed)
- connect: missing / malformed / expired token → close 4003, upstream
  never dialed
- connect: TERMINAL_SERVICE_URL scheme handling (ws/wss passthrough,
  scheme-less base URL → wss:// prepended)
- connect: upstream dial error and dial timeout → user-visible output
  message + close
- the connected flow: welcome message, upstream→browser relay,
  browser→upstream input, disconnect cleanup (upstream closed, forwarding
  task cancelled, upstream close errors swallowed)
- forward_from_terminal: upstream closed → notice to client; client
  already gone → no crash; transport error → error notice; read-idle →
  keepalive ping
- receive: upstream gone → refresh notice; pre-dial receive → no-op
- HealthCheckConsumer handshake body
- the WS routing table itself (terminal slug extraction + health route)

All upstreams are fakes (no network). Async via asyncio.run(), matching
the suite's existing convention (see test_security_hotfixes.py).
"""

import asyncio
import datetime
import json
from unittest import mock

import jwt as pyjwt
import pytest
import websockets
from django.conf import settings
from django.test import override_settings

import projects.consumers as consumers


def run(coro):
    """Run an async coroutine to completion."""
    return asyncio.run(coro)


def mint_token(**overrides):
    """A guest JWT exactly as generate_terminal_token mints it."""
    payload = {
        'user_id': None,
        'username': 'guest',
        'purpose': 'terminal_access',
        'exp': datetime.datetime.now(datetime.timezone.utc)
        + datetime.timedelta(minutes=5),
    }
    payload.update(overrides)
    return pyjwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


class FakeUpstream:
    """Deterministic stand-in for the terminal-service WebSocket.

    `incoming` items are returned from recv() in order; Exception items
    are raised instead of returned. Once the list is empty recv() blocks
    forever (the idle steady-state).
    """

    def __init__(self, incoming=()):
        self._incoming = list(incoming)
        self.relayed = []
        self.closed = False
        self.pinged = False
        self.close_error = None
        self.send_error = None

    async def recv(self):
        if self._incoming:
            item = self._incoming.pop(0)
            if isinstance(item, BaseException):
                raise item
            return item
        await asyncio.sleep(3600)

    async def send(self, data):
        if self.send_error:
            raise self.send_error
        self.relayed.append(data)

    async def close(self):
        if self.close_error:
            raise self.close_error
        self.closed = True

    async def ping(self):
        self.pinged = True


def make_consumer(query_string, slug='minishell', send_error=None):
    """A TerminalConsumer wired to a fake browser connection.

    Returns (consumer, sent, closed): `sent` collects every text_data
    payload written to the browser; `closed` collects close codes.
    """
    consumer = consumers.TerminalConsumer()
    consumer.scope = {
        'url_route': {'kwargs': {'project_slug': slug}},
        'query_string': query_string,
    }
    sent, closed = [], []

    async def fake_accept():
        pass

    async def fake_send(*args, **kwargs):
        if send_error:
            raise send_error
        sent.append(kwargs.get('text_data', args[0] if args else None))

    async def fake_close(code=None):
        closed.append(code)

    consumer.accept = fake_accept
    consumer.send = fake_send
    consumer.close = fake_close
    return consumer, sent, closed


# Production-shaped proxy settings for scenarios that get past the gates.
PROXY_SETTINGS = dict(
    DEBUG=False,
    TERMINAL_SERVICE_URL='ws://terminal:8000',
    TERMINAL_PROXY_SECRET='topsecret',
)


def closed_ok(closed):
    """The consumer signalled end-of-connection to the browser."""
    return len(closed) > 0


# ═════════════════════════════════════════════════════════════════════════════
# validate_jwt — every branch
# ═════════════════════════════════════════════════════════════════════════════

class TestValidateJwtBranches:

    def test_valid_guest_token_accepted(self):
        assert consumers.validate_jwt(mint_token()) is True

    def test_wrong_purpose_rejected(self):
        token = mint_token(purpose='something_else')
        assert consumers.validate_jwt(token) is False

    def test_missing_expiration_rejected(self):
        payload = {
            'user_id': None,
            'username': 'guest',
            'purpose': 'terminal_access',
            # no exp
        }
        token = pyjwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        assert consumers.validate_jwt(token) is False

    def test_expired_token_rejected(self):
        token = mint_token(
            exp=datetime.datetime.now(datetime.timezone.utc)
            - datetime.timedelta(minutes=1),
        )
        assert consumers.validate_jwt(token) is False

    def test_malformed_token_rejected(self):
        assert consumers.validate_jwt('not-a-jwt-at-all') is False

    def test_unexpected_decode_error_fails_closed(self):
        """Any unexpected failure in decode must reject, never accept."""
        with mock.patch.object(consumers.jwt, 'decode',
                               side_effect=RuntimeError('boom')):
            assert consumers.validate_jwt(mint_token()) is False


# ═════════════════════════════════════════════════════════════════════════════
# connect — the auth gate (close 4003, upstream never dialed)
# ═════════════════════════════════════════════════════════════════════════════

class TestConnectAuthGate:

    def _assert_rejected(self, query_string):
        async def scenario():
            consumer, sent, closed = make_consumer(query_string)

            async def fake_connect(url, **kwargs):
                raise AssertionError('must not dial with a bad token')

            with override_settings(**PROXY_SETTINGS), \
                 mock.patch.object(consumers.websockets, 'connect',
                                   fake_connect):
                await consumer.connect()
            return sent, closed

        sent, closed = run(scenario())
        assert closed == [4003], 'invalid token must close with 4003'
        assert sent == [], 'no output may be sent on auth rejection'

    def test_missing_token_closes_4003(self):
        self._assert_rejected(b'')

    def test_malformed_token_closes_4003(self):
        self._assert_rejected(b'token=garbage.token.here')

    def test_expired_token_closes_4003(self):
        expired = mint_token(
            exp=datetime.datetime.now(datetime.timezone.utc)
            - datetime.timedelta(minutes=1),
        )
        self._assert_rejected(f'token={expired}'.encode())

    def test_wrong_purpose_token_closes_4003(self):
        wrong = mint_token(purpose='not_terminal_access')
        self._assert_rejected(f'token={wrong}'.encode())


# ═════════════════════════════════════════════════════════════════════════════
# connect — upstream URL construction
# ═════════════════════════════════════════════════════════════════════════════

class TestConnectUpstreamUrl:

    def _dialed_url(self, base_url):
        async def scenario():
            consumer, _, _ = make_consumer(
                f'token={mint_token()}'.encode())
            dialed = {}

            async def fake_connect(url, **kwargs):
                dialed['url'] = url
                return FakeUpstream()

            with override_settings(TERMINAL_SERVICE_URL=base_url,
                                   TERMINAL_PROXY_SECRET='topsecret',
                                   DEBUG=False), \
                 mock.patch.object(consumers.websockets, 'connect',
                                   fake_connect):
                await consumer.connect()
            return dialed['url']

        return run(scenario())

    def test_ws_scheme_passthrough(self):
        assert self._dialed_url('ws://terminal:8000') == \
            'ws://terminal:8000/terminal/minishell/'

    def test_wss_scheme_passthrough(self):
        assert self._dialed_url('wss://terminal.example.com') == \
            'wss://terminal.example.com/terminal/minishell/'

    def test_schemeless_base_url_gets_wss_prefix(self):
        assert self._dialed_url('terminal.example.com') == \
            'wss://terminal.example.com/terminal/minishell/'

    def test_slug_is_taken_from_the_route(self):
        assert self._dialed_url('ws://t:1').endswith('/terminal/minishell/')


# ═════════════════════════════════════════════════════════════════════════════
# connect — upstream dial failures
# ═════════════════════════════════════════════════════════════════════════════

class TestConnectDialFailures:

    def test_dial_error_sends_output_and_closes(self):
        async def scenario():
            consumer, sent, closed = make_consumer(
                f'token={mint_token()}'.encode())

            async def fake_connect(url, **kwargs):
                raise OSError('no route to host')

            with override_settings(**PROXY_SETTINGS), \
                 mock.patch.object(consumers.websockets, 'connect',
                                   fake_connect):
                await consumer.connect()
            return sent, closed

        sent, closed = run(scenario())
        assert closed_ok(closed), 'dial failure must close the connection'
        assert len(sent) == 1
        body = json.loads(sent[0])
        assert 'Error connecting to terminal service' in body['output']

    def test_dial_timeout_notifies_and_closes(self):
        """The 180s upstream timeout must surface as a message + close —
        tested without waiting: the timeout mechanism itself is stubbed
        at the asyncio.wait_for boundary."""
        async def scenario():
            consumer, sent, closed = make_consumer(
                f'token={mint_token()}'.encode())

            async def exploding_wait_for(coro, timeout=None):
                # The dial awaitable may be a websockets `connect` object
                # (no .close) — quench it best-effort, never await it.
                close = getattr(coro, 'close', None)
                if close is not None:
                    try:
                        close()
                    except Exception:
                        pass
                raise asyncio.TimeoutError()

            with override_settings(**PROXY_SETTINGS), \
                 mock.patch.object(consumers.asyncio, 'wait_for',
                                   exploding_wait_for):
                await consumer.connect()
            return sent, closed

        sent, closed = run(scenario())
        assert closed_ok(closed), 'dial timeout must close the connection'
        body = json.loads(sent[0])
        assert 'timed out' in body['output']


# ═════════════════════════════════════════════════════════════════════════════
# the connected flow — relay, input, disconnect cleanup
# ═════════════════════════════════════════════════════════════════════════════

class TestConnectedProxyFlow:

    def test_welcome_relay_input_and_disconnect_cleanup(self):
        """One connected session, end to end against a fake upstream:
        welcome message on connect, upstream output relayed to the
        browser, browser input forwarded upstream, and disconnect closes
        the upstream and cancels the forwarding task."""
        async def scenario():
            upstream = FakeUpstream(incoming=['xterm-ready'])
            consumer, sent, closed = make_consumer(
                f'token={mint_token()}'.encode())

            async def fake_connect(url, **kwargs):
                return upstream

            with override_settings(**PROXY_SETTINGS), \
                 mock.patch.object(consumers.websockets, 'connect',
                                   fake_connect):
                await consumer.connect()
                await asyncio.sleep(0.1)  # let the forward task relay
                await consumer.receive('ls\n')
                await consumer.disconnect(1000)
            return upstream, sent, consumer

        upstream, sent, consumer = run(scenario())

        # Welcome + relay reached the browser
        assert any('Connecting to terminal for minishell' in m
                   for m in sent if isinstance(m, str))
        assert 'xterm-ready' in sent
        # Input reached the upstream, unmodified
        assert upstream.relayed == ['ls\n']
        # Cleanup: upstream closed, forwarding task finished
        assert upstream.closed is True
        assert consumer.forward_task.done()

    def test_disconnect_swallows_upstream_close_error(self):
        """An upstream that is already dead on close must not crash
        disconnect cleanup."""
        async def scenario():
            upstream = FakeUpstream()
            upstream.close_error = RuntimeError('already closed')
            consumer, _, _ = make_consumer(f'token={mint_token()}'.encode())

            async def fake_connect(url, **kwargs):
                return upstream

            with override_settings(**PROXY_SETTINGS), \
                 mock.patch.object(consumers.websockets, 'connect',
                                   fake_connect):
                await consumer.connect()
                await consumer.disconnect(1000)
            return consumer

        consumer = run(scenario())
        assert consumer.forward_task.done()


# ═════════════════════════════════════════════════════════════════════════════
# receive — browser → upstream input paths
# ═════════════════════════════════════════════════════════════════════════════

class TestReceivePaths:

    def test_upstream_gone_notifies_client_to_refresh(self):
        async def scenario():
            upstream = FakeUpstream()
            upstream.send_error = websockets.ConnectionClosed(
                websockets.Close(1011, 'upstream died'), None)
            consumer, sent, _ = make_consumer(f'token={mint_token()}'.encode())
            consumer.terminal_ws = upstream
            await consumer.receive('ls\n')
            return sent

        sent = run(scenario())
        assert any('Terminal connection lost, please refresh' in m
                   for m in sent if isinstance(m, str))

    def test_receive_before_dial_is_noop(self):
        """A receive that races ahead of the upstream dial must neither
        crash nor emit anything."""
        async def scenario():
            consumer, sent, _ = make_consumer(f'token={mint_token()}'.encode())
            await consumer.receive('early\n')
            return sent

        assert run(scenario()) == []


# ═════════════════════════════════════════════════════════════════════════════
# forward_from_terminal — upstream → browser paths
# ═════════════════════════════════════════════════════════════════════════════

class TestForwardFromTerminal:

    def test_upstream_closed_notifies_client(self):
        async def scenario():
            upstream = FakeUpstream(incoming=[
                websockets.ConnectionClosed(
                    websockets.Close(1000, 'bye'), None),
            ])
            consumer, sent, closed = make_consumer(f'token={mint_token()}'.encode())
            consumer.terminal_ws = upstream
            await consumer.forward_from_terminal()
            return sent, closed

        sent, closed = run(scenario())
        assert any('Terminal connection closed. Refresh to reconnect' in m
                   for m in sent if isinstance(m, str))
        assert closed_ok(closed), 'forward loop must close the browser socket'

    def test_upstream_closed_and_client_gone_does_not_crash(self):
        """Both ends dead: the failure to NOTIFY must be swallowed (the
        socket is gone — nothing left to do)."""
        async def scenario():
            upstream = FakeUpstream(incoming=[
                websockets.ConnectionClosed(
                    websockets.Close(1000, 'bye'), None),
            ])
            consumer, _, closed = make_consumer(
                f'token={mint_token()}'.encode(),
                send_error=RuntimeError('browser socket gone'))
            consumer.terminal_ws = upstream
            await consumer.forward_from_terminal()
            return closed

        assert closed_ok(run(scenario()))

    def test_transport_error_notifies_client(self):
        async def scenario():
            upstream = FakeUpstream(incoming=[ConnectionError('reset by peer')])
            consumer, sent, closed = make_consumer(f'token={mint_token()}'.encode())
            consumer.terminal_ws = upstream
            await consumer.forward_from_terminal()
            return sent, closed

        sent, closed = run(scenario())
        assert any('Terminal error: reset by peer' in m
                   for m in sent if isinstance(m, str))
        assert closed_ok(closed)

    def test_transport_error_and_client_gone_does_not_crash(self):
        """Transport error AND the notify-send fails (browser socket
        already dead): the notify failure must be swallowed."""
        async def scenario():
            upstream = FakeUpstream(incoming=[ConnectionError('reset')])
            consumer, _, closed = make_consumer(
                f'token={mint_token()}'.encode(),
                send_error=RuntimeError('browser socket gone'))
            consumer.terminal_ws = upstream
            await consumer.forward_from_terminal()
            return closed

        assert closed_ok(run(scenario()))

    def test_read_idle_sends_keepalive_ping(self):
        """When the upstream goes quiet past the read timeout, the proxy
        pings the upstream and tells the browser it is still alive."""
        async def scenario():
            upstream = FakeUpstream(incoming=[
                asyncio.TimeoutError(),  # read idle first…
                websockets.ConnectionClosed(  # …then the loop ends
                    websockets.Close(1000, 'bye'), None),
            ])
            consumer, sent, _ = make_consumer(f'token={mint_token()}'.encode())
            consumer.terminal_ws = upstream
            await consumer.forward_from_terminal()
            return upstream, sent

        upstream, sent = run(scenario())
        assert upstream.pinged is True
        assert any('still active' in m for m in sent if isinstance(m, str))


# ═════════════════════════════════════════════════════════════════════════════
# HealthCheckConsumer + the WS routing table
# ═════════════════════════════════════════════════════════════════════════════

class TestHealthCheckConsumer:

    def test_handshake_sends_health_body_then_closes(self):
        async def scenario():
            consumer, sent, closed = make_consumer(b'', slug=None)
            await consumers.HealthCheckConsumer.connect(consumer)
            return sent, closed

        sent, closed = run(scenario())
        assert sent == [json.dumps(
            {'status': 'healthy', 'service': 'websocket'})]
        assert closed == [None]


class TestRoutingTable:
    """The WS route table is load-bearing: a routing regression kills the
    terminal and the WS healthcheck silently."""

    def test_exactly_two_ws_routes(self):
        from projects import routing
        assert len(routing.websocket_urlpatterns) == 2

    def test_terminal_route_extracts_project_slug(self):
        from projects import routing
        terminal = routing.websocket_urlpatterns[0]
        match = terminal.pattern.regex.search('ws/terminal/minishell/')
        assert match is not None
        assert match.group('project_slug') == 'minishell'

    def test_health_route_registered(self):
        from projects import routing
        health = routing.websocket_urlpatterns[1]
        assert health.pattern.regex.search('ws/health/') is not None
