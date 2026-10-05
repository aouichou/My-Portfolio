# tests/etl_cli_settings.py
"""Settings for subprocess CLI tests (F1-07): same as tests.test_settings but
the sqlite database lives in a FILE named by ETL_V2_TEST_DB so a separate
process can migrate it and assert exit codes. In-memory sqlite cannot cross
process boundaries."""
import os

from .test_settings import *  # noqa: F401,F403

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.environ.get('ETL_V2_TEST_DB', ':memory:'),
    }
}
