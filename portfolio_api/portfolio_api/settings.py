# portfolio_api/settings.py

import os
import secrets
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
load_dotenv(os.path.join(BASE_DIR, '..', '..', '.env'))

# Secret key must be set in environment variables.
#
# Fallback semantics (F2-07, per security review §5b): if SECRET_KEY is unset
# the process raises UNLESS DJANGO_ALLOW_BUILD=true (set only inside the
# Dockerfile for `collectstatic` at build time). So in any real deployment
# an unset key is a loud boot failure, never a silently-randomized one.
#
# FAIL-LOUD OPTION (documented, deliberately not taken — flip-runbook item):
# dropping the DJANGO_ALLOW_BUILD branch entirely would make builds fail too,
# but the build-time collectstatic genuinely needs a throwaway key (image
# builds have no runtime secrets) and the runtime guard above already fails
# closed. Revisit if the build ever gains secret access (then the escape
# hatch loses its reason to exist).
SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
	# Allow builds/static collection to proceed, but fail at runtime
	if os.getenv('DJANGO_ALLOW_BUILD', 'false').lower() != 'true':
		raise ValueError('SECRET_KEY environment variable must be set')
	# Build-time throwaway only: never used to sign anything that survives
	# into runtime (guest terminal JWTs are minted per-process at runtime).
	SECRET_KEY = secrets.token_urlsafe(64)
# SECURITY WARNING: don't run with debug turned on in production!
# Single source of truth: the DEBUG env var (docker-compose.dev sets it True).
DEBUG = os.getenv('DEBUG', 'False').lower() in ('true', '1', 't')
# Enable proxy header handling
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# ALLOWED_HOSTS: env override in development, explicit list otherwise.
# The two onrender.com entries are the FROZEN pre-rework Render deployment
# (prod until the Phase 5 flip lands `rework/v2` on `main`; RENDER=true env
# keeps serving there — see the TLS block below). FLIP-TIME CLEANUP: when
# the v2 topology is final, reduce to the real production host set and let
# env vars carry any platform-internal host.
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '').split(',') if os.getenv('ALLOWED_HOSTS') else [
	'api.aouichou.me',
	'www.aouichou.me',
	'portfolio-backend-dytv.onrender.com',  # Render service host (pre-flip prod)
	'portfolio-frontend.herokuapp.com',      # Heroku UI host (pre-flip prod)
]

# CSRF trusted origins -- authoritative list (previously defined 3x with
# conflicting values; the last-wins rule silently dropped all but one).
#
# CSRF matters only for the Django admin (session auth + form POSTs); the
# public API is CSRF-exempt by design. Same-origin admin (api.aouichou.me)
# passes without this list; the entries exist for cross-origin admin access.
CSRF_TRUSTED_ORIGINS = [
	'https://aouichou.me',
	'https://www.aouichou.me',
	'https://*.aouichou.me',
]
MEDIA_URL = os.environ.get('MEDIA_URL', '/media/')
# Container path (matches the Dockerfile's /app layout + entrypoint's
# prepopulated-media copy). Host-run tooling (tests, scripts) override this
# via tests/test_settings.py's tempdir — /app does not exist there.
MEDIA_ROOT = '/app/media'

# File storage — Django 6: the STORAGES dict is the ONLY recognized config
# (the legacy STATICFILES_STORAGE/DEFAULT_FILE_STORAGE settings were dead
# weight — nothing consumed them; the staticfiles machinery instantiates
# exclusively from STORAGES['staticfiles'], verified against Django 6.0
# in-container during F2-07). Deleted, not migrated: see the STATIC_URL note
# below for the whitenoise manifest-storage disposition.
# File Upload Settings
DATA_UPLOAD_MAX_MEMORY_SIZE = 104857600  # 100MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 104857600  # 100MB

# File storage configuration - use local storage in DEBUG mode, S3 in production
if DEBUG:
	STORAGES = {
		"default": {
			"BACKEND": "django.core.files.storage.FileSystemStorage",
		},
		"staticfiles": {
			"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
		},
	}
else:
	STORAGES = {
		"default": {
			"BACKEND": "projects.storage.CustomS3Storage",
		},
		"staticfiles": {
			"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
		},
	}

CACHES = {
	'default': {
		'BACKEND': 'django_redis.cache.RedisCache',
		'LOCATION': os.environ.get('REDIS_URL', 'redis://localhost:6379/1'),
		'OPTIONS': {
			'CLIENT_CLASS': 'django_redis.client.DefaultClient',
		}
	},
	# Rate-limit counters (security review N3): Redis, NOT LocMem — LocMem is
	# per-process, so N workers = N independent buckets and limits drift by
	# worker count. Tests override this to LocMem (tests/test_settings.py)
	# with RATELIMIT_ENABLE=False, so the suite never touches Redis.
	'rate_limit': {
		'BACKEND': 'django_redis.cache.RedisCache',
		'LOCATION': os.environ.get('REDIS_URL', 'redis://localhost:6379/2'),
		'OPTIONS': {
			'CLIENT_CLASS': 'django_redis.client.DefaultClient',
		},
	}
}

RATELIMIT_USE_CACHE = 'rate_limit'
RATELIMIT_ENABLE = True
RATELIMIT_FAIL_OPEN = False
# Per-client buckets behind the platform router (N3): REMOTE_ADDR is the
# router's IP there, collapsing all visitors into ONE bucket. The dotted
# path resolves to a callable (portfolio_api/ratelimit.py) because a bare
# 'HTTP_X_FORWARDED_FOR' meta key crashes with ValueError on multi-value
# XFF chains ('client, proxy') — django-ratelimit 4.1.0 does not split them.
RATELIMIT_IP_META_KEY = 'portfolio_api.ratelimit.client_ip'

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
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# Rate limiting configuration
RATELIMIT_VIEW = 'portfolio_api.views.rate_limit_response'

