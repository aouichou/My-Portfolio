# tests/security/test_seccomp_profile.py
"""F4-06 — structural drift guard for the default-DENY seccomp profile.

The profile (portfolio-terminal/seccomp-profile.json) is security-critical
config applied at container start; a regression to default-ALLOW or an
undocumented/over-broad edit must never slip in silently. These tests pin:

1. defaultAction is SCMP_ACT_ERRNO (deny by default — the whole point of
   the F4-06 conversion; the pre-F4-06 profile was default-ALLOW with ~24
   deny entries).
2. Every group carries SCMP_ACT_ALLOW and a "why" justification — anything
   unexplained does not ship (project rule).
3. The empirically-required syscall set (traced across all four demos +
   the service itself, 2026-10-09) is present.
4. The deny-by-omission crown jewels stay ABSENT: namespace escape,
   ptrace/process_vm_* (cross-session memory reads — the LSAN finding),
   module loading, bpf, mount-tree manipulation, time tampering.
5. The profile is referenced by BOTH compose files at the canonical path
   and the root duplicate stays deleted (F4-07 consolidation).
"""

import json
import os
from pathlib import Path

import pytest

SERVICE_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = SERVICE_DIR.parents[0]
PROFILE = SERVICE_DIR / 'seccomp-profile.json'


@pytest.fixture(scope='module')
def profile():
    with open(PROFILE, encoding='utf-8') as fh:
        return json.load(fh)


@pytest.fixture(scope='module')
def allowed(profile):
    names = set()
    for group in profile['syscalls']:
        if group['action'] == 'SCMP_ACT_ALLOW':
            names.update(group['names'])
    return names


class TestDefaultDeny:

    def test_default_action_is_errno(self, profile):
        assert profile['defaultAction'] == 'SCMP_ACT_ERRNO'

    def test_errno_return_is_eperm(self, profile):
        # errno 1 = EPERM ("operation not permitted") — the conventional
        # denial; anything else (e.g. ENOSYS) changes failure semantics.
        assert profile.get('defaultErrnoRet') == 1

    def test_arch_is_x86_64(self, profile):
        assert 'SCMP_ARCH_X86_64' in profile['architectures']

    def test_no_explicit_deny_groups_needed(self, profile):
        """Under default-DENY, a deny GROUP would be redundant; its presence
        suggests someone reverted to the old default-ALLOW shape."""
        actions = {group['action'] for group in profile['syscalls']}
        assert actions == {'SCMP_ACT_ALLOW'}, (
            f'unexpected actions in profile: {actions}')


class TestDocumentation:

    def test_every_group_has_a_why(self, profile):
        for group in profile['syscalls']:
            assert isinstance(group.get('why'), str) and group['why'].strip(), (
                f'group without justification: {group["names"][:3]}…')

    def test_every_group_has_syscalls(self, profile):
        for group in profile['syscalls']:
            assert group['names'], 'empty syscall group'

    def test_size_cap(self, allowed):
        """~70 documented entries was the design target; group-level
        deduplication landed at ~200 NAMES across 22 justified groups.
        The hard ceiling guards against unbounded accretion: the profile
        must stay reviewable by a human in one sitting."""
        assert len(allowed) <= 230, f'allow list grew to {len(allowed)}'


class TestEmpiricallyRequired:

    REQUIRED = {
        # container runtime (runc) bootstrap — without these, NOTHING runs
        'statx', 'setgroups', 'setgid', 'setuid', 'capset',
        # file I/O + process lifecycle (every trace)
        'read', 'write', 'openat', 'close', 'execve', 'exit_group', 'wait4',
        # glibc ELF startup (every trace)
        'arch_prctl', 'set_tid_address', 'set_robust_list', 'rseq', 'brk',
        'mmap', 'mprotect', 'munmap',
        # interactive shell + job control
        'clone', 'vfork', 'setpgid', 'rt_sigaction', 'rt_sigreturn',
        'ioctl', 'kill',
        # service runtime (uvicorn/asyncio/pexpect)
        'epoll_create1', 'epoll_ctl', 'epoll_wait', 'socket', 'bind',
        'accept4', 'futex', 'getrandom', 'clock_gettime',
        # demo specifics: ls-family + ft_ls ACL, ASAN
        'getdents64', 'lgetxattr', 'llistxattr', 'sigaltstack',
    }

    def test_required_set_present(self, allowed):
        missing = self.REQUIRED - allowed
        assert not missing, f'empirically-required syscalls missing: {sorted(missing)}'


class TestDeniedByOmission:

    """The crown jewels of default-DENY: these MUST stay absent. Each name
    here was allowed-by-default in the old profile's inverse (default-ALLOW)
    and is exactly what the F4-06 conversion exists to block."""

    FORBIDDEN = {
        # namespace / container escape
        'unshare', 'setns', 'mount', 'umount2', 'pivot_root', 'chroot',
        # cross-process memory access (the LSAN finding: one visitor's
        # binary must never read another session's memory)
        'ptrace', 'process_vm_readv', 'process_vm_writev',
        # kernel manipulation
        'bpf', 'perf_event_open', 'userfaultfd', 'kexec_load',
        'kexec_file_load', 'reboot', 'init_module', 'finit_module',
        'delete_module', 'iopl', 'ioperm',
        # keyring (host key leakage vector)
        'keyctl', 'add_key', 'request_key',
        # time tampering
        'clock_settime', 'settimeofday', 'stime', 'adjtimex',
        # ABI subversion
        'personality',
        # io_uring: bypasses the fd-based syscall surface audited above
        'io_uring_setup', 'io_uring_enter', 'io_uring_register',
    }

    def test_forbidden_set_absent(self, allowed):
        present = self.FORBIDDEN & allowed
        assert not present, f'security-critical syscalls ALLOWED: {sorted(present)}'


class TestComposeWiring:
    """F4-07: single canonical copy, both composes reference it, the root
    duplicate stays deleted."""

    def test_dev_compose_mounts_profile(self):
        text = (REPO_ROOT / 'docker-compose.dev.yml').read_text(encoding='utf-8')
        assert 'seccomp:./portfolio-terminal/seccomp-profile.json' in text

    def test_prod_compose_mounts_profile(self):
        text = (REPO_ROOT / 'docker-compose.yml').read_text(encoding='utf-8')
        assert 'seccomp:./portfolio-terminal/seccomp-profile.json' in text

    def test_root_duplicate_stays_deleted(self):
        assert not (REPO_ROOT / 'seccomp-profile.json').exists(), (
            'root seccomp-profile.json resurrected — canonical copy is '
            'portfolio-terminal/seccomp-profile.json (F4-07 consolidation)')


class TestChildEnvAsanFix:
    """F4-06 companion: LSAN's stop-the-world scan needs process_vm_readv
    (denied BY DESIGN) — the child env disables only the leak scan via
    ASAN_OPTIONS=detect_leaks=0. Overflow detection is unaffected."""

    def test_asan_options_in_child_allowlist(self):
        import sys
        sys.path.insert(0, str(SERVICE_DIR))
        os.environ.setdefault('DEBUG', 'True')
        import main  # noqa: PLC0415 — profile constant under test
        assert main.CHILD_ENV_ALLOWLIST.get('ASAN_OPTIONS') == 'detect_leaks=0'
