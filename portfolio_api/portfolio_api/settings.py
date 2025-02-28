# portfolio_api/settings.py

from pathlib import Path
import os
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
load_dotenv(os.path.join(BASE_DIR, '..', '..', '.env'))

SECRET_KEY = os.getenv('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False
# Enable proxy header handling
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'

ALLOWED_HOSTS = [
    'aouichou.me',
    'www.aouichou.me',
    'backend-service',  # Kubernetes service name
    'backend-service.default.svc.cluster.local'  # Full cluster DNS
	'nginx-service',  # Kubernetes service name
	'nginx-service.default.svc.cluster.local'  # Full cluster DNS
]
# Possibly also:
CSRF_TRUSTED_ORIGINS = ['https://aouichou.me', 'https://www.aouichou.me']
MEDIA_URL = '/media/'
MEDIA_ROOT = '/app/media'

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
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
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
	'corsheaders.middleware.CorsMiddleware',
	'django_ratelimit.middleware.RatelimitMiddleware',
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
	"https://aouichou.me",
    "https://www.aouichou.me",
]

CORS_ALLOW_CREDENTIALS = True

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


# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases

DATABASES = {
    'default': {
        # 'ENGINE': 'django.db.backends.postgresql',
        # 'NAME': os.getenv('DB_NAME'),
        # 'USER': os.getenv('DB_USER'),
        # 'PASSWORD': os.getenv('DB_PASSWORD'),
        # 'HOST': os.getenv('DB_HOST', 'postgres'),
        # 'PORT': os.getenv('DB_PORT', '5432'),
        # 'CONN_MAX_AGE': 300,
        # 'OPTIONS': {
        #     'connect_timeout': 5,
        # }
		
		# local settings
		'ENGINE': 'django.db.backends.postgresql',
		'NAME': 'portfolio',
		'USER': 'amine',
		'PASSWORD': 'uZ1-kK_WlFZNRb1cS40W',
		'HOST': 'localhost',
		'PORT': '5432',
		'CONN_MAX_AGE': 300,
		'OPTIONS': {
			'connect_timeout': 5,
		}
    }
}


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

STATIC_URL = 'static/'

# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CSRF_TRUSTED_ORIGINS = ['https://aouichou.me']


# Email settings
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.eu.mailgun.org'
EMAIL_PORT = 465
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('AZURE_EMAIL_USER')
EMAIL_HOST_PASSWORD = os.getenv('AZURE_EMAIL_KEY')
CONTACT_RECIPIENT = os.getenv('CONTACT_RECIPIENT', 'your@email.com')

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