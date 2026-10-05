# tests/test_etl_v2.py
"""
F1-07 — ETL test suite: the etl_v2 command against the frozen fixture.

SPEC: docs/designs/2026-10-05-schema-v2-field-map.md (Annex A) §2/§3.4/§5 +
F1-04 decision values (master plan v2.2). Same style as test_schema_v2.py.

The fixture (projects/fixtures/stale_internship_content.json) is the ETL's
ONLY source of stale content — these tests reconstruct the exact pre-ETL
state from its `project_rows` section (the live dump state: flat tech_stack,
dict stats/demo_commands/code_steps/code_snippets, v1 diagram columns,
fabricated scores, mistral-realms typed school), run the command's three
modes, and pin the rescue outcome exactly.

Coverage:
  - unit: every coercion helper (type-sniff branches, map §5.2)
  - dry-run: full plan printed, ZERO writes
  - apply: rescue + canonical sweep + D3/D4 + pollution cleanup
  - idempotency: second apply = no-op (map §5.8)
  - verify: green post-apply; red + non-zero exit on violation
  - orphan/orphan-slug detection halts (map §5.8 — never silently skip)
  - verify-only semantics: post-migrator admin edits survive apply
"""

import json
import os
import subprocess
import sys
from datetime import date
from pathlib import Path
from unittest.mock import patch

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from projects.management.commands.etl_v2 import (
    EXPERIENCE_ROLE,
    FIXTURE_PATH,
    to_badge_list,
    to_code_snippets,
    to_code_steps,
    to_demo_commands,
    to_diagrams_from_ip,
    to_diagrams_from_v1,
    to_doc_list,
    to_impact_list,
    to_label_value,
    to_tech_list,
)
from projects.models import Experience, Project

API_DIR = Path(__file__).resolve().parents[1]

# Dump-verified identity of the frozen data (G3-baked counts)
INTERNSHIP_SLUGS = (
    'clinical-analytics-platform',
    'keycloak-integration-library',
    'patient-monitoring-module',
)
PERSONAL_SLUG = 'mistral-realms'

# The v1-shaped project_rows keys that map onto live Project columns
_PROJECT_ROW_FIELDS = {
    'title', 'slug', 'description', 'project_type', 'is_featured', 'score',
    'readme', 'tech_stack', 'features', 'challenges', 'lessons', 'live_url',
    'code_url', 'video_url', 'thumbnail', 'thumbnail_url', 'stats', 'badges',
    'impact_metrics', 'role_description', 'demo_commands', 'demo_files_path',
    'code_steps', 'code_snippets',
}


def load_fixture() -> dict:
    with open(FIXTURE_PATH, encoding='utf-8') as fh:
        return json.load(fh)


@pytest.fixture
def stale_env(db):
    """Reconstruct the exact pre-ETL live state from the fixture's
    `project_rows` (dump state) — the state a fresh G3 restore + 0011/0012
    leaves behind. NULL JSON values materialize as [] exactly as the 0011
    NOT NULL alters did on the real database (dump school rows held NULLs;
    Django's AlterField backfilled the column default)."""
    fixture = load_fixture()
    for row in fixture['project_rows']:
        kwargs = {k: v for k, v in row.items() if k in _PROJECT_ROW_FIELDS}
        for json_field in ('tech_stack', 'features', 'stats', 'badges',
                           'impact_metrics', 'demo_commands', 'code_steps',
                           'code_snippets'):
            if kwargs.get(json_field) is None:
                kwargs[json_field] = []
        Project.objects.create(**kwargs)
    return fixture


# ── coercion helpers (map §3.4 canonical shapes — every type-sniff branch) ───

