# tests/test_settings.py
# Overrides for test environment — loaded via DJANGO_SETTINGS_MODULE
import os

# Provide SECRET_KEY before portfolio_api.settings is imported
os.environ.setdefault('SECRET_KEY', 'django-insecure-test-key-for-testing-only-do-not-use-in-prod')

from portfolio_api.settings import *  # noqa: F401, F403, E402

# ── Database ─────────────────────────────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# ── Caching / Rate-limiting ───────────────────────────────────────────────────
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}
RATELIMIT_ENABLE = False
RATELIMIT_FAIL_OPEN = True

# ── Email ─────────────────────────────────────────────────────────────────────
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# ── Storage — use local FS so tests don't need S3 credentials ─────────────────
# The prod settings hardcode MEDIA_ROOT='/app/media' (a container path);
# on a host run that path is unwritable, so tests point it at a temp dir.
import tempfile as _tempfile

MEDIA_ROOT = _tempfile.mkdtemp(prefix='portfolio-test-media-')

STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
    },
}

# ── Channels — in-memory so no Redis required ─────────────────────────────────
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    }
}

# ── Misc tweaks ───────────────────────────────────────────────────────────────
DEBUG = True
ALLOWED_HOSTS = ['*']
VERIFY_EMAIL_DOMAINS = False
