# tests/test_schema_v2.py
"""
F1-05 — Failing-first contract suite for schema v2 (branch rework/v2).

SPEC: docs/designs/2026-10-05-schema-v2-field-map.md ("the field map").
These tests DEFINE DONE for F1-06 (models v2 + migration 0010) and pre-declare
the F1-07 ETL contract. They intentionally FAIL against the current (v1)
models — red now, green after F1-06/F1-07. The only tests expected to pass
today are the §2.4/§2.5 unchanged-behavior guards (Gallery/GalleryImage/
ContactSubmission) and the serializer READ pass-through guard, all of which
must STAY green through F1-06.

Field-map sections covered:
  §2.1  Project (unified) v2 field map
  §2.2  Experience (new thin grouping table)
  §2.3  InternshipProject rescue-only / deprecated pair removal
  §2.4  Gallery / GalleryImage KEEP as-is
  §2.5  ContactSubmission KEEP as-is
  §3.1  project_type choices (school | internship | personal, no default)
  §3.2  JSON nullability & list defaults
  §3.3  Integrity rules (thumbnail iff featured, PROTECT FK, dates)
  §3.4  Canonical JSON shapes
  §3.6  Admin ergonomics
  §5.3  Double-transform hazard (serializer must be a pass-through)
  §5.8/§5.10  etl_v2 command contract (F1-07)
"""

import os
import subprocess
import sys
from datetime import date
from pathlib import Path

import pytest
from django.contrib import admin as django_admin
from django.core.exceptions import FieldDoesNotExist, ValidationError
from django.db import models as dj_models
from django.db.models import ProtectedError
from django.db.models.fields import NOT_PROVIDED

import projects.models as projects_models
from projects.models import ContactSubmission, Gallery, GalleryImage, Project
from projects.serializers import ProjectSerializer
from tests.conftest import make_project

# ─────────────────────────── helpers ─────────────────────────────────────────

API_DIR = Path(__file__).resolve().parents[1]
MANAGE_PY = API_DIR / 'manage.py'

# §2.1 / §3.2 / §3.4 — every JSON field on Project: NOT NULL, default []
PROJECT_JSON_LIST_FIELDS = [
    'tech_stack',
    'features',
    'stats',
    'badges',
    'impact_metrics',
    'demo_commands',
    'code_steps',
    'code_snippets',
    'architecture_diagrams',
    'related_documentation',
]

# §2.2 / §3.2 / §3.4 — every JSON field on Experience: NOT NULL, default []
EXPERIENCE_JSON_LIST_FIELDS = [
    'stats',
    'technologies',
    'impact_metrics',
    'architecture_diagrams',
    'code_samples',
    'documentation',
]

# §2.1 "Dropped from Project (summary)" + renamed has_interactive_demo
PROJECT_DROPPED_FIELDS = [
    'diagram_type',
    'architecture_diagram',
    'company',
    'role',
    'start_date',
    'end_date',
    'has_interactive_demo',
]


def get_experience_model():
    """Return projects.models.Experience, failing with a map citation if absent."""
    experience = getattr(projects_models, 'Experience', None)
    if experience is None:
        pytest.fail('projects.models.Experience does not exist (field map §2.2 — F1-06)')
    return experience


def project_field(name):
    """Fetch a Project field, failing with a map citation if absent."""
    try:
        return Project._meta.get_field(name)
    except FieldDoesNotExist:
        pytest.fail(f'Project.{name} does not exist (field map §2.1 — F1-06)')


def experience_field(name):
    """Fetch an Experience field, failing with a map citation if absent."""
    Experience = get_experience_model()
    try:
        return Experience._meta.get_field(name)
    except FieldDoesNotExist:
        pytest.fail(f'Experience.{name} does not exist (field map §2.2 — F1-06)')


def resolved_default(field):
    """Resolve a field default the way Django would (callables invoked)."""
    default = field.default
    return default() if callable(default) else default