class TestCoercionHelpers:

    def test_to_label_value_humanizes_dict_keys(self):
        assert to_label_value({'test_files': '55'}) == [
            {'label': 'Test Files', 'value': '55'}
        ]

    def test_to_tech_list_flat_strings(self):
        assert to_tech_list(['C', 'pthread']) == [
            {'name': 'C'}, {'name': 'pthread'}
        ]

    def test_to_tech_list_rich_objects_tolerated(self):
        assert to_tech_list([{'name': 'C', 'category': 'language'}]) == [
            {'name': 'C', 'category': 'language'}
        ]

    def test_to_tech_list_empty(self):
        assert to_tech_list(None) == []
        assert to_tech_list([]) == []

    def test_to_label_value_list_tolerated(self):
        assert to_label_value([{'label': 'L', 'value': 'V'}]) == [
            {'label': 'L', 'value': 'V'}
        ]

    def test_to_impact_list_short_values_kept(self):
        result = to_impact_list({'security': '15+ prevented'})
        assert result == [{'label': 'Security', 'value': '15+ prevented'}]

    def test_to_impact_list_long_sentence_becomes_description(self):
        sentence = 'x' * 200
        result = to_impact_list({'testing': sentence})
        assert result[0]['description'] == sentence
        assert result[0]['value'] == ''

    def test_to_badge_list_strips_color(self):
        assert to_badge_list([{'text': 'Zero Trust', 'color': 'blue'}]) == [
            {'text': 'Zero Trust'}
        ]

    def test_to_demo_commands_dict(self):
        assert to_demo_commands({'run': './philo 5'}) == [
            {'label': 'Run', 'command': './philo 5'}
        ]

    def test_to_code_steps_numeric_keys_ordered(self):
        steps = {'3': 'c', '1': 'a', '2': 'b'}
        assert to_code_steps(steps) == ['a', 'b', 'c']

    def test_to_code_steps_legacy_zero_wrapper_unwrapped(self):
        steps = {'0': {'1': 'a', '2': 'b'}}
        assert to_code_steps(steps) == ['a', 'b']

    def test_to_code_snippets_dict_of_strings_inflated(self):
        result = to_code_snippets({'main_monitoring': 'void *f(void){}'})
        assert result == [{
            'code': 'void *f(void){}',
            'title': 'Main Monitoring',
            'description': 'Implementation of main monitoring',
            'language': 'c',
        }]

    def test_to_code_snippets_dict_of_objects_kept_without_explanation(self):
        src = {'k': {'code': 'x', 'title': 'T', 'description': 'd',
                     'language': 'python', 'explanation': 'e'}}
        result = to_code_snippets(src)
        assert result[0]['title'] == 'T'
        assert result[0]['language'] == 'python'
        assert 'explanation' not in result[0]  # not in §3.4 canonical shape

    def test_to_code_snippets_array_of_objects_normalized(self):
        src = [{'title': 'T', 'language': 'python', 'description': 'd'}]
        result = to_code_snippets(src)
        assert result == [{
            'title': 'T', 'description': 'd', 'language': 'python', 'code': ''
        }]

    def test_to_doc_list_strips_icon(self):
        src = [{'icon': '...', 'title': '...', 'category': '...',
                'description': '...'}]
        result = to_doc_list(src)
        assert result == [{'title': '...', 'description': '...',
                           'category': '...'}]

    def test_to_diagrams_from_v1(self):
        result = to_diagrams_from_v1('graph TD; A-->B', 'mermaid')
        assert result == [{
            'title': 'Architecture', 'type': 'mermaid',
            'content': 'graph TD; A-->B', 'description': '',
        }]

    def test_to_diagrams_from_v1_empty(self):
        assert to_diagrams_from_v1('', 'mermaid') == []
        assert to_diagrams_from_v1(None, None) == []

    def test_to_diagrams_from_ip_restores_full_list(self):
        src = [
            {'title': 'A', 'diagram': 'g1', 'description': 'd1'},
            {'title': 'B', 'diagram': 'g2'},  # no description
        ]
        assert to_diagrams_from_ip(src) == [
            {'title': 'A', 'type': 'mermaid', 'content': 'g1',
             'description': 'd1'},
            {'title': 'B', 'type': 'mermaid', 'content': 'g2',
             'description': ''},
        ]


# ── fixture contract ─────────────────────────────────────────────────────────

class TestFixtureContract:

    def test_fixture_exists(self):
        assert FIXTURE_PATH.is_file(), (
            f'fixture missing: {FIXTURE_PATH} — regenerate via '
            f'scripts/extract_stale_fixture.sh'
        )

    def test_fixture_holds_the_frozen_counts(self):
        fixture = load_fixture()
        assert len(fixture['internship']) == 1
        assert len(fixture['internshipprojects']) == 3
        assert len(fixture['project_rows']) == 12

    def test_fixture_internshipproject_slugs_match_unified(self):
        fixture = load_fixture()
        ip_slugs = {r['slug'] for r in fixture['internshipprojects']}
        unified = {r['slug'] for r in fixture['project_rows']}
        assert ip_slugs <= unified  # every stale slug has a unified counterpart
        assert ip_slugs == set(INTERNSHIP_SLUGS)

    def test_fixture_meta_provenance(self):
        meta = load_fixture()['_meta']
        assert meta['source_dump'] == 'neon-pre-rework-20261002.dump'
        assert len(meta['source_dump_sha256']) == 64
        assert meta['row_counts'] == {
            'internship': 1, 'internshipproject': 3, 'project': 12,
        }

    def test_fixture_project_rows_are_v1_shaped(self):
        """The dump state: flat tech_stack, dict stats, v1 diagram columns —
        the type-sniff premises of the ETL (map §5.2)."""
        row = next(r for r in load_fixture()['project_rows']
                   if r['slug'] == 'philosophers')
        assert all(isinstance(t, str) for t in row['tech_stack'])
        assert isinstance(row['demo_commands'], dict)
        assert isinstance(row['code_steps'], dict)
        assert isinstance(row['code_snippets'], dict)
        assert row['diagram_type'] == 'mermaid'
        assert row['architecture_diagram']


