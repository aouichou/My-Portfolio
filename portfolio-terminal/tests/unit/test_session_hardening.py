# tests/unit/test_session_hardening.py
"""
F4-03 — shared-container session hardening (decision D8 = "A+").

Three controls, all env-tunable and unit/integration tested here:
1. KERNEL rlimits per session — applied via pexpect preexec_fn between fork
   and exec; the whole session tree inherits them. Verified against a REAL
   bash child by reading back /proc/<pid>/limits (Linux-only tests skip on
   other platforms) and by hitting RLIMIT_FSIZE writing an oversized file.
2. Per-session private scratch dir — HOME + TMPDIR of the bash child point
   at /tmp/terminal-sessions/session-<uuid>/, deleted on disconnect.
3. Guaranteed post-session cleanup — the shared project dir is restored to
   its .session_manifest baseline; a boot sweep backstops crash orphans.

The module-level constants (TERMINAL_RLIMIT_*, PROJECTS_BASE_DIR,
SESSION_SCRATCH_ROOT) are read at import time — every test that varies
them patches the DERIVED main-module values, not the environment.
"""

import os
import resource
import sys
import unittest.mock as m

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
os.environ.setdefault('DEBUG', 'True')
for mod in ['redis', 'boto3', 'psutil', 'aiohttp']:
    if mod not in sys.modules:
        sys.modules[mod] = m.MagicMock()

# Live-child tests need the REAL pexpect (venv ships it — requirements.txt).
# Some sibling test modules stub sys.modules['pexpect'] with a MagicMock
# before this file imports; drop any stub and import the genuine package
# (an ImportError → None → live-child tests skip, wire tests still run).
if isinstance(sys.modules.get('pexpect'), m.MagicMock):
	del sys.modules['pexpect']
try:
	import pexpect as _real_pexpect
except ImportError:  # pragma: no cover — venv/CI always install pexpect
	_real_pexpect = None

import main

IS_LINUX = sys.platform.startswith('linux')
_CAN_PROBE_RLIMITS = (
	IS_LINUX
	and os.path.exists('/proc/self/limits')
	and _real_pexpect is not None
)

pytest_marker_linux = pytest.mark.skipif(
    not _CAN_PROBE_RLIMITS,
    reason='live rlimit probes need Linux /proc/<pid>/limits')