def assert_json_list_field(field, owner, name):
    """§3.2 — JSON fields are NOT NULL with a list ([]) default."""
    assert isinstance(field, dj_models.JSONField), (
        f'{owner}.{name} should be a JSONField (field map §2.1/§2.2)'
    )
    assert field.null is False, f'{owner}.{name} must be null=False (field map §3.2)'
    assert resolved_default(field) == [], (
        f'{owner}.{name} default must resolve to [] (field map §3.2)'
    )


def run_manage(*args):
    """Run manage.py in a clean subprocess (no network: sqlite/locmem settings)."""
    env = os.environ.copy()
    env['DJANGO_SETTINGS_MODULE'] = 'tests.test_settings'
    env.setdefault('SECRET_KEY', 'django-insecure-test-key-for-f1-05')
    return subprocess.run(
        [sys.executable, str(MANAGE_PY), *args],
        cwd=API_DIR,
        env=env,
        capture_output=True,
        text=True,
        timeout=120,
    )


# ═════════════════════════════════════════════════════════════════════════════
# §2.1 / §3.1 — project_type: school | internship | personal, default removed
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestProjectTypeV2:

    def test_choices_exact_per_field_map(self):
        """Field map §2.1/§3.1: choices are exactly school/internship/personal, in that order."""
        field = project_field('project_type')
        values = [choice[0] for choice in field.choices]
        assert values == ['school', 'internship', 'personal']

    def test_no_silent_default(self):
        """Field map §2.1/§3.1: default removed — a project type is a conscious choice."""
        field = project_field('project_type')
        assert field.default is NOT_PROVIDED, (
            "project_type must have no default (field map §2.1: 'default removed')"
        )

    def test_personal_type_persistable(self):
        """Field map §2.1/§3.1 + §3.3: a non-featured personal project saves without thumbnail."""
        p = Project.objects.create(
            title='Side Quest',
            slug='side-quest',
            description='A personal project.',
            project_type='personal',
        )
        p.refresh_from_db()
        assert p.project_type == 'personal'


# ═════════════════════════════════════════════════════════════════════════════
# §2.1 / §3.2 / §3.4 — Project v2 field contract (new, renamed, transformed)
# ═════════════════════════════════════════════════════════════════════════════

class TestProjectFieldContractV2:

    def test_has_demo_renamed_field(self):
        """Field map §2.1: has_interactive_demo TRANSFORM → renamed `has_demo`, Bool default False."""
        field = project_field('has_demo')
        assert isinstance(field, dj_models.BooleanField)
        assert field.default is False

    def test_score_nullable_no_default(self):
        """Field map §2.1: score TRANSFORM → nullable, default None (fabricated 100s die)."""
        field = project_field('score')
        assert field.null is True
        assert field.default is None

    def test_order_field(self):
        """Field map §2.1: `order` RESCUE/NEW — PositiveIntegerField, default 0 (ledger ordering)."""
        field = project_field('order')
        assert isinstance(field, dj_models.PositiveIntegerField)
        assert field.default == 0

    def test_timestamps_auto_fields(self):
        """Field map §2.1: created_at/updated_at RESCUE/NEW — auto_now_add / auto_now."""
        created = project_field('created_at')
        updated = project_field('updated_at')
        assert isinstance(created, dj_models.DateTimeField)
        assert created.auto_now_add is True
        assert isinstance(updated, dj_models.DateTimeField)
        assert updated.auto_now is True

    def test_architecture_description_rescued(self):
        """Field map §2.1/§2.3: architecture_description RESCUE ← InternshipProject — Text, nullable."""
        field = project_field('architecture_description')
        assert isinstance(field, dj_models.TextField)
        assert field.null is True

    def test_demo_files_path_kept_nullable(self):
        """Field map §2.1: demo_files_path KEEP — CharField(255) nullable, canonical R2 key."""
        field = project_field('demo_files_path')
        assert isinstance(field, dj_models.CharField)
        assert field.null is True

    @pytest.mark.parametrize('name', PROJECT_JSON_LIST_FIELDS)
    def test_json_fields_not_null_list_default(self, name):
        """Field map §3.2/§3.4: all Project JSON fields are NOT NULL with [] default."""
        assert_json_list_field(project_field(name), 'Project', name)

    @pytest.mark.parametrize('name', PROJECT_DROPPED_FIELDS)
    def test_dropped_fields_absent(self, name):
        """Field map §2.1 'Dropped from Project (summary)': field must be gone."""
        with pytest.raises(FieldDoesNotExist):
            Project._meta.get_field(name)