# ── --dry-run: plan printed, zero writes ─────────────────────────────────────

@pytest.mark.django_db
class TestDryRun:

    def test_dry_run_writes_nothing(self, stale_env, capsys):
        call_command('etl_v2', '--dry-run')
        out = capsys.readouterr().out
        assert 'DRY RUN' in out
        assert Project.objects.count() == 12
        assert Experience.objects.count() == 0  # nothing created
        p = Project.objects.get(slug='philosophers')
        src = next(r for r in stale_env['project_rows']
                   if r['slug'] == 'philosophers')
        assert p.tech_stack == src['tech_stack']  # untouched
        assert p.score == 95

    def test_dry_run_prints_the_plan(self, stale_env, capsys):
        call_command('etl_v2', '--dry-run')
        out = capsys.readouterr().out
        for marker in ('Experience (1:1 rescue', 'Projects (12 rows)',
                       'Counts', 'DRY RUN — nothing was written'):
            assert marker in out, f'plan missing marker: {marker!r}'
        assert 'mistral-realms' in out  # D3 retype in the plan
        assert 'create Experience' in out
        assert 'score' in out

    def test_default_mode_is_dry_run(self, stale_env, capsys):
        call_command('etl_v2')
        out = capsys.readouterr().out
        assert 'DRY RUN' in out
        assert Experience.objects.count() == 0


# ── --apply: rescue + sweep + decisions ──────────────────────────────────────

@pytest.mark.django_db
class TestApply:

    def test_apply_creates_the_experience_row(self, stale_env):
        call_command('etl_v2', '--apply')
        exp = Experience.objects.get()
        src = stale_env['internship'][0]
        assert exp.company == src['company'] == 'Qynapse'
        assert exp.role == EXPERIENCE_ROLE  # D4
        assert exp.role != src['role']  # stale 'Fullstack Engineer' replaced
        assert exp.slug == 'qynapse-healthcare'
        assert exp.subtitle == src['subtitle']
        assert exp.overview == src['overview']
        assert exp.start_date == date(2025, 5, 12)
        assert exp.end_date == date(2025, 11, 11)
        assert exp.stats == to_label_value(src['stats'])
        assert exp.technologies == to_tech_list(src['technologies'])
        assert exp.impact_metrics == to_impact_list(src['impact_metrics'])
        assert exp.code_samples == src['code_samples']
        assert exp.documentation == to_doc_list(src['documentation'])
        assert exp.architecture_description == src['architecture_description']
        assert exp.architecture_diagrams[0]['content'] == src['architecture_diagram']
        assert exp.architecture_diagrams[0]['title'] == 'Zero Trust Architecture'

    def test_apply_rescues_internship_project_fields(self, stale_env):
        call_command('etl_v2', '--apply')
        ip = {r['slug']: r for r in stale_env['internshipprojects']}
        exp = Experience.objects.get()
        for slug in INTERNSHIP_SLUGS:
            p = Project.objects.get(slug=slug)
            src = ip[slug]
            assert p.architecture_description == (src['architecture_description'] or None)
            assert p.architecture_diagrams == to_diagrams_from_ip(
                src['architecture_diagrams'])
            assert p.related_documentation == to_doc_list(
                src['related_documentation'])
            assert p.order == src['order']
            # thumbnail is verify-only: the live re-upload (projects/…) wins
            # over the stale IP path (internship/projects/…, files absent)
            unified_src = next(r for r in stale_env['project_rows']
                               if r['slug'] == slug)
            thumb_name = p.thumbnail.name if p.thumbnail else None
            assert thumb_name == unified_src['thumbnail']
            assert p.experience == exp
            assert p.created_at.isoformat().startswith(src['created_at'][:19])

    def test_apply_nulls_fabricated_scores_and_challenges(self, stale_env):
        call_command('etl_v2', '--apply')
        for slug in INTERNSHIP_SLUGS:
            p = Project.objects.get(slug=slug)
            assert p.score is None
            assert p.challenges is None

    def test_apply_retypes_mistral_realms_personal(self, stale_env):
        call_command('etl_v2', '--apply')
        p = Project.objects.get(slug=PERSONAL_SLUG)
        assert p.project_type == 'personal'
        assert p.score == 0  # school-style score preserved (not fabricated)

    def test_apply_sweeps_canonical_shapes_on_all_rows(self, stale_env):
        call_command('etl_v2', '--apply')
        for p in Project.objects.all():
            assert all(isinstance(t, dict) and 'name' in t for t in p.tech_stack)
            assert all(set(b) == {'text'} for b in p.badges)
            assert all(set(s) == {'label', 'value'} for s in p.stats)
            assert all({'label', 'value'} <= set(m) for m in p.impact_metrics)
            assert all(set(c) == {'label', 'command'} for c in p.demo_commands)
            assert all(isinstance(s, str) for s in p.code_steps)
            assert all('code' in o for o in p.code_snippets)
            assert all('title' in d and 'icon' not in d
                       for d in p.related_documentation)

    def test_apply_converts_school_v1_architecture(self, stale_env):
        call_command('etl_v2', '--apply')
        src = next(r for r in stale_env['project_rows']
                   if r['slug'] == 'philosophers')
        p = Project.objects.get(slug='philosophers')
        assert p.architecture_diagrams == to_diagrams_from_v1(
            src['architecture_diagram'], src['diagram_type'])

    def test_apply_nulls_unverifiable_demo_paths(self, stale_env):
        call_command('etl_v2', '--apply')
        manifest = set(stale_env['demo_files_manifest'])
        for p in Project.objects.all():
            if p.demo_files_path is not None:
                assert p.demo_files_path in manifest
        # minishell keeps its verified path (Batman's terminal note)
        assert Project.objects.get(
            slug='minishell').demo_files_path == 'project-files/minishell.zip'
        # the seed-era projects/*.zip paths die (map §5.4)
        assert Project.objects.get(slug='philosophers').demo_files_path is None

    def test_apply_preserves_school_scores_and_content(self, stale_env):
        call_command('etl_v2', '--apply')
        for row in stale_env['project_rows']:
            if row['slug'] in INTERNSHIP_SLUGS or row['slug'] == PERSONAL_SLUG:
                continue
            p = Project.objects.get(slug=row['slug'])
            assert p.score == row['score']
            assert p.title == row['title']
            assert p.readme == row['readme']
            assert p.features == row['features']


