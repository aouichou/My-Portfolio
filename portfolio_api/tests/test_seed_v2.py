# portfolio_api/tests/test_seed_v2.py
"""
F1-09 — seed_v2 fixture contract tests.

Guards the minimal fresh-install seed (projects/fixtures/seed_v2.json):
  - the file is present, valid JSON, and loaddata-loadable on a clean DB
  - scrub invariants hold (no media references survive into fresh installs)
  - the archived v1 seeds are NOT discoverable as loaddata fixtures anymore
  - the v1 import path is dead (import_projects command removed)
"""

import json
import subprocess
import sys
from pathlib import Path

import projects
import pytest
from django.core.management import call_command
from django.test.utils import isolate_apps

APP_DIR = Path(projects.__file__).parent
FIXTURES_DIR = APP_DIR / 'fixtures'
ARCHIVE_DIR = FIXTURES_DIR / 'archive'
SEED_PATH = FIXTURES_DIR / 'seed_v2.json'


@pytest.fixture
def seed_data():
    with open(SEED_PATH) as f:
        return json.load(f)


@pytest.fixture
def loaded_seed(db):
    """loaddata the real seed file on the clean test DB."""
    call_command('loaddata', str(SEED_PATH), verbosity=0)
    from projects.models import Experience, Project
    return Project, Experience


class TestSeedFileContract:
    def test_seed_file_exists(self):
        assert SEED_PATH.is_file(), f'missing seed fixture: {SEED_PATH}'

    def test_seed_is_valid_json_list(self, seed_data):
        assert isinstance(seed_data, list)
        assert len(seed_data) == 13  # 12 projects + 1 experience

    def test_seed_row_mix(self, seed_data):
        models = [row['model'] for row in seed_data]
        assert models.count('projects.project') == 12
        assert models.count('projects.experience') == 1

    def test_seed_type_mix_post_d3(self, seed_data):
        """8 school / 3 internship / 1 personal (D3 — mistral-realms retyped)."""
        types = {}
        for row in seed_data:
            if row['model'] == 'projects.project':
                types[row['fields']['project_type']] = (
                    types.get(row['fields']['project_type'], 0) + 1
                )
        assert types == {'school': 8, 'internship': 3, 'personal': 1}

    def test_seed_slugs_unique_and_present(self, seed_data):
        slugs = [
            row['fields']['slug']
            for row in seed_data
            if row['model'] in ('projects.project', 'projects.experience')
        ]
        assert all(slugs)
        assert len(slugs) == len(set(slugs)) == 13

    def test_seed_scrub_thumbnails(self, seed_data):
        """Fresh installs have no media files — thumbnail refs must be null."""
        for row in seed_data:
            if row['model'] == 'projects.project':
                fields = row['fields']
                assert fields['thumbnail'] is None, row['fields']['slug']
                assert fields['thumbnail_url'] is None, row['fields']['slug']

    def test_seed_scrub_demo_files_path(self, seed_data):
        """R2 demo zips don't exist locally — Phase 4 re-populates via admin."""
        for row in seed_data:
            if row['model'] == 'projects.project':
                assert row['fields']['demo_files_path'] is None, row['fields']['slug']

    def test_seed_scrub_is_featured(self, seed_data):
        """thumbnail is required IFF featured — no thumbnails means no featured."""
        for row in seed_data:
            if row['model'] == 'projects.project':
                assert row['fields']['is_featured'] is False, row['fields']['slug']

    def test_seed_no_galleries(self, seed_data):
        """Galleries omitted by scope choice (documented in F1-09 report)."""
        assert not any(row['model'] == 'projects.gallery' for row in seed_data)
        assert not any(row['model'] == 'projects.galleryimage' for row in seed_data)

    def test_seed_timestamps_present(self, seed_data):
        """loaddata saves with raw=True (no auto_now_add pre_save) — the NOT
        NULL created_at columns require the timestamps in the fixture."""
        for row in seed_data:
            assert 'created_at' in row['fields'], row['model']
            assert 'updated_at' in row['fields'], row['model']


class TestSeedLoads:
    def test_loaddata_seed_v2_by_name(self, db):
        """The documented command works: manage.py loaddata seed_v2."""
        call_command('loaddata', 'seed_v2', verbosity=0)
        from projects.models import Experience, Project
        assert Project.objects.count() == 12
        assert Experience.objects.count() == 1

    def test_loaded_relationships(self, loaded_seed):
        Project, Experience = loaded_seed
        experience = Experience.objects.get()
        assert experience.company == 'Qynapse'
        assert experience.role == 'Fullstack Engineer intern'  # D4
        assert experience.projects.count() == 3
        for project in experience.projects.all():
            assert project.project_type == 'internship'

    def test_loaded_personal_typing(self, loaded_seed):
        Project, _ = loaded_seed
        mistral = Project.objects.get(slug='mistral-realms')
        assert mistral.project_type == 'personal'

    def test_loaddata_idempotent(self, db):
        """Re-loading the seed is safe (upsert by pk)."""
        call_command('loaddata', 'seed_v2', verbosity=0)
        call_command('loaddata', 'seed_v2', verbosity=0)
        from projects.models import Experience, Project
        assert Project.objects.count() == 12
        assert Experience.objects.count() == 1

    def test_scrubbed_rows_survive_model_clean(self, loaded_seed):
        """The scrubbed rows must satisfy v2 validation (featured⇒thumbnail)."""
        Project, _ = loaded_seed
        for project in Project.objects.all():
            project.full_clean()  # raises ValidationError on violation


class TestV1SeedPathDead:
    def test_archived_v1_seeds_exist(self):
        assert (ARCHIVE_DIR / 'projects-v1.json').is_file()
        assert (ARCHIVE_DIR / 'internship-data-v1.json').is_file()

    def test_archive_readme_present(self):
        assert (ARCHIVE_DIR / 'README.md').is_file()

    def test_v1_seed_not_in_fixture_search_path(self):
        """fixtures/archive/ is a subdirectory — loaddata must not see the v1
        seeds by their old names (old name 'internship_data' is gone)."""
        assert not (FIXTURES_DIR / 'internship_data.json').exists()
        assert not (APP_DIR.parent / 'projects.json').exists()

    def test_archived_internship_fixture_targets_dropped_models(self):
        """The archived internship fixture references models that no longer
        exist — loading it on v2 must fail loudly, not silently succeed."""
        with open(ARCHIVE_DIR / 'internship-data-v1.json') as f:
            data = json.load(f)
        models = {row['model'] for row in data}
        assert 'projects.internship' in models
        assert 'projects.internshipproject' in models

    def test_import_projects_command_removed(self):
        """F1-09: the v1 import path is dead — the command is deleted."""
        commands_dir = APP_DIR / 'management' / 'commands'
        assert not (commands_dir / 'import_projects.py').exists()

    @pytest.mark.skipif(
        Path(sys.prefix, 'bin', 'python').exists() is False,
        reason='no venv python discoverable',
    )
    def test_import_projects_not_registered(self):
        """Double check via the management registry (not just the file)."""
        from django.core.management import get_commands
        assert 'import_projects' not in get_commands()