class TestSessionRlimits:

	def test_default_rlimit_values_are_sane(self):
		limits = dict(main.session_rlimits())
		assert limits[resource.RLIMIT_CPU] == (120, 120)
		assert limits[resource.RLIMIT_AS] == (512 * 1024 * 1024,) * 2
		# NPROC default is OFF (omitted): RLIMIT_NPROC is accounted per-UID
		# across the whole host kernel — finite values break innocent forks
		# on shared-uid hosts (live-proven on the dev stack). Finite only on
		# dedicated-uid hosts (D9 target) via TERMINAL_RLIMIT_NPROC.
		assert resource.RLIMIT_NPROC not in limits
		assert limits[resource.RLIMIT_FSIZE] == (20 * 1024 * 1024,) * 2
		# Core dumps are always disabled, unconditionally
		assert limits[resource.RLIMIT_CORE] == (0, 0)

	def test_env_tuning_is_honored(self):
		"""TERMINAL_RLIMIT_* env vars drive the spawn-time limits."""
		assert main._env_int('TERMINAL_RLIMIT_CPU', 120) == 120
		assert main._env_int('TERMINAL_RLIMIT_CPU', 120) == 120  # stable
		with m.patch.dict(os.environ, {'TERMINAL_RLIMIT_CPU': '5'}):
			assert main._env_int('TERMINAL_RLIMIT_CPU', 120) == 5
		with m.patch.dict(os.environ, {'TERMINAL_RLIMIT_CPU': 'banana'}):
			assert main._env_int('TERMINAL_RLIMIT_CPU', 120) == 120
		with m.patch.dict(os.environ, {'TERMINAL_RLIMIT_CPU': '-3'}):
			assert main._env_int('TERMINAL_RLIMIT_CPU', 120) == 120

	def test_zero_means_unlimited(self):
		"""0 DISABLES a dimension — it is omitted entirely, never set to
		RLIM_INFINITY: setrlimit cannot raise past the inherited hard limit
		(WSL pins a finite NPROC hard cap — live-proven to fail the spawn),
		and valgrind-class demos that reserve huge address space need AS
		off the same way."""
		with m.patch.object(main, 'TERMINAL_RLIMIT_AS', 0):
			resources = [res for res, _ in main.session_rlimits()]
			assert resource.RLIMIT_AS not in resources
			# The always-on dimensions survive
			assert resource.RLIMIT_CPU in resources
			assert resource.RLIMIT_CORE in resources
			assert resource.RLIMIT_FSIZE in resources
	@staticmethod
	def _read_proc_limits(pid):
		"""Parse /proc/<pid>/limits → {label: soft_value}. 'unlimited'
		becomes resource.RLIM_INFINITY; rows where soft != hard are skipped
		(our preexec_fn always sets them equal)."""
		limits = {}
		with open(f'/proc/{pid}/limits', encoding='utf-8') as fh:
			next(fh)  # header
			for line in fh:
				words = line.split()
				# label runs to the 'Soft Limit' column: everything before
				# the first unlimited/integer token.
				for idx, word in enumerate(words):
					if word == 'unlimited' or word.lstrip('-').isdigit():
						break
				label = ' '.join(words[:idx])
				soft, hard = words[idx], words[idx + 1]
				if soft != hard:
					continue  # not one of ours
				value = (resource.RLIM_INFINITY if soft == 'unlimited'
						 else int(soft))
				limits[label] = value
		return limits

	@pytest_marker_linux
	def test_rlimits_apply_to_real_bash_child(self):
		"""The core claim: preexec_fn lands the limits on the actual bash
		child — read back from /proc/<pid>/limits (kernel truth)."""
		child = _real_pexpect.spawn(
			'/bin/bash', ['--norc', '--noprofile'], encoding='utf-8',
			timeout=10, preexec_fn=main.apply_session_rlimits)
		try:
			limits = self._read_proc_limits(child.pid)
			assert limits['Max cpu time'] == main.TERMINAL_RLIMIT_CPU
			assert limits['Max address space'] == main.TERMINAL_RLIMIT_AS
			# NPROC omitted by default → /proc shows the INHERITED limit
			# (varies by host: unlimited on most, finite on WSL) — the
			# enforceable dimensions are what we assert.
			assert limits['Max file size'] == main.TERMINAL_RLIMIT_FSIZE
			assert limits['Max core file size'] == 0
		finally:
			child.terminate(force=True)
			child.wait()  # reap: zombies count against RLIMIT_NPROC

	@pytest_marker_linux
	def test_bash_child_hits_fsize_writing_big_file(self, tmp_path):
		"""Adversarial: exceed RLIMIT_FSIZE inside the session and observe
		the KERNEL enforce it. NPROC is left untouched in this probe — it is
		per-UID COLLECTIVE (see session_rlimits docstring), and raising it
		past the host's own hard limit would fail the spawn. Proof = the
		file stops growing at EXACTLY the limit (kernel truth, independent
		of how the tool reacts to SIGXFSZ: head reports 'File too large'
		and exits 1; a naive tool dies with signal 25/exit 153)."""
		home = str(tmp_path / 'fsize-home')
		os.makedirs(home, exist_ok=True)
		def fsize_only():
			resource.setrlimit(resource.RLIMIT_FSIZE,
							   (main.TERMINAL_RLIMIT_FSIZE,) * 2)
			resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
		# head/dd are deliberately not on the command allowlist — this test
		# targets the KERNEL layer, which exists precisely because the
		# validator never sees what a compiled demo binary does.
		script = (
			'head -c 31457280 /dev/zero > "$HOME/limit_probe.bin"; '
			'echo "exit=$?"'
		)
		child = _real_pexpect.spawn(
			'/bin/bash', ['--norc', '--noprofile', '-c', script],
			encoding='utf-8', timeout=30,
			env={'HOME': home, 'PATH': '/usr/bin:/bin'},
			preexec_fn=fsize_only)
		try:
			child.expect(r'exit=\d+')
			probe = os.path.join(home, 'limit_probe.bin')
			# The write was cut off at exactly the kernel limit…
			assert os.path.getsize(probe) == main.TERMINAL_RLIMIT_FSIZE, (
				f'FSIZE not enforced: {os.path.getsize(probe)} bytes written')
			# …and the writer was told so (SIGXFSZ outcome visible either way)
			output = child.before + (child.match.group(0) or '')
			assert ('File too large' in output or 'exit=1' in output
					or int(child.match.group(0).split('=')[1]) > 128), (
				f'writer did not observe the limit: {output!r}')
		finally:
			child.terminate(force=True)
			child.wait()
	@pytest_marker_linux
	def test_nproc_limit_blocks_session_forks(self):
		"""Behavioral NPROC proof (the env knob works on dedicated-uid hosts):
		with the limit at 1, bash cannot fork /bin/true (RLIMIT_NPROC is
		per-UID host-kernel-wide: any uid running the test already has ≥1
		process, so the kernel refuses every fork — 'fork: retry' / EAGAIN).
		Default stays 0 because shared-uid hosts break with finite values."""
		def nproc_one():
			resource.setrlimit(resource.RLIMIT_NPROC, (1, 1))
			resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
		# Two commands: bash exec-optimizes a LONE -c command (no fork at
		# all); a second command forces a real fork, which NPROC must block.
		child = _real_pexpect.spawn(
			'/bin/bash', ['--norc', '--noprofile', '-c', '/bin/true; /bin/true'],
			encoding='utf-8', timeout=30,
			env={'PATH': '/usr/bin:/bin'}, preexec_fn=nproc_one)
		try:
			child.expect(_real_pexpect.EOF)
			output = child.before
			assert ('fork: retry' in output
					or 'Resource temporarily unavailable' in output
					or 'resource temporarily unavailable' in output.lower()), (
				f'NPROC=1 did not block the fork: {output!r}')
		finally:
			child.terminate(force=True)
			child.wait()

	def test_preexec_fn_failure_fails_spawn_loudly(self):
		"""ptyprocess propagates preexec_fn exceptions to the parent — a
		failed setrlimit can never yield an UNLIMITED session."""
		with pytest.raises(ZeroDivisionError):
			_real_pexpect.spawn(
				'/bin/bash', ['--norc', '--noprofile'], encoding='utf-8',
				timeout=5, preexec_fn=lambda: 1 / 0)

	def test_spawn_call_wires_preexec_fn(self):
		"""Wire check: the endpoint passes apply_session_rlimits."""
		import inspect
		src = inspect.getsource(main.terminal_endpoint)
		assert 'preexec_fn=apply_session_rlimits' in src