# ── idempotency (map §5.8) ───────────────────────────────────────────────────

@pytest.mark.django_db
class TestIdempotency:

    def test_second_apply_is_a_no_op(self, stale_env, capsys):
        call_command('etl_v2', '--apply')
        capsys.readouterr()
        call_command('etl_v2', '--apply')
        second = capsys.readouterr().out
        assert 'no changes (idempotent)' in second
        assert 'no project changes — idempotent no-op' in second
        assert Experience.objects.count() == 1

    def test_dry_run_after_apply_shows_zero_diffs(self, stale_env, capsys):
        call_command('etl_v2', '--apply')
        capsys.readouterr()
        call_command('etl_v2', '--dry-run')
        out = capsys.readouterr().out
        assert 'project diffs    : 0' in out
        assert 'experience diffs : 0' in out


# ── --verify: green post-apply; red on violation ─────────────────────────────

@pytest.mark.django_db
class TestVerify:

    def test_verify_green_after_apply(self, stale_env, capsys):
        call_command('etl_v2', '--apply')
        capsys.readouterr()
        call_command('etl_v2', '--verify')
        out = capsys.readouterr().out
        assert 'VERIFY PASSED — all invariants green' in out

    def test_verify_fails_before_apply(self, stale_env):
        with pytest.raises(CommandError):
            call_command('etl_v2', '--verify')

    def test_verify_red_on_reintroduced_fabricated_score(self, stale_env, capsys):
        call_command('etl_v2', '--apply')
        capsys.readouterr()
        Project.objects.filter(slug='clinical-analytics-platform').update(score=100)
        with pytest.raises(CommandError):
            call_command('etl_v2', '--verify')
        out = capsys.readouterr().out
        assert 'clinical-analytics-platform: fabricated score nulled' in out

    def test_verify_red_on_missing_experience(self, stale_env):
        call_command('etl_v2', '--apply')
        Project.objects.update(experience=None)
        Experience.objects.all().delete()
        with pytest.raises(CommandError):
            call_command('etl_v2', '--verify')

    def test_verify_exposes_unmapped_fields(self, stale_env):
        """A fixture gaining an unknown field must fail verification (the
        zero-unmapped-fields invariant), not pass silently."""
        call_command('etl_v2', '--apply')
        fixture = load_fixture()
        fixture['internshipprojects'][0]['brand_new_field'] = 'x'
        with patch('projects.management.commands.etl_v2.load_fixture',
                   return_value=fixture):
            with pytest.raises(CommandError, match='unmapped'):
                call_command('etl_v2', '--verify')