@pytest.mark.django_db
class TestProjectSaveContractV2:

    def test_save_rejects_bypass_validation_kwarg(self):
        """Field map §2.1/§3.3: the bypass_validation kwarg is DELETED from save()."""
        with pytest.raises(TypeError):
            Project(
                title='No Kwarg',
                description='d',
                slug='no-kwarg',
                project_type='school',
            ).save(bypass_validation=True)

    def test_non_featured_project_needs_no_thumbnail(self):
        """Field map §3.3: thumbnail required IFF is_featured — plain school row saves clean."""
        p = Project.objects.create(
            title='Bare School Row',
            slug='bare-school-row',
            description='No thumbnail, not featured.',
            project_type='school',
        )
        assert p.pk is not None

    def test_defaults_on_minimal_create(self):
        """Field map §2.1/§3.2: minimal Project row reports every v2 default."""
        p = Project.objects.create(
            title='Defaults Probe',
            slug='defaults-probe',
            description='d',
            project_type='school',
        )
        p.refresh_from_db()
        assert p.has_demo is False
        assert p.score is None
        assert p.order == 0
        assert p.architecture_description is None
        assert p.experience is None
        for name in PROJECT_JSON_LIST_FIELDS:
            assert getattr(p, name) == [], f'{name} should default to []'
        assert p.created_at is not None
        assert p.updated_at is not None


@pytest.mark.django_db
class TestProjectCanonicalShapes:

    def test_canonical_json_shapes_roundtrip(self):
        """Field map §3.4: canonical shapes survive a save/refresh cycle verbatim."""
        canonical = {
            'tech_stack': [{'name': 'C', 'category': 'language'}],
            'features': ['Parsing', 'Execution'],
            'stats': [{'label': 'Coverage', 'value': '85%'}],
            'badges': [{'text': 'Zero Trust'}],
            'impact_metrics': [
                {'label': 'Vulns prevented', 'value': '15+', 'description': 'd'}
            ],
            'demo_commands': [{'label': 'Build', 'command': 'make'}],
            'code_steps': ['make', './project'],
            'code_snippets': [
                {'title': 'Main', 'language': 'c', 'code': 'int main(void){return 0;}'}
            ],
            'architecture_diagrams': [
                {
                    'title': 'Architecture',
                    'type': 'mermaid',
                    'content': 'graph TD; A-->B',
                    'description': 'd',
                }
            ],
            'related_documentation': [
                {'title': 'Runbook', 'description': 'd', 'category': 'architecture'}
            ],
        }
        p = Project.objects.create(
            title='Canonical Shapes',
            slug='canonical-shapes',
            description='d',
            project_type='personal',
            has_demo=True,
            architecture_description='Layered prose.',
            order=3,
            **canonical,
        )
        p.refresh_from_db()
        assert p.has_demo is True
        assert p.architecture_description == 'Layered prose.'
        assert p.order == 3
        for name, value in canonical.items():
            assert getattr(p, name) == value, f'{name} did not roundtrip verbatim'


# ═════════════════════════════════════════════════════════════════════════════
# §2.1 experience FK / §2.2 Experience — the thin grouping table
# ═════════════════════════════════════════════════════════════════════════════