# ═════════════════════════════════════════════════════════════════════════════
# Real-FS sandbox: the module-level PROJECTS_BASE_DIR / SESSION_SCRATCH_ROOT
# are patched onto main so every helper under test writes inside tmp_path.

@pytest.fixture
def fs_sandbox(tmp_path):
	"""Real-filesystem sandbox: a projects base + scratch root, patched onto
	the main module (helpers read the module globals at call time)."""
	projects = tmp_path / 'projects'
	scratch_root = tmp_path / 'scratch-root'
	projects.mkdir()
	scratch_root.mkdir()
	with m.patch.object(main, 'PROJECTS_BASE_DIR', str(projects)), \
			m.patch.object(main, 'SESSION_SCRATCH_ROOT', str(scratch_root)):
		yield {'projects': projects, 'scratch_root': scratch_root}


# ═════════════════════════════════════════════════════════════════════════════
# 2. Per-session scratch dirs
# ═════════════════════════════════════════════════════════════════════════════

class TestSessionScratch:

	def test_scratch_dir_created_per_session_with_correct_env(self, fs_sandbox):
		"""Each session gets its OWN dir; build_child_env binds it as HOME
		and TMPDIR for that bash."""
		sid_a, sid_b = 'aaaaaaaa-0000-0000-0000-000000000001', \
			'bbbbbbbb-0000-0000-0000-000000000002'
		dir_a = main.create_session_scratch(sid_a)
		dir_b = main.create_session_scratch(sid_b)
		assert dir_a != dir_b
		assert dir_a.startswith(str(fs_sandbox['scratch_root']))
		assert os.path.isdir(dir_a) and os.path.isdir(dir_b)

		# Pin LANG away: build_child_env inherits the service LANG when
		# locale-shaped — the allowlist-comparison below must not depend on
		# the host's locale.
		with m.patch.dict(os.environ, {'LANG': ''}):
			env = main.build_child_env(home=dir_a, tmpdir=dir_a)
		assert env['HOME'] == dir_a
		assert env['TMPDIR'] == dir_a
		# The rest of the allowlist is untouched by the overrides
		for key, value in main.CHILD_ENV_ALLOWLIST.items():
			if key != 'HOME':
				assert env[key] == value
		for key in env:
			assert not key.startswith('AWS'), f'AWS var leaked: {key}'

	def test_scratch_dir_is_private_mode(self, fs_sandbox):
		"""0o700: other sessions' users cannot read this scratch dir."""
		dir_a = main.create_session_scratch('c0000000-0000-0000-0000-000000000003')
		mode = os.stat(dir_a).st_mode & 0o777
		assert mode == 0o700

	def test_scratch_removal_deletes_contents(self, fs_sandbox):
		sid = 'd0000000-0000-0000-0000-000000000004'
		dir_a = main.create_session_scratch(sid)
		inner = os.path.join(dir_a, 'nested', 'deeper')
		os.makedirs(inner)
		with open(os.path.join(inner, 'secret.txt'), 'w') as fh:
			fh.write('visitor data')
		assert main.remove_session_scratch(dir_a) is True
		assert not os.path.exists(dir_a)

	def test_scratch_removal_missing_dir_is_ok(self, fs_sandbox):
		assert main.remove_session_scratch(
			os.path.join(str(fs_sandbox['scratch_root']), 'never-existed')) is True

	def test_scratch_removal_failure_is_swallowed_and_logged(self, fs_sandbox):
		"""Best-effort BY DESIGN (runs in the session finally path) — failure
		returns False and logs, never raises into finally."""
		with m.patch.object(main.shutil, 'rmtree',
							side_effect=OSError('permission denied')):
			assert main.remove_session_scratch('/tmp/whatever') is False


