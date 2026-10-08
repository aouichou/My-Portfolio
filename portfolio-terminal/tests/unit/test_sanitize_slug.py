# tests/unit/test_sanitize_slug.py
"""Unit tests for sanitize_project_slug() security function."""

import os
import sys

import pytest
from fastapi import HTTPException
from main import sanitize_project_slug

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

# Stub heavy dependencies so we can import main without them installed
import unittest.mock as m

for mod in ['redis', 'pexpect', 'boto3', 'psutil', 'aiohttp']:
    if mod not in sys.modules:
        sys.modules[mod] = m.MagicMock()
os.environ.setdefault('REDIS_URL', 'redis://localhost:6379')

import main


@pytest.fixture
def demo_set():
    """Seed the in-memory whitelist snapshot with a known slug set.

    F4-01: the whitelist is DB-driven (synced from the API's has_demo feed);
    tests seed the in-memory snapshot directly instead of the old 9-slug
    hardcode. sanitize_project_slug itself never touches the network.
    """
    saved = (main.demo_whitelist.slugs, main.demo_whitelist.last_sync)
    main.demo_whitelist.slugs = {'minishell', 'push_swap', 'philosophers'}
    try:
        yield main.demo_whitelist.slugs
    finally:
        main.demo_whitelist.slugs, main.demo_whitelist.last_sync = saved

# ═════════════════════════════════════════════════════════════════════════════
# Valid slugs — must be accepted and returned lower-cased
# ═════════════════════════════════════════════════════════════════════════════

class TestValidSlugs:

    def test_minishell(self, demo_set):
        assert sanitize_project_slug('minishell') == 'minishell'

    def test_push_swap(self, demo_set):
        assert sanitize_project_slug('push_swap') == 'push_swap'

    def test_philosophers(self, demo_set):
        assert sanitize_project_slug('philosophers') == 'philosophers'

    def test_strips_leading_whitespace(self, demo_set):
        assert sanitize_project_slug('  minishell') == 'minishell'

    def test_strips_trailing_whitespace(self, demo_set):
        assert sanitize_project_slug('minishell   ') == 'minishell'

    def test_uppercase_accepted_and_lowercased(self, demo_set):
        assert sanitize_project_slug('MINISHELL') == 'minishell'


# ═════════════════════════════════════════════════════════════════════════════
# Empty / blank slugs
# ═════════════════════════════════════════════════════════════════════════════

class TestEmptySlugs:

    def test_empty_string_raises_400(self):
        with pytest.raises(HTTPException) as exc_info:
            sanitize_project_slug('')
        assert exc_info.value.status_code == 400

    def test_whitespace_only_raises_400(self):
        with pytest.raises(HTTPException) as exc_info:
            sanitize_project_slug('   ')
        assert exc_info.value.status_code == 400


# ═════════════════════════════════════════════════════════════════════════════
# Invalid format (bad characters)
# ═════════════════════════════════════════════════════════════════════════════

class TestInvalidFormat:

    def test_path_traversal_raises_400(self):
        with pytest.raises(HTTPException) as exc_info:
            sanitize_project_slug('../etc/passwd')
        assert exc_info.value.status_code == 400

    def test_slash_raises_400(self):
        with pytest.raises(HTTPException) as exc_info:
            sanitize_project_slug('mini/shell')
        assert exc_info.value.status_code == 400

    def test_backslash_raises_400(self):
        with pytest.raises(HTTPException) as exc_info:
            sanitize_project_slug('mini\\shell')
        assert exc_info.value.status_code == 400

    def test_space_in_middle_raises_400(self):
        with pytest.raises(HTTPException) as exc_info:
            sanitize_project_slug('mini shell')
        assert exc_info.value.status_code == 400

    def test_semicolon_raises_400(self):
        with pytest.raises(HTTPException) as exc_info:
            sanitize_project_slug('minishell;id')
        assert exc_info.value.status_code == 400

    def test_dollar_raises_400(self):
        with pytest.raises(HTTPException) as exc_info:
            sanitize_project_slug('minishell$(id)')
        assert exc_info.value.status_code == 400

    def test_null_byte_raises_400(self):
        with pytest.raises(HTTPException) as exc_info:
            sanitize_project_slug('minishell\x00')
        assert exc_info.value.status_code == 400


# ═════════════════════════════════════════════════════════════════════════════
# Unknown (not whitelisted) slugs
# ═════════════════════════════════════════════════════════════════════════════

class TestNotWhitelisted:

    def test_unknown_project_raises_403(self, demo_set):
        with pytest.raises(HTTPException) as exc_info:
            sanitize_project_slug('unknown-project')
        assert exc_info.value.status_code == 403

    def test_admin_slug_raises_403(self, demo_set):
        with pytest.raises(HTTPException) as exc_info:
            sanitize_project_slug('admin')
        assert exc_info.value.status_code == 403

    def test_etc_passwd_slug_raises_403_or_400(self, demo_set):
        """Attempting to use /etc/passwd as slug should be caught (400 for format, 403 for whitelist)."""
        with pytest.raises(HTTPException):
            sanitize_project_slug('etc-passwd')

    def test_not_enabled_message_mentions_enablement(self, demo_set):
        """F4-01: the 403 detail tells the visitor the demo may simply not
        be enabled yet (admin toggle), not that the project doesn't exist."""
        with pytest.raises(HTTPException) as exc_info:
            sanitize_project_slug('unknown-project')
        assert 'may not be enabled yet' in exc_info.value.detail

    def test_empty_snapshot_rejects_everything(self):
        """Fail-closed: with no successful sync yet, nothing is enabled."""
        saved = (main.demo_whitelist.slugs, main.demo_whitelist.last_sync)
        main.demo_whitelist.slugs = set()
        try:
            with pytest.raises(HTTPException) as exc_info:
                sanitize_project_slug('minishell')
            assert exc_info.value.status_code == 403
        finally:
            main.demo_whitelist.slugs, main.demo_whitelist.last_sync = saved

    def test_slug_format_checked_before_whitelist(self):
        """A malformed slug never reaches the whitelist check (400 wins)."""
        with pytest.raises(HTTPException) as exc_info:
            sanitize_project_slug('not enabled!')
        assert exc_info.value.status_code == 400
