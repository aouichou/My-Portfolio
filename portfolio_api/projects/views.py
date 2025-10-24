# portfolio_api/projects/views.py

import datetime
import logging
import os
import tempfile
import threading
import zipfile

import boto3
import dns.resolver
import jwt
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from rest_framework import generics, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Gallery, Project
from .serializers import ContactSubmissionSerializer, ProjectSerializer
from .storage import CustomS3Storage

logger = logging.getLogger(__name__)
class ProjectList(generics.ListAPIView):
	queryset = Project.objects.prefetch_related(
		Prefetch('galleries', queryset=Gallery.objects.prefetch_related('images').order_by('order'))
	).filter(is_featured=True)
	serializer_class = ProjectSerializer
	filterset_fields = ['is_featured']

class ProjectDetail(generics.RetrieveAPIView):
	queryset = Project.objects.prefetch_related(
		Prefetch('galleries', 
				 queryset=Gallery.objects.prefetch_related('images').order_by('order'))
	)
	lookup_field = 'slug'
	serializer_class = ProjectSerializer

	def retrieve(self, request, *args, **kwargs):
		instance = self.get_object()
		
		# Detailed logging for the ft_transcendence project specifically
		if instance.slug == 'ft_transcendence':
			logger.info(f"============ FT_TRANSCENDENCE PROJECT DATA ============")
			logger.info(f"Title: {instance.title}")
			logger.info(f"Slug: {instance.slug}")
			logger.info(f"Thumbnail: {instance.thumbnail}")
			
			# Log galleries and their images
			galleries = instance.galleries.all().prefetch_related('images')
			logger.info(f"Number of galleries: {galleries.count()}")
			
			for i, gallery in enumerate(galleries):
				logger.info(f"Gallery {i+1}: {gallery.name}")
				logger.info(f"Gallery images count: {gallery.images.count()}")
				
				for j, image in enumerate(gallery.images.all()):
					logger.info(f"  Image {j+1}: {image.image}")
					logger.info(f"  Image URL: {image.image.url}")
					logger.info(f"  Image path: {image.image.name}")
			
			# Log live URL which should contain a valid link        
			logger.info(f"Live URL: {instance.live_url}")
			logger.info(f"Has interactive demo: {instance.has_interactive_demo}")
			logger.info(f"============ END PROJECT DATA ============")
		
		serializer = self.get_serializer(instance)
		return Response(serializer.data)

@api_view(['GET', 'POST'])
@ratelimit(key='ip', rate='60/m')
def project_by_slug(request):
	if request.method == 'POST':
		slug = request.data.get('slug')
	else:
		slug = request.GET.get('slug')
	
	if not slug:
		return Response({'error': 'Slug is required'}, status=400)
	
	project = get_object_or_404(
		Project.objects.prefetch_related('galleries__images'),
		slug=slug
	)
	serializer = ProjectSerializer(project, context={'request': request})
	return Response(serializer.data)

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
	
	@method_decorator(ratelimit(key='ip', rate='5/m', method=['POST']))
	def post(self, request):
		was_limited = getattr(request, 'limited', False)
		if was_limited:
			return Response(
				{'error': 'Too many requests, please try again later.'}, 
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
			if settings.VERIFY_EMAIL_DOMAINS:  # Add this to settings.py
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
					logger.info(f"Starting email send for submission from {submission.name}")
					send_mail(
						subject=subject,
						message=message_body,
						from_email=settings.DEFAULT_FROM_EMAIL,
						recipient_list=[settings.ADMIN_EMAIL],
						fail_silently=False,
					)
					logger.info(f"✅ Email sent successfully for submission from {submission.name}")
				except Exception as e:
					logger.error(f"❌ Email sending failed: {e}", exc_info=True)
			
			# Start email sending in background thread
			# daemon=False to ensure thread completes before process ends
			email_thread = threading.Thread(target=send_email_async, daemon=False, name="EmailSenderThread")
			email_thread.start()
			
			# Return immediately without waiting for email to send
			return Response(serializer.data, status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def debug_view(request):
	"""
	Debug view to help identify routing issues
	"""
	return Response({
		'message': 'API is working',
		'path': request.path,
		'method': request.method,
		'headers': dict(request.headers),
		'query_params': dict(request.query_params)
	})

class RateLimitedTokenObtainPairView(TokenObtainPairView):
	permission_classes = [AllowAny]
	
	@method_decorator(ratelimit(key='ip', rate='5/m', method='POST'))
	def post(self, request, *args, **kwargs):
		return super().post(request, *args, **kwargs)
	
@api_view(['POST'])
@permission_classes([AllowAny])
def trigger_import(request):
	from django.core.management import call_command
	try:
		call_command('import_projects', 'projects.json')
		return Response({'status': 'Import started'})
	except Exception as e:
		return Response({'error': str(e)}, status=500)

@api_view(['GET'])
def project_files(request, slug):
	"""Serve project demo files from S3"""
	project = get_object_or_404(Project, slug=slug)
	
	if not project.demo_files_path:
		return Response({'error': 'No demo files available for this project'}, status=404)
	
	# Get the S3 URL for the file
	s3_storage = CustomS3Storage()
	try:
		file_url = s3_storage.url(project.demo_files_path)
		
		# Return the S3 URL to the client
		return Response({'file_url': file_url})
		
	except Exception as e:
		logger.error(f"Error getting S3 URL for {project.demo_files_path}: {str(e)}")
		return Response({'error': 'Could not retrieve project files'}, status=500)

def download_project_files(project_slug):
	"""Download project files from S3 and extract to temp directory"""
	try:
		project = Project.objects.get(slug=project_slug)
		if not project.demo_files_path:
			return None
		
		# Create temp directory
		temp_dir = tempfile.mkdtemp(prefix=f"project-{project_slug}-")
		
		# Download zip from S3
		s3 = boto3.client(
			's3',
			aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
			aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
			region_name=settings.AWS_S3_REGION_NAME
		)
		
		zip_path = os.path.join(temp_dir, 'project.zip')
		s3.download_file(
			settings.AWS_STORAGE_BUCKET_NAME,
			project.demo_files_path,
			zip_path
		)
		
		# Extract zip
		with zipfile.ZipFile(zip_path, 'r') as zip_ref:
			zip_ref.extractall(temp_dir)
		
		# Remove zip file
		os.remove(zip_path)
		
		return temp_dir
	except Exception as e:
		print(f"Error downloading project files: {e}")
		return None

@api_view(['GET'])
def health_check(request):
	return Response({'status': 'healthy'}, status=200)

class ProjectViewSet(viewsets.ReadOnlyModelViewSet):
	serializer_class = ProjectSerializer
	lookup_field = 'slug'
	
	def get_queryset(self):
		queryset = Project.objects.all().order_by('-score')
		
		# By default, only return featured projects unless include_all=true is specified
		include_all_param = self.request.query_params.get('include_all', 'false')
		include_all = include_all_param.lower() == 'true'
		
		if not include_all:
			queryset = queryset.filter(is_featured=True)
		
		return queryset

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_terminal_token(request):
    """Generate a JWT token for terminal access"""
    
    # Set expiration time (5 minutes)
    expiration = datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
    
    # Create payload
    payload = {
        'user_id': request.user.id,
        'username': request.user.username,
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
