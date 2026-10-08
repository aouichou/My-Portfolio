# tests/unit/test_guest_token_gate.py
"""F4-02 — slug-bound guest tokens: the terminal-service gate.

Django now forwards the verified guest JWT on the Django→terminal hop
(query param `token`). verify_guest_token() checks signature (shared
TERMINAL_JWT_SECRET = the API SECRET_KEY), exp, purpose, and that the
slug claim matches the requested project. Posture mirrors the proxy
secret: unset + DEBUG allows (dev direct-connect mints nothing); unset +
production fails closed.

These tests pin verify_guest_token() unit semantics; the endpoint wiring
(same close code as the proxy gate, before any session work) is pinned in
tests/integration/test_websocket_hardening.py.
"""

import os
import sys
import time
import unittest.mock as m

import jwt as pyjwt
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
os.environ.setdefault('DEBUG', 'True')
for mod in ['redis', 'pexpect', 'boto3', 'psutil']:
	if mod not in sys.modules:
		sys.modules[mod] = m.MagicMock()

import main

SECRET = 'shared-api-secret-key'


def mint_token(slug='minishell', purpose='terminal_access',
               expires_in=300, secret=SECRET, **extra_claims):
	now = time.time()
	payload = {
		'user_id': None,
		'username': 'guest',
		'purpose': purpose,
		'slug': slug,
		'exp': now + expires_in,
		'iat': now,
	}
	payload.update(extra_claims)
	return pyjwt.encode(payload, secret, algorithm='HS256')


# ═════════════════════════════════════════════════════════════════════════════
# happy + sad paths (secret configured — the production posture)
# ═════════════════════════════════════════════════════════════════════════════

class TestVerifyGuestToken:

	def test_valid_token_accepted(self):
		with m.patch.object(main, 'TERMINAL_JWT_SECRET', SECRET):
			ok, err = main.verify_guest_token(mint_token(), 'minishell')
		assert ok is True and err is None

	def test_wrong_slug_token_rejected(self):
		"""F4-02 core: a token minted for another project may not open
		this project's terminal."""
		with m.patch.object(main, 'TERMINAL_JWT_SECRET', SECRET):
			ok, err = main.verify_guest_token(mint_token(slug='push-swap'),
			                                  'minishell')
		assert ok is False
		assert 'not valid for this project' in err

	def test_expired_token_rejected(self):
		with m.patch.object(main, 'TERMINAL_JWT_SECRET', SECRET):
			ok, err = main.verify_guest_token(
				mint_token(expires_in=-60), 'minishell')
		assert ok is False
		assert 'expired' in err

	def test_wrong_signature_rejected(self):
		with m.patch.object(main, 'TERMINAL_JWT_SECRET', SECRET):
			ok, err = main.verify_guest_token(
				mint_token(secret='attacker-key'), 'minishell')
		assert ok is False
		assert 'invalid terminal token' in err

	def test_wrong_purpose_rejected(self):
		with m.patch.object(main, 'TERMINAL_JWT_SECRET', SECRET):
			ok, err = main.verify_guest_token(
				mint_token(purpose='something_else'), 'minishell')
		assert ok is False

	def test_missing_slug_claim_rejected(self):
		with m.patch.object(main, 'TERMINAL_JWT_SECRET', SECRET):
			ok, err = main.verify_guest_token(mint_token(slug=None),
			                                  'minishell')
		assert ok is False
		assert 'not valid for this project' in err

	def test_missing_token_rejected_when_secret_set(self):
		with m.patch.object(main, 'TERMINAL_JWT_SECRET', SECRET):
			ok, err = main.verify_guest_token(None, 'minishell')
		assert ok is False
		assert 'missing terminal token' in err

	def test_garbage_token_rejected(self):
		with m.patch.object(main, 'TERMINAL_JWT_SECRET', SECRET):
			ok, err = main.verify_guest_token('not-a-jwt', 'minishell')
		assert ok is False
		assert 'invalid terminal token' in err


# ═════════════════════════════════════════════════════════════════════════════
# secret posture (mirrors the proxy-secret pattern)
# ═════════════════════════════════════════════════════════════════════════════

class TestSecretPosture:

	def test_unset_secret_allowed_in_debug_mode(self):
		"""dev-compose direct-connect: no Django in front to mint — the
		gate is permissive with a loud warning (same as proxy secret)."""
		with m.patch.object(main, 'TERMINAL_JWT_SECRET', None), \
			m.patch.object(main, 'DEBUG_MODE', True):
			ok, err = main.verify_guest_token(None, 'minishell')
		assert ok is True and err is None

	def test_unset_secret_fails_closed_in_production(self):
		with m.patch.object(main, 'TERMINAL_JWT_SECRET', None), \
			m.patch.object(main, 'DEBUG_MODE', False):
			ok, err = main.verify_guest_token(mint_token(), 'minishell')
		assert ok is False
		assert 'not configured' in err


# ═════════════════════════════════════════════════════════════════════════════
# endpoint wiring — the token gate sits with the proxy gate, rejects
# before any session work, same 4401 close
# ═════════════════════════════════════════════════════════════════════════════

class _FakeWS:
	def __init__(self, token):
		self.headers = {}
		self.query_params = {'token': token} if token is not None else {}


class TestEndpointGateWiring:

	def test_endpoint_rejects_wrong_slug_token_4401(self):
		"""The endpoint must consult verify_guest_token before spawning —
		asserted at source level (the integration suite's StubWebSocket
		drives the full coroutine for the happy path)."""
		import inspect
		src = inspect.getsource(main.terminal_endpoint)
		assert 'verify_guest_token' in src
		assert "websocket.query_params.get(TOKEN_QUERY_PARAM)" in src

	def test_valid_token_passes_gate_function(self):
		"""Happy path through the gate function the endpoint calls."""
		with m.patch.object(main, 'TERMINAL_JWT_SECRET', SECRET):
			ok, err = main.verify_guest_token(mint_token(), 'minishell')
		assert ok is True and err is None