class TestExperienceModelV2:

    def test_experience_model_exists(self):
        """Field map §2.2: a thin `Experience` table replaces deprecated Internship."""
        assert get_experience_model() is not None

    def test_company_role_subtitle_required_chars(self):
        """Field map §2.2: company/role CharField(255), subtitle CharField(500) — all required."""
        company = experience_field('company')
        role = experience_field('role')
        subtitle = experience_field('subtitle')
        for field in (company, role):
            assert isinstance(field, dj_models.CharField)
            assert field.max_length == 255
            assert field.blank is False and field.null is False
        assert isinstance(subtitle, dj_models.CharField)
        assert subtitle.max_length == 500
        assert subtitle.blank is False and subtitle.null is False

    def test_slug_unique_100(self):
        """Field map §2.2: slug SlugField(100) unique — keys the F5-04 redirects."""
        field = experience_field('slug')
        assert isinstance(field, dj_models.SlugField)
        assert field.max_length == 100
        assert field.unique is True

    def test_dates(self):
        """Field map §2.2: start_date required, end_date nullable (null = current)."""
        start = experience_field('start_date')
        end = experience_field('end_date')
        assert isinstance(start, dj_models.DateField)
        assert start.null is False
        assert isinstance(end, dj_models.DateField)
        assert end.null is True

    def test_overview_required_text(self):
        """Field map §2.2: overview — Text, required (the long hero payload body)."""
        field = experience_field('overview')
        assert isinstance(field, dj_models.TextField)
        assert field.blank is False and field.null is False

    def test_architecture_description_nullable(self):
        """Field map §2.2: architecture_description — Text, nullable (ZTA prose)."""
        field = experience_field('architecture_description')
        assert isinstance(field, dj_models.TextField)
        assert field.null is True

    def test_is_active_defaults_true(self):
        """Field map §2.2: is_active Bool default True (display toggle)."""
        field = experience_field('is_active')
        assert isinstance(field, dj_models.BooleanField)
        assert field.default is True

    def test_order_positive_default_zero(self):
        """Field map §2.2: order PositiveIntegerField default 0."""
        field = experience_field('order')
        assert isinstance(field, dj_models.PositiveIntegerField)
        assert field.default == 0

    def test_timestamps_auto_fields(self):
        """Field map §2.2: created_at/updated_at — auto_now_add / auto_now."""
        assert experience_field('created_at').auto_now_add is True
        assert experience_field('updated_at').auto_now is True

    @pytest.mark.parametrize('name', EXPERIENCE_JSON_LIST_FIELDS)
    def test_json_fields_not_null_list_default(self, name):
        """Field map §3.2/§3.4: rescued JSON content lands as NOT NULL lists (§2.2 shapes)."""
        assert_json_list_field(experience_field(name), 'Experience', name)


@pytest.mark.django_db
class TestExperienceBehavior:

    def make_experience(self, **overrides):
        """§2.2 — a valid Experience row (Qynapse shape from the map's ground truth)."""
        Experience = get_experience_model()
        defaults = {
            'company': 'Qynapse',
            'role': 'Fullstack Engineer intern',
            'subtitle': 'Healthcare AI, hardened end to end',
            'slug': 'qynapse-healthcare',
            'start_date': date(2025, 5, 5),
            'end_date': None,
            'overview': 'About Qynapse and the role.',
        }
        defaults.update(overrides)
        return Experience.objects.create(**defaults)

    def test_str_is_role_at_company(self):
        """Field map §2.2 (carries Internship.__str__ convention): 'role @ company'."""
        exp = self.make_experience()
        assert str(exp) == 'Fullstack Engineer intern @ Qynapse'

    def test_canonical_shapes_roundtrip(self):
        """Field map §2.2/§3.4: rescued hero content roundtrips in canonical shapes."""
        canonical = {
            'stats': [{'label': 'Test files', 'value': '55'}],
            'technologies': [{'name': 'Django', 'category': 'backend'}],
            'impact_metrics': [
                {'label': 'Testing', 'value': '55 files', 'description': 'd'}
            ],
            'architecture_diagrams': [
                {
                    'title': 'Zero Trust Architecture',
                    'type': 'mermaid',
                    'content': 'graph TD; A-->B',
                }
            ],
            'code_samples': [
                {'title': 'Validator', 'language': 'python', 'code': 'def f(): pass'}
            ],
            'documentation': [
                {'title': 'Runbook', 'description': 'd', 'category': 'architecture'}
            ],
        }
        exp = self.make_experience(**canonical)
        exp.refresh_from_db()
        for name, value in canonical.items():
            assert getattr(exp, name) == value, f'{name} did not roundtrip verbatim'

    def test_end_date_before_start_date_rejected(self):
        """Field map §3.3: Experience.end_date >= start_date when both set."""
        exp = self.make_experience(
            start_date=date(2025, 5, 5),
            end_date=date(2025, 4, 1),
            slug='date-order',
        )
        with pytest.raises(ValidationError):
            exp.full_clean()

    def test_project_experience_relation(self):
        """Field map §2.1/§2.2: nullable FK on Project, related_name='projects'."""
        exp = self.make_experience()
        p = Project.objects.create(
            title='ZTA Hardening',
            slug='zta-hardening',
            description='d',
            project_type='internship',
            experience=exp,
        )
        p.refresh_from_db()
        assert p.experience == exp
        assert list(exp.projects.all()) == [p]

    def test_experience_delete_is_protected(self):
        """Field map §2.1: on_delete=PROTECT — linked Experience cannot be deleted."""
        exp = self.make_experience()
        Project.objects.create(
            title='Protected Link',
            slug='protected-link',
            description='d',
            project_type='internship',
            experience=exp,
        )
        with pytest.raises(ProtectedError):
            exp.delete()


