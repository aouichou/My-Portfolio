"""F4-05a — demo-zip pipeline self-test harness.

scripts/make_demo_zip.sh owns the exclusion + determinism contract for
served demo zips. Its `--check` mode builds a synthetic tree and asserts
both properties; this test pins that harness to the terminal suite (the
terminal service is the zip consumer) so CI runs it on every change to
either side.

Skips (visibly) where the harness cannot run: environments without
rsync (the dev container image) or without the repo-root script in the
checkout context (bind-mounted standalone service dirs).
"""
import pathlib
import shutil
import subprocess

import pytest

SCRIPT = pathlib.Path(__file__).resolve().parents[2] / 'scripts' / 'make_demo_zip.sh'


def test_make_demo_zip_self_check_passes():
    if not SCRIPT.exists():
        pytest.skip('scripts/make_demo_zip.sh not present in this checkout context')
    if shutil.which('rsync') is None:
        pytest.skip('rsync not installed here (exclusion filter needs it; CI runs it)')
    result = subprocess.run(
        ['bash', str(SCRIPT), '--check'],
        capture_output=True, text=True, timeout=180,
    )
    assert result.returncode == 0, (
        f'self-check failed:\n{result.stdout}\n{result.stderr}')
    assert 'determinism: PASS' in result.stdout
    assert 'exclusions: PASS' in result.stdout
    assert 'SELF-TEST OK' in result.stdout


def test_make_demo_zip_usage_rejects_bad_slug():
    if not SCRIPT.exists():
        pytest.skip('scripts/make_demo_zip.sh not present in this checkout context')
    if shutil.which('rsync') is None:
        pytest.skip('rsync not installed here (CI runs it)')
    result = subprocess.run(
        ['bash', str(SCRIPT), '/tmp', 'bad slug!'],
        capture_output=True, text=True, timeout=30,
    )
    assert result.returncode == 1
    assert 'slug must be' in result.stderr
