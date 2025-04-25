# portfolio_api/settings.py

from dotenv import load_dotenv
from pathlib import Path
import dj_database_url
import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
load_dotenv(os.path.join(BASE_DIR, '..', '..', '.env'))

# Temporary secret for build phase only
BUILD_SECRET = 'django-insecure-build-key-123'

SECRET_KEY = os.getenv('SECRET_KEY', BUILD_SECRET)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False
# Enable proxy header handling
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'

ALLOWED_HOSTS = [
	'api.aouichou.me',
	'aouichou.me',
	'www.aouichou.me',
	'portfolio-backend-dytv.onrender.com',  # Add exact Render host
	'portfolio-frontend.herokuapp.com',
	'*.onrender.com'  # Wildcard for Render
]

CSRF_TRUSTED_ORIGINS = ['https://aouichou.me', 'https://www.aouichou.me']
MEDIA_URL = os.environ.get('MEDIA_URL', '/media/')
MEDIA_ROOT = '/app/media'

CACHES = {
	'default': {
		'BACKEND': 'django_redis.cache.RedisCache',
		'LOCATION': os.environ.get('REDIS_URL', 'redis://localhost:6379/1'),
		'OPTIONS': {
			'CLIENT_CLASS': 'django_redis.client.DefaultClient',
		}
	}
}

RATELIMIT_USE_CACHE = 'default'
RATELIMIT_ENABLE = True
RATELIMIT_FAIL_OPEN = False

# Application definition

INSTALLED_APPS = [
	'django.contrib.admin',
	'django.contrib.auth',
	'django.contrib.contenttypes',
	'django.contrib.sessions',
	'django.contrib.messages',
	'django.contrib.staticfiles',
	'rest_framework',
	'corsheaders',
	'projects',
]

MIDDLEWARE = [
	'corsheaders.middleware.CorsMiddleware',
	'whitenoise.middleware.WhiteNoiseMiddleware',
	'django.middleware.security.SecurityMiddleware',
	'django.contrib.sessions.middleware.SessionMiddleware',
	'django.middleware.common.CommonMiddleware',
	'django.middleware.csrf.CsrfViewMiddleware',
	'django.contrib.auth.middleware.AuthenticationMiddleware',
	'django.contrib.messages.middleware.MessageMiddleware',
	'django.middleware.clickjacking.XFrameOptionsMiddleware',
	'django_ratelimit.middleware.RatelimitMiddleware',
]

# Security middleware configuration
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'


CSRF_TRUSTED_ORIGINS = [
	"https://portfolio-frontend.herokuapp.com",
	"https://*.aouichou.me"
]

# Rate limiting configuration
RATELIMIT_ENABLE = True
RATELIMIT_VIEW = 'portfolio_api.views.rate_limit_response'

CORS_ALLOWED_ORIGINS = [
	"https://portfolio-frontend-*.herokuapp.com", # Wildcard
	"https://*.aouichou.me", 
	"https://portfolio-frontend-9fc822c2f19a.herokuapp.com",
	"https://portfolio-frontend.herokuapp.com",
	"https://portfolio-backend-dytv.onrender.com",
	"https://aouichou.me",
	"https://www.aouichou.me",
	"https://portfolio-backend.onrender.com",
	"https://api.aouichou.me",
]

CORS_ALLOW_HEADERS = [
	'accept',
	'accept-encoding',
	'authorization',
	'content-type',
	'dnt',
	'origin',
	'user-agent',
	'x-csrftoken',
	'x-requested-with',
]

CORS_EXPOSE_HEADERS = ['Content-Type', 'X-CSRFToken']
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False

ROOT_URLCONF = 'portfolio_api.urls'

TEMPLATES = [
	{
		'BACKEND': 'django.template.backends.django.DjangoTemplates',
		'DIRS': [],
		'APP_DIRS': True,
		'OPTIONS': {
			'context_processors': [
				'django.template.context_processors.debug',
				'django.template.context_processors.request',
				'django.contrib.auth.context_processors.auth',
				'django.contrib.messages.context_processors.messages',
			],
		},
	},
]

WSGI_APPLICATION = 'portfolio_api.wsgi.application'

APPEND_SLASH = True

# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases

DATABASES = {
	'default': dj_database_url.config(
		conn_max_age=600,
		conn_health_checks=True,
		default=os.getenv('DATABASE_URL', 'postgres://localhost')
	)
}

# DB settings for local development

# DATABASES = {
# 	'default': {
# 		'ENGINE': 'django.db.backends.postgresql',
# 		'NAME': os.getenv('DB_NAME'),
# 		'USER': os.getenv('DB_USER'),
# 		'PASSWORD': os.getenv('DB_PASS'),
# 		'HOST': os.getenv('DB_HOST'),
# 		'PORT': os.getenv('DB_PORT'),
# 	}
# }

if os.getenv('RENDER'):
	SECURE_SSL_REDIRECT = True
	SESSION_COOKIE_SECURE = True
	CSRF_COOKIE_SECURE = True

# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
	{
		'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
	},
	{
		'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
	},
	{
		'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
	},
	{
		'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
	},
]


# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CSRF_TRUSTED_ORIGINS = ['https://aouichou.me']


# Email Configuration for SMTP2GO
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'mail.smtp2go.com'
EMAIL_PORT = 587  # SMTP2GO recommends port 587 with TLS
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('SMTP_USER')
EMAIL_HOST_PASSWORD = os.environ.get('SMTP_PASSWORD')
DEFAULT_FROM_EMAIL = 'contact@aouichou.me'  # branded sender email
SERVER_EMAIL = 'system@aouichou.me'  # System notifications
ADMIN_EMAIL = os.getenv('CONTACT_RECIPIENT', 'your@email.com')

# Email validation settings
VERIFY_EMAIL_DOMAINS = True  # Set to False to skip domain verification
BLOCK_DISPOSABLE_EMAILS = True  # Set to False to allow disposable email addresses

LOGGING = {
	'version': 1,
	'disable_existing_loggers': False,
	'handlers': {
		'console': {
			'class': 'logging.StreamHandler',
		},
	},
	'root': {
		'handlers': ['console'],
		'level': 'DEBUG' if DEBUG else 'WARNING',
	},
}

# S3 settings
# DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY') 
AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME', 'portfolio-media')
AWS_S3_ENDPOINT_URL = os.getenv('AWS_S3_ENDPOINT_URL', 'https://fly.storage.tigris.dev')
AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=86400',
}
AWS_LOCATION = 'media'
AWS_DEFAULT_ACL = None
AWS_S3_REGION_NAME = 'auto'  # Must match bucket region
AWS_S3_ADDRESSING_STYLE = 'path'  # Use path-style instead of virtual-hosted style
AWS_QUERYSTRING_AUTH = False  # For signed URLs
AWS_S3_FILE_OVERWRITE = False
AWS_S3_SIGNATURE_VERSION = 's3v4'
AWS_S3_USE_SSL = True
AWS_S3_VERIFY = True

MEDIA_URL = os.getenv('MEDIA_URL', f'https://{AWS_STORAGE_BUCKET_NAME}.fly.storage.tigris.dev/media/')
DEFAULT_FILE_STORAGE = 'projects.storage.CustomS3Storage'


# Channel layers for WebSocket
ASGI_APPLICATION = 'portfolio_api.asgi.application'
CHANNEL_LAYERS = {
	'default': {
		## Use Redis in development
		# 'BACKEND': 'channels.layers.InMemoryChannelLayer',
		## Use Redis in production
		'BACKEND': 'channels_redis.core.RedisChannelLayer',
		'CONFIG': {
			'hosts': [os.environ.get('REDIS_URL', 'redis://localhost:6379')],
		}
	}
}

TERMINAL_SERVICE_URL = "wss://portfolio-terminal.fly.dev"
TERMINAL_SETTINGS = {
	'MAX_SESSION_DURATION': 900,  # 15 minutes
	'MAX_OUTPUT_LENGTH': 10000,   # 10KB per command
	'CONCURRENT_SESSIONS': 3,     # Max 3 sessions per IP
}

# Set Content Security Policy
CSP_DEFAULT_SRC = ["'self'"]
CSP_CONNECT_SRC = ["'self'", "wss://api.aouichou.me"]
CSP_SCRIPT_SRC = ["'self'", "'unsafe-inline'"]  # Consider stricter settings if possible