# ═════════════════════════════════════════════════════════════════════════════
# §2.1 pt 1 / §2.3 — deprecated models GONE (importlib/hasattr, not hard import)
# ═════════════════════════════════════════════════════════════════════════════

class TestDeprecatedModelsRemoved:

    def test_internship_model_removed_from_projects_models(self):
        """Field map §2.1/§2.3: deprecated Internship is rescue-source only, then gone."""
        assert not hasattr(projects_models, 'Internship'), (
            'projects.models.Internship must be removed (field map §2.1/§2.3)'
        )

    def test_internshipproject_model_removed_from_projects_models(self):
        """Field map §2.3: InternshipProject is rescue-only, then dropped."""
        assert not hasattr(projects_models, 'InternshipProject'), (
            'projects.models.InternshipProject must be removed (field map §2.3)'
        )


# ═════════════════════════════════════════════════════════════════════════════
# §5.8/§5.10 — ETL contract pre-declaration (F1-07 implements `etl_v2`)
# ═════════════════════════════════════════════════════════════════════════════

class TestEtlV2CommandContract:

    def test_etl_v2_command_exists(self):
        """Field map §5.8/§5.10 (F1-07): `manage.py etl_v2 --help` runs cleanly."""
        result = run_manage('etl_v2', '--help')
        assert result.returncode == 0, (
            f'etl_v2 command missing/broken (F1-07). '
            f'stderr: {result.stderr.strip()[:400]}'
        )

    def test_etl_v2_accepts_mode_flags(self):
        """Field map §5.8/§5.10 (F1-07): etl_v2 exposes --dry-run / --apply / --verify."""
        result = run_manage('etl_v2', '--help')
        assert result.returncode == 0, (
            f'etl_v2 command missing (F1-07). stderr: {result.stderr.strip()[:400]}'
        )
        for flag in ('--dry-run', '--apply', '--verify'):
            assert flag in result.stdout, f'etl_v2 must accept {flag} (F1-07)'