# ═════════════════════════════════════════════════════════════════════════════
# Baseline fixture
# ═════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def manifested_project(fs_sandbox):
	"""A project dir in post-download state: src files + manifest written."""
	pdir = fs_sandbox['projects'] / 'minishell'
	(pdir / 'src').mkdir(parents=True)
	(pdir / 'src' / 'main.c').write_text('int main(){}')
	pdir.joinpath('Makefile').write_text('all:\n\tgcc src/main.c\n')
	main.snapshot_project_dir(str(pdir), force=True)
	return pdir


# ═════════════════════════════════════════════════════════════════════════════
# 3. Manifest + guaranteed cleanup
# ═════════════════════════════════════════════════════════════════════════════

class TestProjectManifest:

	def test_snapshot_writes_sorted_entries_excluding_preserved(self, manifested_project):
		manifest = os.path.join(str(manifested_project), main.SESSION_MANIFEST_NAME)
		assert os.path.exists(manifest)
		import json
		with open(manifest, encoding='utf-8') as fh:
			payload = json.load(fh)
		assert payload['version'] == 1
		assert payload['entries'] == ['Makefile', 'src', 'src/main.c']
		assert main.SESSION_MANIFEST_NAME not in payload['entries']

	def test_snapshot_is_not_refreshed_per_session(self, manifested_project):
		"""The baseline must NEVER bless the previous visitor's leftovers:
		without force, an existing manifest is kept as-is."""
		# visitor drops a file AFTER the baseline was written
		(manifested_project / 'visitor_leftover.txt').write_text('evil')
		wrote = main.snapshot_project_dir(str(manifested_project), force=False)
		assert wrote is False
		entries = main._load_manifest(str(manifested_project))
		assert 'visitor_leftover.txt' not in entries

	def test_snapshot_self_heals_legacy_dir_without_manifest(self, fs_sandbox):
		"""A pre-F4-03 project dir (no manifest) gets baselined on first
		session — its current state becomes the baseline."""
		pdir = fs_sandbox['projects'] / 'legacy'
		pdir.mkdir()
		(pdir / 'README.md').write_text('hello')
		assert main.snapshot_project_dir(str(pdir), force=False) is True
		assert 'README.md' in main._load_manifest(str(pdir))


