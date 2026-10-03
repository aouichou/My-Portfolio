# portfolio_api/views.py
"""Project-level views for the portfolio_api package.

Currently only hosts the django-ratelimit 429 view referenced by
``settings.RATELIMIT_VIEW``. Previously this dotted path did not exist, so
every tripped rate limit raised ModuleNotFoundError inside the middleware
and surfaced as an HTTP 500.
"""

import logging

from django.http import JsonResponse
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger(__name__)


def rate_limit_response(request, exception=None):
	"""Return a clean 429 when django-ratelimit blocks a request.

	Called by ``django_ratelimit.middleware.RatelimitMiddleware.process_exception``
	with the ``Ratelimited`` exception. Signature: ``(request, exception)``.
	"""
	logger.warning(
		"Rate limit exceeded for %s on %s",
		request.META.get('REMOTE_ADDR', 'unknown'),
		request.path,
	)
	return JsonResponse(
		{'error': 'rate_limited', 'detail': _('Too many requests. Please try again later.')},
		status=429,
	)