# ═════════════════════════════════════════════════════════════════════════════
# §2.4 / §2.5 — unchanged behavior guards (must stay green through F1-06)
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestUnchangedGalleriesAndContact:

    def test_gallery_and_image_roundtrip(self, project):
        """Field map §2.4: Gallery/GalleryImage KEEP as-is — create/relate/order roundtrip."""
        gallery = Gallery.objects.create(
            project=project, name='Screenshots', description='d', order=1
        )
        image = GalleryImage.objects.create(
            gallery=gallery,
            image='galleries/2026/10/05/shot.png',
            caption='Hero shot',
            order=0,
        )
        assert gallery.project == project
        assert list(gallery.images.all()) == [image]
        assert image.caption == 'Hero shot'
        assert image.order == 0
        assert 'Screenshots' in str(gallery)
        assert project.galleries.count() == 1

    def test_gallery_images_ordered(self, project):
        """Field map §2.4: (gallery, order) ordering preserved."""
        gallery = Gallery.objects.create(project=project, name='Ordered')
        for order in (2, 0, 1):
            GalleryImage.objects.create(
                gallery=gallery,
                image=f'galleries/2026/10/05/i{order}.png',
                order=order,
            )
        assert list(gallery.images.values_list('order', flat=True)) == [0, 1, 2]

    def test_contact_submission_creation(self):
        """Field map §2.5: ContactSubmission KEEP as-is — minimal write-once PII record."""
        submission = ContactSubmission.objects.create(
            name='Alice', email='alice@example.com', message='Hello there'
        )
        assert submission.pk is not None
        assert submission.created_at is not None
        assert str(submission) == 'Message from Alice'


# ═════════════════════════════════════════════════════════════════════════════
# §5.3 — serializer pass-through guard (the double-transform hazard)
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestSerializerPassThroughGuard:

    def test_read_does_not_mutate_canonical_shapes(self):
        """Field map §5.3: what's in the model is what the serializer returns on read."""
        steps = ['make', './project']
        snippets = [{'title': 'Main', 'language': 'c', 'code': 'int main(void){}'}]
        p = make_project(code_steps=steps, code_snippets=snippets)
        data = ProjectSerializer(p).data
        assert data['code_steps'] == steps
        assert data['code_snippets'] == snippets

    def test_write_does_not_mutate_canonical_shapes(self):
        """Field map §5.3: validate_code_snippets/code_steps must be GONE — canonical
        input validates to exactly itself (no dict-coercion, no data destruction)."""
        steps = ['make', './project']
        snippets = [{'title': 'Main', 'language': 'c', 'code': 'int main(void){}'}]
        payload = {
            'title': 'Pass Through',
            'slug': 'pass-through',
            'description': 'd',
            'project_type': 'school',
            'tech_stack': [{'name': 'C'}],
            'code_steps': steps,
            'code_snippets': snippets,
        }
        serializer = ProjectSerializer(data=payload)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data['code_steps'] == steps
        assert serializer.validated_data['code_snippets'] == snippets


# ═════════════════════════════════════════════════════════════════════════════
# §3.6 — admin ergonomics (light checks)
# ═════════════════════════════════════════════════════════════════════════════

class TestAdminV2:

    def test_experience_registered(self):
        """Field map §3.6: ExperienceAdmin is registered."""
        Experience = get_experience_model()
        assert Experience in django_admin.site._registry

    def test_project_admin_list_display_and_filter(self):
        """Field map §3.6: ProjectAdmin list_display/list_filter expose v2 columns."""
        project_admin = django_admin.site._registry[Project]
        for column in ('title', 'project_type', 'order', 'has_demo', 'is_featured'):
            assert column in project_admin.list_display
        for flag in ('project_type', 'has_demo', 'is_featured'):
            assert flag in project_admin.list_filter

    def test_project_admin_references_experience(self):
        """Field map §3.6: ProjectAdmin surfaces the experience FK (fieldset or inline)."""
        Experience = get_experience_model()
        project_admin = django_admin.site._registry[Project]
        inline_models = [
            getattr(inline, 'model', None) for inline in (project_admin.inlines or [])
        ]
        assert Experience in inline_models or 'experience' in str(project_admin.fieldsets)

    def test_deprecated_models_unregistered(self):
        """Field map §2.1/§2.3 + §3.6: deprecated admin registrations die with the models."""
        registry = django_admin.site._registry
        for name in ('Internship', 'InternshipProject'):
            model = getattr(projects_models, name, None)
            if model is not None:
                assert model not in registry, (
                    f'projects.models.{name} must be unregistered from admin '
                    f'(field map §2.1/§2.3/§3.6)'
                )
