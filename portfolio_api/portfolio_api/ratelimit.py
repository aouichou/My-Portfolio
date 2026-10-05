"""Client-IP extraction for django-ratelimit behind trusted reverse proxies.

django-ratelimit's ``RATELIMIT_IP_META_KEY`` accepts either a META key or a
dotted path to a callable. Pointing it at ``HTTP_X_FORWARDED_FOR`` directly
crashes with ``ValueError`` on any multi-value header ('client, proxy1' —
what every real proxy chain produces), which surfaces as a 500 on the very
endpoints the limiter protects (verified against django-ratelimit 4.1.0
during F2-07). The callable below takes the RIGHTMOST entry: the one
appended by OUR trusted edge (Render's router in prod, the compose nginx in
the self-hosted topology). Everything left of it is client-supplied and
must never be trusted for bucketing.

Closes security-review N3 (pre-rework): behind the platform router
REMOTE_ADDR is the router's own IP, so every visitor shared ONE rate-limit
bucket — a single abuser's 5 contact emails/minute locked the form for
everyone, and per-visitor fairness was fiction.
"""

import logging

logger = logging.getLogger(__name__)


def client_ip(request):
	"""Return the client IP for rate-limit bucketing.

	Rightmost X-Forwarded-For entry (the hop OUR trusted proxy appended);
	falls back to REMOTE_ADDR when the header is absent (direct/dev
	traffic). An empty result lets django-ratelimit raise its own
	ImproperlyConfigured, matching its native behavior.
	"""
	forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
	if forwarded:
		client = forwarded.split(',')[-1].strip()
		if client:
			return client
		logger.warning(
			'X-Forwarded-For present but empty after parsing: %r', forwarded
		)
	return request.META.get('REMOTE_ADDR', '')
