# tests/unit/test_sanitize_slug.py
"""Unit tests for sanitize_project_slug() security function."""

import os
import sys

import pytest
from fastapi import HTTPException
from main import ALLOWED_PROJECTS, sanitize_project_slug

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

# Stub heavy dependencies so we can import main without them installed
import unittest.mock as m

for mod in ['redis', 'pexpect', 'boto3', 'psutil', 'aiohttp']:
    if mod not in sys.modules:
        sys.modules[mod] = m.MagicMock()
os.environ.setdefault('REDIS_URL', 'redis://localhost:6379')

# ═════════════════════════════════════════════════════════════════════════════
# Valid slugs — must be accepted and returned lower-cased
# ═════════════════════════════════════════════════════════════════════════════

class TestValidSlugs:

    def test_minishell(self):
        assert sanitize_project_slug('minishell') == 'minishell'

    def test_push_swap(self):
        assert sanitize_project_slug('push_swap') == 'push_swap'

    def test_philosophers(self):
        assert sanitize_project_slug('philosophers') == 'philosophers'

    def test_minitalk(self):
        assert sanitize_project_slug('minitalk') == 'minitalk'

    def test_fdf(self):
        assert sanitize_project_slug('fdf') == 'fdf'

    def test_ft_irc(self):
        assert sanitize_project_slug('ft_irc') == 'ft_irc'

    def test_minirt(self):
        assert sanitize_project_slug('minirt') == 'minirt'

    def test_cub3d(self):
        assert sanitize_project_slug('cub3d') == 'cub3d'

    def test_ft_transcendence(self):
        assert sanitize_project_slug('ft_transcendence') == 'ft_transcendence'

    def test_strips_leading_whitespace(self):
        assert sanitize_project_slug('  minishell') == 'minishell'

    def test_strips_trailing_whitespace(self):
        assert sanitize_project_slug('minishell   ') == 'minishell'

    def test_uppercase_accepted_and_lowercased(self):
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

    def test_unknown_project_raises_403(self):
        with pytest.raises(HTTPException) as exc_info:
            sanitize_project_slug('unknown-project')
        assert exc_info.value.status_code == 403

    def test_admin_slug_raises_403(self):
        with pytest.raises(HTTPException) as exc_info:
            sanitize_project_slug('admin')
        assert exc_info.value.status_code == 403

    def test_etc_passwd_slug_raises_403_or_400(self):
        """Attempting to use /etc/passwd as slug should be caught (400 for format, 403 for whitelist)."""
        with pytest.raises(HTTPException):
            sanitize_project_slug('etc-passwd')

    def test_whitelist_is_complete(self):
        """Ensure all expected projects are in the whitelist."""
        expected = {
            'minishell', 'push_swap', 'philosophers', 'minitalk',
            'fdf', 'ft_irc', 'minirt', 'cub3d', 'ft_transcendence'
        }
        assert expected == ALLOWED_PROJECTS