class TestRestoreProjectDir:

	def test_visitor_files_and_dirs_swept(self, manifested_project):
		"""Batman's ask: files created by a visitor — anywhere in the shared
		dir — are erased."""
		(manifested_project / 'visitor_file.txt').write_text('x')
		dropped = manifested_project / 'visitor_dir'
		dropped.mkdir()
		(dropped / 'payload.sh').write_text('#!/bin/sh\n')
		nested = manifested_project / 'src' / 'visitor_nested.c'
		nested.write_text('int leaked;')

		removed = main.restore_project_dir(str(manifested_project))

		assert removed == 4  # file + dir + nested file + nested dir
		assert not (manifested_project / 'visitor_file.txt').exists()
		assert not dropped.exists()
		assert not nested.exists()
		# baseline survives
		assert (manifested_project / 'Makefile').exists()
		assert (manifested_project / 'src' / 'main.c').exists()

	def test_manifest_and_cache_marker_survive(self, manifested_project):
		"""The sweep must never delete its own baseline or the download
		cache marker (they are not in the manifest entries)."""
		cache_marker = manifested_project / main.CACHE_MARKER_NAME
		cache_marker.write_text(str(main.time.time()))
		main.restore_project_dir(str(manifested_project))
		assert cache_marker.exists()
		assert (manifested_project / main.SESSION_MANIFEST_NAME).exists()

	def test_no_manifest_no_sweep(self, fs_sandbox):
		"""Fail-safe: a dir that was never baselined is left alone."""
		pdir = fs_sandbox['projects'] / 'never-baselined'
		pdir.mkdir()
		(pdir / 'file.txt').write_text('data')
		assert main.restore_project_dir(str(pdir)) == 0
		assert (pdir / 'file.txt').exists()

	def test_corrupt_manifest_never_wipes(self, manifested_project):
		"""Fail-safe: an unreadable/corrupt manifest must NOT cause a
		directory wipe — sweep refuses to run without a provable baseline."""
		manifest_path = manifested_project / main.SESSION_MANIFEST_NAME
		base_files = set(os.listdir(manifested_project))
		manifest_path.write_text('{ this is not json')
		assert main.restore_project_dir(str(manifested_project)) == 0
		assert set(os.listdir(manifested_project)) == base_files
		manifest_path.write_text('{"entries": "not-a-list"}')
		assert main.restore_project_dir(str(manifested_project)) == 0
		assert set(os.listdir(manifested_project)) == base_files

	def test_content_edits_not_reverted(self, manifested_project):
		"""Documented residual: the manifest is path-based — content edits
		to manifested files are NOT reverted (re-download is the F4-05
		option to revisit)."""
		target = manifested_project / 'Makefile'
		target.write_text('VANDALIZED')
		main.restore_project_dir(str(manifested_project))
		assert target.read_text() == 'VANDALIZED'

	def test_restore_on_empty_project_dir_noop(self, fs_sandbox):
		"""A downloaded-but-empty project dir (manifest of zero entries)
		sweeps everything and keeps only manifest + cache marker."""
		pdir = fs_sandbox['projects'] / 'emptydemo'
		pdir.mkdir()
		main.snapshot_project_dir(str(pdir), force=True)
		(pdir / 'dropped.txt').write_text('x')
		assert main.restore_project_dir(str(pdir)) == 1
		assert sorted(os.listdir(pdir)) == [main.SESSION_MANIFEST_NAME]