# CORS (contract v2 §4.4 — frozen posture: explicit allowlist, no
# CORS_ALLOW_ALL_ORIGINS, credentials on).
#
# NOTE on the herokuapp entries: the old (frozen `main`) UI serves from
# portfolio-frontend*.herokuapp.com and MUST keep API access until the
# Phase 5 flip. django-cors-headers 4.x matches CORS_ALLOWED_ORIGINS by
# exact scheme+netloc (no globbing), so BOTH the bare and the hashed
# hostname are required while both can serve traffic.
# FLIP-TIME CLEANUP: drop the two herokuapp entries (and the onrender
# backend entries below) once the v2 UI is the only consumer.
CORS_ALLOWED_ORIGINS = [
	# v2 consumer set (contract §4.4: site + www)
	"https://aouichou.me",
	"https://www.aouichou.me",
	# pre-flip prod consumers (old UI on Heroku + platform hosts)
	"https://portfolio-frontend.herokuapp.com",
	"https://portfolio-frontend-9fc822c2f19a.herokuapp.com",
	"https://portfolio-backend-dytv.onrender.com",
]
# Wildcard-patterned herokuapp dynos (review apps / renamed apps serving the
# old UI) — matched via regex since CORS_ALLOWED_ORIGINS is exact-match.
# FLIP-TIME CLEANUP: delete with the herokuapp entries above.
CORS_ALLOWED_ORIGIN_REGEXES = [
	r"^https://portfolio-frontend-[a-z0-9]+\.herokuapp\.com$",
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

# Production TLS posture (security review §5b: was RENDER-gated).
#
# Gating on the platform env var means a prod deploy that simply forgets to
# set it silently loses TLS redirect + secure cookies. The correct
# discriminator is DEBUG: these hold whenever DEBUG is off. The RENDER env
# var IS set on the deployed service (render.yaml sets RENDER=true), so
# behavior on current prod is identical — this makes the guarantee
# deployment-config-independent instead of opt-in.
if not DEBUG:
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
# NOTE (F2-07): the staticfiles backend in STORAGES above is the plain
# StaticFilesStorage; whitenoise's CompressedManifestStaticFilesStorage
# belonged to the legacy STATICFILES_STORAGE setting, which Django 6 never
# read (STORAGES is canonical). Serving compressed+hashed assets is
# whitenoise runmode work; re-wiring it intentionally via STORAGES is
# deferred to the flip-time deploy pass (the current prod serves static
# via the platform, not via this container's manifest storage).

# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# Email Configuration for SMTP2GO
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'mail.smtp2go.com'
EMAIL_PORT = 2525  # Alternative port for cloud platforms that block 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('SMTP_USER')
EMAIL_HOST_PASSWORD = os.environ.get('SMTP_PASSWORD')
EMAIL_TIMEOUT = 10  # 10 second timeout for SMTP connections
DEFAULT_FROM_EMAIL = 'contact@aouichou.me'  # branded sender email
SERVER_EMAIL = 'system@aouichou.me'  # System notifications
ADMIN_EMAIL = os.getenv('CONTACT_RECIPIENT', 'your@email.com')

# Email validation settings
# VERIFY_EMAIL_DOMAINS gates the contact-form MX check (projects/views.py);
# DNS checks can hang, so it is off by default and only ever enabled via
# env/test override. The disposable-domain list is not configurable — it
# lives inline in ContactSubmissionView.validate_domain (a 4-entry list,
# checked before any DNS call; see the F2-06 test proving determinism).
VERIFY_EMAIL_DOMAINS = os.getenv('VERIFY_EMAIL_DOMAINS', 'False').lower() in ('true', '1', 't')

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

# Cloudflare R2 Storage settings (S3-compatible).
# Consumed by projects/storage.py's CustomS3Storage (the STORAGES['default']
# backend when DEBUG is off). The legacy DEFAULT_FILE_STORAGE line that
# pointed at storages' S3Boto3Storage was dead weight in Django 6 —
# STORAGES above is the only recognized config (verified F2-07) — and
# pointed at the WRONG class anyway (CustomS3Storage subclasses it to fix
# R2 hostname/ACL quirks).
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME', 'portfolio-bucket')
AWS_S3_REGION_NAME = os.getenv('AWS_S3_REGION_NAME', 'auto')  # R2 uses 'auto'
AWS_S3_ADDRESSING_STYLE = 'path'  # Required for R2
AWS_S3_ENDPOINT_URL = os.getenv('AWS_S3_ENDPOINT_URL')  # R2 endpoint from env
AWS_QUERYSTRING_AUTH = False  # Public URLs via custom domain
AWS_S3_FILE_OVERWRITE = False
AWS_S3_SIGNATURE_VERSION = 's3v4'
AWS_S3_USE_SSL = True
AWS_S3_VERIFY = True
AWS_S3_CUSTOM_DOMAIN = os.getenv('AWS_S3_CUSTOM_DOMAIN', 'media.aouichou.me')  # R2 custom domain

# Override MEDIA_URL to use R2 custom domain
if not DEBUG:
	MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/'


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

# Shared secret for the Django -> terminal-service WebSocket hop. When set
# (env: TERMINAL_PROXY_SECRET), TerminalConsumer sends it as the
# X-Proxy-Secret header on the upstream dial and the terminal service
# rejects connections without it. Production should always set it; unset in
# development is tolerated by the terminal service when it runs in DEBUG.
TERMINAL_PROXY_SECRET = os.environ.get('TERMINAL_PROXY_SECRET')