# ── orphan / integrity guards (map §5.8 — never silently skip) ───────────────

@pytest.mark.django_db
class TestOrphanGuards:

    def test_missing_live_row_halts(self, stale_env):
        Project.objects.get(slug='push-swap').delete()
        with pytest.raises(CommandError, match='orphan'):
            call_command('etl_v2', '--apply')

    def test_extra_live_row_halts(self, stale_env):
        Project.objects.create(
            title='Extra', slug='extra', description='d',
            project_type='school',
        )
        with pytest.raises(CommandError, match='orphan'):
            call_command('etl_v2', '--apply')

    def test_divergent_fixture_slugs_halt_at_load(self, stale_env):
        fixture = load_fixture()
        fixture['internshipprojects'][0]['slug'] = 'not-a-unified-slug'
        with patch('projects.management.commands.etl_v2.load_fixture',
                   return_value=fixture):
            with pytest.raises(CommandError, match='slug join'):
                call_command('etl_v2', '--dry-run')


# ── verify-only semantics (map §5.8 — admin edits survive apply) ─────────────

@pytest.mark.django_db
class TestVerifyOnlySemantics:

    def test_admin_edited_title_survives_apply(self, stale_env):
        p = Project.objects.get(slug='clinical-analytics-platform')
        p.title = 'Admin Renamed This'
        p.save(update_fields=['title'])
        call_command('etl_v2', '--apply')
        p.refresh_from_db()
        assert p.title == 'Admin Renamed This'

    def test_admin_edited_readme_survives_apply(self, stale_env, capsys):
        p = Project.objects.get(slug='keycloak-integration-library')
        p.readme = 'Fresh post-migration prose.'
        p.save(update_fields=['readme'])
        call_command('etl_v2', '--apply')
        p.refresh_from_db()
        assert p.readme == 'Fresh post-migration prose.'
        out = capsys.readouterr().out
        assert 'VERIFY-DIVERGENCE readme' in out

    def test_admin_edited_code_snippets_survive_and_flag(self, stale_env, capsys):
        p = Project.objects.get(slug='clinical-analytics-platform')
        p.code_snippets = [{'title': 'New', 'language': 'python', 'code': 'x'}]
        p.save(update_fields=['code_snippets'])
        call_command('etl_v2', '--apply')
        p.refresh_from_db()
        assert p.code_snippets == [{'title': 'New', 'language': 'python',
                                    'code': 'x'}]
        out = capsys.readouterr().out
        assert 'VERIFY-DIVERGENCE code_snippets' in out


# ── CLI contract (subprocess — exit codes matter for the flip runbook) ───────

class TestCliContract:

    def run_manage(self, *args):
        """Subprocess with a REAL migrated sqlite file DB — exit codes and
        stdout matter for the G3/flip runbook; test_settings' in-memory
        default can't prove them (its tables never migrate and memory does
        not cross process boundaries)."""
        import tempfile

        db_path = Path(tempfile.mkdtemp(prefix='etl-v2-cli-')) / 'cli.sqlite3'
        env = os.environ.copy()
        env['DJANGO_SETTINGS_MODULE'] = 'tests.etl_cli_settings'
        env['ETL_V2_TEST_DB'] = str(db_path)
        env.setdefault('SECRET_KEY', 'django-insecure-test-key-for-f1-05')
        migrate = subprocess.run(
            [sys.executable, str(API_DIR / 'manage.py'), 'migrate', '-v', '0'],
            cwd=API_DIR, env=env, capture_output=True, text=True, timeout=120,
        )
        assert migrate.returncode == 0, migrate.stderr[-500:]
        return subprocess.run(
            [sys.executable, str(API_DIR / 'manage.py'), *args],
            cwd=API_DIR, env=env, capture_output=True, text=True, timeout=120,
        )

    def test_verify_exit_nonzero_when_failing(self):
        # empty (migrated) DB: count invariants fail → CommandError → exit 1
        result = self.run_manage('etl_v2', '--verify')
        assert result.returncode != 0
        assert 'VERIFY FAILED' in result.stdout

    def test_dry_run_on_mismatched_db_exits_nonzero(self):
        # empty DB → orphan guard trips (12 fixture rows missing)
        result = self.run_manage('etl_v2', '--dry-run')
        assert result.returncode != 0
        assert 'orphan' in result.stdout + result.stderr
