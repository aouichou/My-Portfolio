# portfolio_api/tests/test_fixture_demos_f405b.py
"""
F4-05b — contract tests for the Phase 5 prod fixture
(projects/fixtures/demos_f405b.json).

The fixture carries the four new demo projects (ft_ls, ft_select, ft_ping,
ft_linear_regression) for PROD insertion at the flip. Prod posture:
has_demo=False and demo_files_path=None on every row — demos stay OFF
until the zips are uploaded to R2 and Batman flips them via Django admin.
"""

import json
from pathlib import Path

import pytest
from django.core.management import call_command

from projects.models import Project

APP_DIR = Path(__file__).resolve().parent.parent / 'projects'
FIXTURE_PATH = APP_DIR / 'fixtures' / 'demos_f405b.json'

EXPECTED = {
    'ft-ls': 'make && ./ft_ls -la',
    'ft-select': 'make && ./ft_select README.md Makefile',
    'ft-ping': 'make && ./ft_ping --help',
    'ft-linear-regression': 'make && ./train 0.1 100000 0.000000001',
}


@pytest.fixture
def fixture_rows():
    with open(FIXTURE_PATH) as f:
        return json.load(f)


class TestFixtureFileContract:

    def test_fixture_exists_and_valid(self, fixture_rows):
        assert FIXTURE_PATH.is_file()
        assert isinstance(fixture_rows, list)
        assert len(fixture_rows) == 4

    def test_all_four_slugs_present(self, fixture_rows):
        slugs = {row['fields']['slug'] for row in fixture_rows}
        assert slugs == set(EXPECTED)

    def test_prod_posture_demo_off(self, fixture_rows):
        """Prod fixture ships with demos OFF (flip via admin after upload)."""
        for row in fixture_rows:
            f = row['fields']
            assert f['has_demo'] is False, f['slug']
            assert f['demo_files_path'] is None, f['slug']

    def test_school_type_ungraded_true_state(self, fixture_rows):
        """school rows; score None (peer eval pending — TRUE state)."""
        for row in fixture_rows:
            f = row['fields']
            assert f['project_type'] == 'school'
            assert f['score'] is None
            assert f['is_featured'] is False

    def test_demo_commands_nonempty_and_first_is_build(self, fixture_rows):
        for row in fixture_rows:
            f = row['fields']
            cmds = f['demo_commands']
            assert cmds, f['slug']
            assert cmds[0]['command'] == EXPECTED[f['slug']]
            for c in cmds:
                assert set(c) == {'label', 'command'}

    def test_timestamps_present(self, fixture_rows):
        """auto_now_add fields MUST ship in fixtures (LESSONS rule)."""
        for row in fixture_rows:
            f = row['fields']
            assert f['created_at'], f['slug']
            assert f['updated_at'], f['slug']

    def test_no_thumbnail_refs(self, fixture_rows):
        """Fresh installs have no media files — thumbnails null."""
        for row in fixture_rows:
            f = row['fields']
            assert f['thumbnail'] is None
            assert f['thumbnail_url'] is None


class TestFixtureLoaddata:

    def test_loads_on_clean_db(self, db, fixture_rows):
        call_command('loaddata', str(FIXTURE_PATH), verbosity=0)
        slugs = set(
            Project.objects.filter(
                slug__in=EXPECTED).values_list('slug', flat=True))
        assert slugs == set(EXPECTED)

    def test_no_slug_collisions_with_seed(self, db, fixture_rows):
        """Loading after seed_v2 must not collide (unique slug)."""
        call_command(
            'loaddata', str(APP_DIR / 'fixtures' / 'seed_v2.json'),
            verbosity=0)
        call_command('loaddata', str(FIXTURE_PATH), verbosity=0)
        assert Project.objects.count() == 16  # 12 seed + 4 demos
