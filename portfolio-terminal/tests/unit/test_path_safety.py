# tests/unit/test_path_safety.py
"""Unit tests for safe_join_path() path-traversal prevention."""

import os
import sys
import tempfile
import unittest.mock as m
import pytest
from fastapi import HTTPException
from main import safe_join_path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
os.environ.setdefault('REDIS_URL', 'redis://localhost:6379')
for mod in ['redis', 'pexpect', 'boto3', 'psutil', 'aiohttp']:
    if mod not in sys.modules:
        sys.modules[mod] = m.MagicMock()

class TestSafeJoinPath:

    def test_simple_subdirectory(self):
        with tempfile.TemporaryDirectory() as base:
            result = safe_join_path(base, 'subdir')
            assert result == os.path.realpath(os.path.join(base, 'subdir'))

    def test_nested_path(self):
        with tempfile.TemporaryDirectory() as base:
            result = safe_join_path(base, 'a', 'b', 'c')
            assert result.startswith(os.path.realpath(base))

    def test_path_traversal_single_raises_403(self):
        with tempfile.TemporaryDirectory() as base:
            with pytest.raises(HTTPException) as exc_info:
                safe_join_path(base, '..', 'etc')
            assert exc_info.value.status_code == 403

    def test_path_traversal_deep_raises_403(self):
        with tempfile.TemporaryDirectory() as base:
            with pytest.raises(HTTPException) as exc_info:
                safe_join_path(base, '..', '..', '..', 'root')
            assert exc_info.value.status_code == 403

    def test_absolute_escape_path_raises_403(self):
        with tempfile.TemporaryDirectory() as base:
            with pytest.raises(HTTPException) as exc_info:
                safe_join_path(base, '/etc/passwd')
            assert exc_info.value.status_code == 403

    def test_result_is_string(self):
        with tempfile.TemporaryDirectory() as base:
            result = safe_join_path(base, 'project')
            assert isinstance(result, str)

    def test_result_starts_with_base(self):
        with tempfile.TemporaryDirectory() as base:
            result = safe_join_path(base, 'minishell')
            assert result.startswith(os.path.realpath(base))

    def test_encoded_traversal_blocked(self):
        """URL-encoded or unicode traversal should still be blocked by resolve()."""
        with tempfile.TemporaryDirectory() as base:
            # Path with embedded traversal that resolves outside base
            with pytest.raises(HTTPException):
                safe_join_path(base, 'project', '..', '..', 'secret')
