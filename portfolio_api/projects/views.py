# portfolio_api/projects/views.py

import datetime
import logging
import threading

import dns.resolver
import jwt
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound
from rest_framework.exceptions import ValidationError as ApiValidationError
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Experience, Project
from .serializers import (
	ContactSubmissionSerializer,
	ExperienceListSerializer,
	ExperienceSerializer,
	ProjectCardSerializer,
	ProjectSerializer,
)
from .storage import CustomS3Storage

logger = logging.getLogger(__name__)

class ContactSubmissionView(APIView):
	permission_classes = [AllowAny]
	
	def validate_domain(self, email):
		"""Verify if email domain has valid MX records with timeout"""
		try:
			domain = email.split('@')[-1]
			
			# First check for common disposable email domains
			disposable_domains = ['mailinator.com', 'tempmail.com', 'guerrillamail.com', 'trashmail.com']
			if domain.lower() in disposable_domains:
				return False, "Disposable email addresses are not allowed"
			
			# Create a resolver with explicit timeout settings
			resolver = dns.resolver.Resolver()
			resolver.timeout = 2.0  # 2 second timeout for each query
			resolver.lifetime = 3.0  # 3 second total lifetime for all queries
			
			# Check for valid MX record
			try:
				resolver.resolve(domain, 'MX')
				return True, "Valid domain"
			except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.resolver.NoNameservers):
				# No MX record found, try A record as fallback
				try:
					resolver.resolve(domain, 'A')
					return True, "Valid domain (A record)"
				except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.resolver.NoNameservers):
					return False, "Domain doesn't appear to be valid"
			except dns.resolver.LifetimeTimeout:
				logger.warning(f"DNS lookup timed out for domain: {domain}")
				# Don't block submission on timeout
				return True, "DNS timeout, allowing submission"
		except Exception as e:
			logger.error(f"Domain verification error: {e}")
			# If verification fails, just continue - don't block submission
			return True, "Verification error, allowing submission"
	
	@method_decorator(ratelimit(key='ip', rate='5/m', method=['POST'], block=False))
	def post(self, request):
		# block=False: let this manual check return the 429 instead of raising
		# Ratelimited (a PermissionDenied subclass), which DRF's exception
		# handler would convert to a 403 before the ratelimit middleware's
		# RATELIMIT_VIEW could render the proper response.
		was_limited = getattr(request, 'limited', False)
		if was_limited:
			# Contract §4.1: ONE error type — 429 uses the `detail` key.
			return Response(
				{'detail': 'Too many requests, please try again later.'},
				status=status.HTTP_429_TOO_MANY_REQUESTS
			)

		serializer = ContactSubmissionSerializer(data=request.data)
		
		# Custom validation before saving
		if 'email' in request.data:
			email = request.data['email']
			
			# Basic format validation (redundant with Django's but helpful for specific error messages)
			try:
				validate_email(email)
			except ValidationError:
				return Response({'email': ['Enter a valid email address']}, status=status.HTTP_400_BAD_REQUEST)
			
			# Domain validation (optional - MX record check)
			if settings.VERIFY_EMAIL_DOMAINS:
				is_valid, message = self.validate_domain(email)
				if not is_valid:
					return Response({'email': [message]}, status=status.HTTP_400_BAD_REQUEST)

		if serializer.is_valid():
			submission = serializer.save()
			
			# Generate subject from name or first words of message if no subject field
			subject = f"New Contact Form Message from {submission.name}"
			
			# Format message with line breaks for better readability
			message_body = f"""
Name: {submission.name}
Email: {submission.email}

Message:
{submission.message}

Sent from portfolio contact form at {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}
			"""
			
			# Send email in a background thread to prevent blocking
			# This prevents the server from hanging if SMTP is slow or unresponsive
			def send_email_async():
				try:
					logger.info("Starting email send for submission from %s", submission.name)
					send_mail(
						subject=subject,
						message=message_body,
						from_email=settings.DEFAULT_FROM_EMAIL,
						recipient_list=[settings.ADMIN_EMAIL],
						fail_silently=False,
					)
					logger.info("✅ Email sent successfully for submission from %s", submission.name)
				except Exception as e:
					logger.error("❌ Email sending failed: %s", e, exc_info=True)

			# Start email sending in background thread
			# daemon=False to ensure thread completes before process ends
			email_thread = threading.Thread(target=send_email_async, daemon=False, name="EmailSenderThread")
			email_thread.start()
			
			# Return immediately without waiting for email to send
			return Response(serializer.data, status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def api_root(request):
	"""Contract §3.9 #1 — static meta root; no request reflection.

	Replaces the old debug view that echoed all request headers and query
	params back to any caller (proxy internals/edge headers leak).
	"""
	return Response({'status': 'ok', 'service': 'portfolio-api'})

@api_view(['GET'])
def project_files(request, slug):
	"""Contract §3.8 — R2 demo-zip URL (public-by-design, sec C13)."""
	try:
		project = get_object_or_404(Project, slug=slug)
	except Http404:
		# §4.1: uniform 404 body
		raise NotFound()
	
	if not project.demo_files_path:
		return Response(
			{'detail': 'No demo files available for this project'}, status=404)
	
	# Get the S3 URL for the file
	s3_storage = CustomS3Storage()
	try:
		file_url = s3_storage.url(project.demo_files_path)
		
		# Return the S3 URL to the client
		return Response({'file_url': file_url})
		
	except Exception as e:
		logger.error(f"Error getting S3 URL for {project.demo_files_path}: {str(e)}")
		return Response({'error': 'Could not retrieve project files'}, status=500)

class LedgerPagination(LimitOffsetPagination):
	"""Contract §4.3 — limit/offset on the projects list only: default 24,
	max 100 (over-limit clamps via DRF's cutoff — the contract names the
	DRF mechanism, not a 400; 400s are for invalid param VALUES, §4.2)."""

	default_limit = 24
	max_limit = 100


class ProjectViewSet(viewsets.ReadOnlyModelViewSet):
	"""Unified Project list/detail — contract v2 (FROZEN 2026-10-05).

	Q1 (countersigned YES): the list is the FULL LEDGER — no featured gate,
	no include_all param. is_featured survives as a curation FIELD the
	homepage client-sorts by, never as a filter. Detail resolves any slug
	regardless of featured status (that bug class died with PR #447 and
	stays dead).

	Ordering (§1): fixed server-side — order ASC, title ASC (the ledger;
	Project.Meta.ordering). No client sort params; featured-first curation
	moved client-side (trivial at ≤100 rows).

	Params (§1 table — the complete list): project_type, has_demo (strict
	value validation → 400 per §4.2; unknown param NAMES are ignored),
	limit/offset (§4.3).
	"""

	serializer_class = ProjectSerializer
	lookup_field = 'slug'
	pagination_class = LedgerPagination
	permission_classes = [AllowAny]

	def get_queryset(self):
		# The ledger order (order, title) — featured hoisting is client-side
		# curation now (Q1).
		queryset = Project.objects.select_related('experience').order_by(
			'order', 'title'
		)

		if self.action != 'list':
			return queryset

		# Strict value validation (§4.2): unknown VALUES are loud 400s.
		project_type = self.request.query_params.get('project_type')
		if project_type is not None:
			if project_type not in ('school', 'internship', 'personal'):
				raise ApiValidationError({'project_type': [f"invalid choice: '{project_type}'"]})
			queryset = queryset.filter(project_type=project_type)

		has_demo = self.request.query_params.get('has_demo')
		if has_demo is not None:
			if has_demo not in ('true', 'false'):
				raise ApiValidationError({'has_demo': [f"invalid choice: '{has_demo}'"]})
			queryset = queryset.filter(has_demo=(has_demo == 'true'))

		return queryset

	def get_serializer_class(self):
		"""§3.1 cards on the list; §3.3 full detail on retrieve."""
		if self.action == 'list':
			return ProjectCardSerializer
		return ProjectSerializer

	def get_object(self):
		"""§4.1: 404 body is {"detail": "Not found."} — Django's
		get_object_or_404 message would leak through NotFound(*args)."""
		try:
			return super().get_object()
		except Http404:
			raise NotFound()

@api_view(['GET'])
@permission_classes([AllowAny])  # Allow anonymous access for demo terminal
@ratelimit(key='ip', rate='30/m', method=['GET'], block=False)
def generate_terminal_token(request):
	"""Contract §3.7 — guest JWT mint (HS256, 5-min, purpose-scoped).

	30/min/IP is NEW (security review C7 — previously unthrottled).
	block=False: the manual check below returns the §4.1 429 shape
	({detail: ...}) instead of raising Ratelimited (which the middleware
	would route through RATELIMIT_VIEW with the legacy error shape).
	"""
	was_limited = getattr(request, 'limited', False)
	if was_limited:
		return Response(
			{'detail': 'Too many requests, please try again later.'},
			status=status.HTTP_429_TOO_MANY_REQUESTS
		)
	
	# Set expiration time (5 minutes)
	expiration = datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
	
	# Create payload for both authenticated and anonymous users
	if request.user.is_authenticated:
		payload = {
			'user_id': request.user.id,
			'username': request.user.username,
			'purpose': 'terminal_access',
			'exp': expiration
		}
	else:
		# Anonymous user - generate a guest token
		payload = {
			'user_id': None,
			'username': 'guest',
			'purpose': 'terminal_access',
			'exp': expiration
		}
	
	# Create token
	token = jwt.encode(
		payload,
		settings.SECRET_KEY,
		algorithm="HS256"
	)
	
	return Response({'token': token})


# ── Contract §7 kill-list (executed in F2-03) ────────────────────────────────
# GET /api/health/ — DELETED: duplicates /healthz (endpoint #2). The route is
# gone from urls.py; portfolio_api/urls.py serves /healthz for Render.

class ExperienceViewSet(viewsets.ReadOnlyModelViewSet):
	"""
	ViewSet for experiences (schema v2 successor of the internship surface).

	Endpoints:
	- GET /api/experiences/ - List active experiences
	- GET /api/experiences/{slug}/ - Retrieve an experience with nested projects

	NOTE (F2 handoff): the deprecated /api/internships* routes this replaces
	are deleted in this commit — the frozen v1 UI still consumes them in prod
	via main until the flip; that split-brain is tracked in SESSION.md (F2).
	"""
	serializer_class = ExperienceSerializer
	lookup_field = 'slug'
	permission_classes = [AllowAny]

	def get_queryset(self):
		"""Active experiences, ordered, with nested linked projects."""
		return Experience.objects.filter(is_active=True).prefetch_related('projects')

	def get_serializer_class(self):
		"""Lightweight serializer for list, full serializer for detail."""
		if self.action == 'list':
			return ExperienceListSerializer
		return ExperienceSerializer

	def get_object(self):
		"""§4.1: 404 body is {"detail": "Not found."}."""
		try:
			return super().get_object()
		except Http404:
			raise NotFound()