class TestBootSweep:

	def test_boot_sweep_restores_projects_and_clears_scratch(self, fs_sandbox):
		"""Container restart after a crash: orphaned visitor files swept,
		orphaned scratch dirs deleted."""
		pdir = fs_sandbox['projects'] / 'minishell'
		(pdir / 'src').mkdir(parents=True)
		(pdir / 'src' / 'main.c').write_text('int main(){}')
		main.snapshot_project_dir(str(pdir), force=True)
		# orphan state: visitor file in project dir + stale scratch dir
		(pdir / 'orphan.txt').write_text('left by crash')
		stale = main.create_session_scratch('e0000000-0000-0000-0000-000000000005')

		stats = main.sweep_orphaned_projects()

		assert stats == {'projects': 1, 'entries_removed': 1,
						 'scratch_dirs_removed': 1}
		assert not (pdir / 'orphan.txt').exists()
		assert (pdir / 'src' / 'main.c').exists()
		assert not os.path.exists(stale)

	def test_boot_sweep_clean_when_no_orphans(self, manifested_project):
		stats = main.sweep_orphaned_projects()
		assert stats['entries_removed'] == 0
		assert stats['scratch_dirs_removed'] == 0


# ═════════════════════════════════════════════════════════════════════════════
# 4. Endpoint-level wiring (stubbed spawn, real FS via fs_sandbox)
# ═════════════════════════════════════════════════════════════════════════════

class _NeverRaisedEOF(Exception):
	pass


class StubChild:
	def __init__(self):
		self.writes = []
		self.spawn_env = None
		self.spawn_preexec = None

	def setwinsize(self, rows, cols):
		pass

	def write(self, data):
		self.writes.append(data)

	def expect(self, patterns, **kwargs):
		return 0

	def read_nonblocking(self, size=1024, timeout=0.1):
		raise TimeoutError('no output')

	def terminate(self):
		pass


def make_spawn_patch(child):
	def fake_spawn(*args, **kwargs):
		child.spawn_env = kwargs.get('env')
		child.spawn_preexec = kwargs.get('preexec_fn')
		return child
	return fake_spawn


class TestEndpointWiring:
	"""The full session lifecycle against the REAL filesystem: connect →
	manifest snapshot → scratch dir → spawn with per-session env+rlimits →
	disconnect → scratch gone + project dir restored."""

	async def test_full_session_lifecycle_cleanup(self, fs_sandbox):
		import asyncio

		from tests.integration.test_websocket_hardening import (
		    StubWebSocket,
		    run_endpoint,
		)

		child = StubChild()
		pdir = fs_sandbox['projects'] / 'minishell'
		pdir.mkdir()
		pdir.joinpath('Makefile').write_text('all:\n')
		saved = (main.demo_whitelist.slugs, main.demo_whitelist.last_sync)
		main.demo_whitelist.slugs = {'minishell'}
		main.active_terminals.clear()
		try:
			with m.patch.object(main, 'spawn', make_spawn_patch(child)), \
					m.patch.object(main, 'download_project_files', return_value=True), \
					m.patch.object(main, 'EOF', _NeverRaisedEOF):
				ws = StubWebSocket(incoming=[
					'{"input": "x"}',  # one frame, then…
					'not json',        # …force the protocol close (fast exit)
				])
				await run_endpoint(ws)
				assert ws.closed == 1002
		finally:
			main.active_terminals.clear()
			main.demo_whitelist.slugs, main.demo_whitelist.last_sync = saved

		# spawn-time wiring (real FS answers exists/listdir — no global patch)
		spawn_home = child.spawn_env['HOME']
		assert spawn_home.startswith(str(fs_sandbox['scratch_root']))
		assert child.spawn_env['TMPDIR'] == spawn_home
		assert child.spawn_preexec is main.apply_session_rlimits
		# a manifest was baselined for this fresh dir
		assert (pdir / main.SESSION_MANIFEST_NAME).exists()

		# post-session: scratch dir erased + visitor files swept
		assert not os.path.exists(spawn_home)
		visitor_file = pdir / 'dropped_by_session.txt'
		visitor_file.write_text('leftover')  # simulate what bash wrote
		assert main.restore_project_dir(str(pdir)) == 1
		assert not visitor_file.exists()
		assert (pdir / main.SESSION_MANIFEST_NAME).exists()
