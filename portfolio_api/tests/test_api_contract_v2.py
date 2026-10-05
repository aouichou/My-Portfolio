# tests/test_api_contract_v2.py
"""F2-02 — the frozen API contract v2, encoded as tests.

Contract: docs/designs/2026-10-05-api-contract-v2.md (FROZEN 2026-10-05,
Batman countersigned: Q1 YES — featured gate killed on the projects list;
Q2 type-only card overlines).

Every clause of the contract's §1 endpoint table, §3 frozen JSON shapes and
§4 conventions is asserted here. Shape assertions use EXACT key sets — a
response that is missing a contract field OR leaks a field the contract does
not list fails (§0.5: F2-02 asserts the §3 examples byte-for-shape).

Written RED against the pre-F2-03 code on purpose (test-first): the featured
gate, the missing pagination envelope, the fat serializer surface, the 429
"error" key and the thumbnail_url shadowing bug are all expected to fail
here until F2-03 lands.
"""

import datetime

import jwt as pyjwt
import pytest
from django.conf import settings
from django.core.files.base import ContentFile
from django.test import override_settings
from django.urls import reverse
from unittest import mock

from projects.models import Experience, Gallery, GalleryImage, Project
from tests.conftest import make_project

# ═════════════════════════════════════════════════════════════════════════════
# Frozen shapes (contract §3 — key sets are exhaustive: missing AND extra fail)
# ═════════════════════════════════════════════════════════════════════════════

# §3.1 ProjectCard — 9 fields
CARD_KEYS = {
    'slug', 'title', 'project_type', 'description', 'is_featured',
    'has_demo', 'thumbnail_url', 'tech_stack', 'order',
}

# §3.3 ProjectDetail — 31 fields (id and raw thumbnail path are DROPPED)
DETAIL_KEYS = {
    'slug', 'title', 'project_type', 'description', 'readme',
    'thumbnail_url', 'is_featured', 'score', 'tech_stack', 'features',
    'challenges', 'lessons', 'live_url', 'code_url', 'video_url',
    'role_description', 'stats', 'badges', 'impact_metrics',
    'architecture_description', 'architecture_diagrams',
    'related_documentation', 'code_steps', 'code_snippets', 'has_demo',
    'demo_commands', 'demo_files_path', 'galleries', 'experience', 'order',
    'created_at', 'updated_at',
}

# §3.4 ExperienceList — 11 fields (no id; overview is detail-only)
EXPERIENCE_LIST_KEYS = {
    'slug', 'company', 'role', 'subtitle', 'start_date', 'end_date',
    'period_display', 'stats', 'project_count', 'is_active', 'order',
}

# §3.5 ExperienceDetail — list fields + detail-only additions + nested cards
EXPERIENCE_DETAIL_KEYS = EXPERIENCE_LIST_KEYS | {
    'overview', 'technologies', 'impact_metrics',
    'architecture_description', 'architecture_diagrams', 'code_samples',
    'documentation', 'duration_months', 'created_at', 'updated_at',
    'projects',
}

# §3.3 nested shapes
GALLERY_KEYS = {'name', 'description', 'order', 'images'}
GALLERY_IMAGE_KEYS = {'image_url', 'caption', 'order'}
EXPERIENCE_REF_KEYS = {'slug', 'company', 'role', 'period_display'}

# §1 param table — the complete list of recognized values
PROJECT_TYPES = {'school', 'internship', 'personal'}


# ═════════════════════════════════════════════════════════════════════════════
# helpers
# ═════════════════════════════════════════════════════════════════════════════

def make_experience(**kwargs):
    """A saved Experience row (Qynapse-like defaults; §3.4 example shape)."""
    defaults = {
        'company': 'Qynapse',
        'role': 'Fullstack Engineer intern',
        'subtitle': 'Six months on a neuroimaging platform.',
        'slug': 'qynapse-healthcare',
        'start_date': '2025-05-02',
        'end_date': '2025-11-28',
        'overview': 'Long-form hero body.',
    }
    defaults.update(kwargs)
    return Experience.objects.create(**defaults)


def add_gallery(project, name='Pipeline views', images=1):
    """Attach a gallery with N images to a project."""
    gallery = Gallery.objects.create(project=project, name=name, order=0)
    for i in range(images):
        GalleryImage.objects.create(
            gallery=gallery,
            image=f'galleries/2026/10/05/img-{i}.png',
            caption=f'cap {i}' if i else '',
            order=i,
        )
    return gallery


LIST_URL = '/api/projects/'


def get_list(api_client, **params):
    return api_client.get(LIST_URL, params)


# ═════════════════════════════════════════════════════════════════════════════
# #3 GET /api/projects/ — Q1: the full ledger, no featured gate (§1, §9 Q1)
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestProjectsListFullLedger:
    """Q1 countersigned YES: the list returns the FULL ledger by default."""

    def test_default_returns_full_ledger_including_unfeatured(self, api_client):
        for i in range(3):
            make_project(title=f'Unfeatured {i}', is_featured=False)
        make_project(title='Featured One', is_featured=True)

        response = get_list(api_client)
        data = response.json()
        assert response.status_code == 200
        assert data['count'] == 4
        assert len(data['results']) == 4

    def test_no_include_all_param_needed(self, api_client):
        """The param is REMOVED — the default IS the full ledger."""
        make_project(title='Featured', is_featured=True)
        make_project(title='Regular', is_featured=False)

        default = get_list(api_client).json()
        with_param = get_list(api_client, include_all='true').json()

        assert default['count'] == 2
        assert with_param['count'] == 2
        assert {r['slug'] for r in default['results']} == \
               {r['slug'] for r in with_param['results']}

    def test_killed_is_featured_param_is_ignored_not_a_filter(self, api_client):
        """§1 killed params: is_featured is a FIELD, not a filter. As a query
        param it is noise → ignored (§4.2), never a gate and never a 400."""
        make_project(title='Featured', is_featured=True)
        make_project(title='Regular', is_featured=False)

        response = get_list(api_client, is_featured='true')
        assert response.status_code == 200
        assert response.json()['count'] == 2

    def test_is_featured_survives_as_a_field(self, api_client):
        make_project(title='Featured', is_featured=True)
        card = get_list(api_client).json()['results'][0]
        assert card['is_featured'] is True

    def test_unknown_param_names_are_ignored(self, api_client):
        """§4.2: unknown param names → ignored (scanner noise, not 400s)."""
        make_project(title='P')
        response = get_list(api_client, foo='bar', debug='1')
        assert response.status_code == 200
        assert response.json()['count'] == 1

    def test_empty_ledger_returns_empty_page(self, api_client):
        data = get_list(api_client).json()
        assert data['count'] == 0
        assert data['results'] == []
        assert data['next'] is None
        assert data['previous'] is None

    def test_ordering_is_ledger_order_featured_not_hoisted(self, api_client):
        """§1: fixed server-side ordering — order ASC, title ASC. Featured
        curation moved client-side; the server must NOT hoist featured."""
        make_project(title='AAA Hoisted Before', is_featured=True, order=9)
        make_project(title='ZZZ First', is_featured=False, order=1)
        make_project(title='MMM Middle', is_featured=False, order=2)

        results = get_list(api_client).json()['results']
        titles = [r['title'] for r in results]
        assert titles == ['ZZZ First', 'MMM Middle', 'AAA Hoisted Before']


# ═════════════════════════════════════════════════════════════════════════════
# #3 — project_type / has_demo filters + strict validation (§1 table, §4.2)
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestProjectsListFilters:

    @pytest.mark.parametrize('project_type', sorted(PROJECT_TYPES))
    def test_filter_by_project_type(self, api_client, project_type):
        make_project(title='School', project_type='school')
        make_project(title='Internship', project_type='internship')
        make_project(title='Personal', project_type='personal')

        data = get_list(api_client, project_type=project_type).json()
        assert data['count'] == 1
        assert all(r['project_type'] == project_type for r in data['results'])

    def test_filter_personal_including_unfeatured(self, api_client):
        """Q1 + personal type: unfeatured personal rows are ledger rows."""
        make_project(title='Mistral Realms', project_type='personal',
                     is_featured=False)
        data = get_list(api_client, project_type='personal').json()
        assert data['count'] == 1
        assert data['results'][0]['slug'] == 'mistral-realms'

    def test_invalid_project_type_returns_400(self, api_client):
        response = get_list(api_client, project_type='foo')
        assert response.status_code == 400
        body = response.json()
        assert set(body) == {'project_type'}
        assert isinstance(body['project_type'], list)
        assert 'foo' in body['project_type'][0]

    def test_has_demo_true_filter(self, api_client):
        make_project(title='Runnable', has_demo=True)
        make_project(title='Static', has_demo=False)

        data = get_list(api_client, has_demo='true').json()
        assert data['count'] == 1
        assert data['results'][0]['slug'] == 'runnable'

    def test_has_demo_false_filter(self, api_client):
        make_project(title='Runnable', has_demo=True)
        make_project(title='Static', has_demo=False)

        data = get_list(api_client, has_demo='false').json()
        assert data['count'] == 1
        assert data['results'][0]['slug'] == 'static'

    def test_invalid_has_demo_returns_400(self, api_client):
        response = get_list(api_client, has_demo='yes')
        assert response.status_code == 400
        body = response.json()
        assert set(body) == {'has_demo'}
        assert isinstance(body['has_demo'], list)

    def test_filters_compose_project_type_and_has_demo(self, api_client):
        make_project(title='Runnable School', project_type='school',
                     has_demo=True)
        make_project(title='Static School', project_type='school')
        make_project(title='Runnable Personal', project_type='personal',
                     has_demo=True)

        data = get_list(api_client, project_type='school',
                        has_demo='true').json()
        assert data['count'] == 1
        assert data['results'][0]['slug'] == 'runnable-school'


# ═════════════════════════════════════════════════════════════════════════════
# #3 — pagination: limit/offset, default 24, max 100 (§3.2 envelope, §4.3)
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestProjectsListPagination:
    """§4.3 pins DRF LimitOffsetPagination: default limit=24, max_limit=100
    (over-limit CLAMPS via DRF's cutoff — the contract names the mechanism,
    not a 400). Envelope {count, next, previous, results} per §3.2."""

    @pytest.fixture(autouse=True)
    def ledger(self):
        for i in range(26):
            make_project(title=f'Ledger {i:02d}', order=i)

    def test_envelope_keys_exactly(self, api_client):
        response = get_list(api_client)
        assert response.status_code == 200
        assert set(response.json()) == {'count', 'next', 'previous', 'results'}

    def test_default_limit_is_24(self, api_client):
        data = get_list(api_client).json()
        assert data['count'] == 26
        assert len(data['results']) == 24
        assert data['next'] is not None
        assert data['previous'] is None

    def test_second_page_via_offset(self, api_client):
        data = get_list(api_client, offset=24).json()
        assert len(data['results']) == 2
        assert data['next'] is None
        assert data['previous'] is not None

    def test_pages_do_not_overlap(self, api_client):
        page1 = get_list(api_client).json()['results']
        page2 = get_list(api_client, offset=24).json()['results']
        slugs1 = {r['slug'] for r in page1}
        slugs2 = {r['slug'] for r in page2}
        assert not (slugs1 & slugs2)
        assert len(slugs1 | slugs2) == 26

    def test_explicit_small_limit(self, api_client):
        data = get_list(api_client, limit=5).json()
        assert data['count'] == 26
        assert len(data['results']) == 5

    def test_limit_above_max_clamps_to_100(self, api_client):
        for i in range(26, 105):
            make_project(title=f'Ledger {i:02d}', order=i)
        data = get_list(api_client, limit=150).json()
        assert data['count'] == 105
        assert len(data['results']) == 100  # clamped, NOT an error

    def test_non_integer_limit_falls_back_to_default(self, api_client):
        """DRF-native: unparsable limit is ignored → default 24 (§4.3 names
        the DRF class; the contract's 400s are for param VALUES, §4.2)."""
        response = get_list(api_client, limit='abc')
        assert response.status_code == 200
        assert len(response.json()['results']) == 24

    def test_count_reflects_active_filters(self, api_client):
        make_project(title='Personal One', project_type='personal')
        data = get_list(api_client, project_type='personal').json()
        assert data['count'] == 1

    def test_pagination_applies_to_projects_list_only(self, api_client):
        """§4.3: experiences list is NOT paginated (plain array, §3.4)."""
        make_experience()
        response = api_client.get('/api/experiences/')
        assert isinstance(response.json(), list)


# ═════════════════════════════════════════════════════════════════════════════
# #3 — ProjectCard shape (§3.1 — exact keys; nothing leaks, nothing missing)
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestProjectCardShape:

    def test_card_keys_exactly(self, api_client):
        make_project(
            title='Minishell',
            tech_stack=[{'name': 'C'}, {'name': 'Makefile', 'category': 'tooling'}],
            is_featured=True,
            has_demo=True,
        )
        card = get_list(api_client).json()['results'][0]
        assert set(card) == CARD_KEYS, (
            f'missing={CARD_KEYS - set(card)} extra={set(card) - CARD_KEYS}')

    def test_card_carries_demo_feed_fields(self, api_client):
        """§6: has_demo rides the card — the Phase 4 whitelist feed."""
        make_project(title='Runnable', has_demo=True)
        card = get_list(api_client).json()['results'][0]
        assert card['has_demo'] is True

    def test_card_tech_stack_pass_through(self, api_client):
        stack = [{'name': 'C'}, {'name': 'Makefile', 'category': 'tooling'}]
        make_project(title='Stack', tech_stack=stack)
        card = get_list(api_client).json()['results'][0]
        assert card['tech_stack'] == stack

    def test_card_does_not_leak_detail_fields(self, api_client):
        """§3.1: badges/stats/score/dates/readme are detail-only."""
        make_project(title='Leaky', readme='long body', score=125,
                     stats=[{'label': 'L', 'value': 'V'}])
        card = get_list(api_client).json()['results'][0]
        for detail_only in ('readme', 'score', 'stats', 'badges', 'galleries',
                            'created_at', 'updated_at', 'id', 'thumbnail',
                            'impact_metrics', 'demo_commands'):
            assert detail_only not in card


# ═════════════════════════════════════════════════════════════════════════════
# thumbnail_url — the §2.2 shadowing fix (frozen resolution)
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestThumbnailUrlShadowing:

    def test_external_url_used_when_no_uploaded_thumbnail(self, api_client):
        """§2.2 frozen fix: the SerializerMethodField must NOT shadow the
        model's external-URL escape hatch — no file → external URL wins."""
        external = 'https://cdn.example.net/projects/minishell.webp'
        make_project(title='External Thumb', thumbnail_url=external)

        card = get_list(api_client).json()['results'][0]
        assert card['thumbnail_url'] == external

    def test_null_when_neither_file_nor_external(self, api_client):
        make_project(title='No Thumb')
        card = get_list(api_client).json()['results'][0]
        assert card['thumbnail_url'] is None

    def test_uploaded_thumbnail_serves_absolute_url(self, api_client):
        project = make_project(title='Uploaded Thumb')
        project.thumbnail.save('t.png', ContentFile(b'fakepng'), save=True)

        card = get_list(api_client).json()['results'][0]
        assert card['thumbnail_url'] is not None
        assert card['thumbnail_url'].startswith('http')

    def test_external_fallback_on_detail_too(self, api_client):
        external = 'https://cdn.example.net/projects/detail.webp'
        project = make_project(title='Detail Thumb', thumbnail_url=external)
        response = api_client.get(f'/api/projects/{project.slug}/')
        assert response.json()['thumbnail_url'] == external


# ═════════════════════════════════════════════════════════════════════════════
# #4 GET /api/projects/{slug}/ — ProjectDetail shape (§3.3)
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestProjectDetailShape:

    def test_detail_keys_exactly(self, api_client):
        project = make_project(title='Full Detail')
        response = api_client.get(f'/api/projects/{project.slug}/')
        assert response.status_code == 200
        body = response.json()
        assert set(body) == DETAIL_KEYS, (
            f'missing={DETAIL_KEYS - set(body)} extra={set(body) - DETAIL_KEYS}')

    def test_detail_drops_model_id_and_raw_thumbnail_path(self, api_client):
        """§3.3: slug is the identity; raw storage paths never serialize."""
        project = make_project(title='Ident')
        project.thumbnail.save('t.png', ContentFile(b'fakepng'), save=True)
        body = api_client.get(f'/api/projects/{project.slug}/').json()
        assert 'id' not in body
        assert 'thumbnail' not in body
        assert body['slug'] == project.slug

    def test_detail_demo_block(self, api_client):
        """§6: the card carries has_demo; the detail carries the full block."""
        make_project(
            title='Demo Block',
            has_demo=True,
            demo_commands=[{'label': 'Run tests', 'command': 'pytest -q'}],
        )
        body = api_client.get('/api/projects/demo-block/').json()
        assert body['has_demo'] is True
        assert body['demo_commands'] == [
            {'label': 'Run tests', 'command': 'pytest -q'}]

    def test_absent_scalars_null_absent_lists_empty(self, api_client):
        """§3 preamble: null for absent scalars, [] for absent lists."""
        make_project(title='Sparse')
        body = api_client.get('/api/projects/sparse/').json()
        assert body['score'] is None
        assert body['challenges'] is None
        assert body['lessons'] is None
        assert body['readme'] is None
        assert body['live_url'] is None
        assert body['experience'] is None
        for list_field in ('tech_stack', 'features', 'stats', 'badges',
                           'impact_metrics', 'architecture_diagrams',
                           'related_documentation', 'code_steps',
                           'code_snippets', 'demo_commands', 'galleries'):
            assert body[list_field] == [], list_field

    def test_timestamps_iso8601(self, api_client):
        make_project(title='Timestamped')
        body = api_client.get('/api/projects/timestamped/').json()
        for field in ('created_at', 'updated_at'):
            value = body[field]
            assert isinstance(value, str) and 'T' in value, field

    def test_unknown_slug_404_detail_shape(self, api_client):
        response = api_client.get('/api/projects/does-not-exist/')
        assert response.status_code == 404
        assert response.json() == {'detail': 'Not found.'}


# ═════════════════════════════════════════════════════════════════════════════
# #4 — nested shapes: experience ref + galleries (§3.3)
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestProjectDetailNested:

    def test_experience_light_ref_keys_exactly(self, api_client):
        experience = make_experience()
        make_project(title='Linked', project_type='internship',
                     experience=experience)
        body = api_client.get('/api/projects/linked/').json()
        assert set(body['experience']) == EXPERIENCE_REF_KEYS
        assert body['experience']['company'] == 'Qynapse'
        assert body['experience']['period_display'] == 'May 2025 - Nov 2025'

    def test_experience_null_when_unlinked(self, api_client):
        make_project(title='Unlinked')
        body = api_client.get('/api/projects/unlinked/').json()
        assert body['experience'] is None

    def test_gallery_keys_exactly_no_ids_no_raw_paths(self, api_client):
        project = make_project(title='Galleried')
        add_gallery(project, images=2)
        body = api_client.get(f'/api/projects/{project.slug}/').json()
        assert len(body['galleries']) == 1
        gallery = body['galleries'][0]
        assert set(gallery) == GALLERY_KEYS
        assert 'id' not in gallery
        assert len(gallery['images']) == 2
        for image in gallery['images']:
            assert set(image) == GALLERY_IMAGE_KEYS
            assert image['image_url'].startswith('http')


# ═════════════════════════════════════════════════════════════════════════════
# #5 GET /api/projects/{slug}/files/ (§3.8)
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestProjectFilesEndpoint:

    def test_no_demo_files_404_detail_shape(self, api_client):
        make_project(title='No Files')
        response = api_client.get('/api/projects/no-files/files/')
        assert response.status_code == 404
        assert response.json() == {
            'detail': 'No demo files available for this project'}

    def test_with_demo_files_returns_file_url_only(self, api_client):
        make_project(title='Zipped', demo_files_path='project-files/minishell.zip')
        with mock.patch('projects.views.CustomS3Storage') as storage_cls:
            storage_cls.return_value.url.return_value = (
                'https://media.aouichou.me/project-files/minishell.zip')
            response = api_client.get('/api/projects/zipped/files/')
        assert response.status_code == 200
        assert response.json() == {
            'file_url': 'https://media.aouichou.me/project-files/minishell.zip'}

    def test_unknown_slug_404(self, api_client):
        response = api_client.get('/api/projects/ghost/files/')
        assert response.status_code == 404


# ═════════════════════════════════════════════════════════════════════════════
# #6 GET /api/experiences/ (§3.4 — plain array, light shape)
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestExperiencesList:

    def test_plain_array_not_enveloped(self, api_client):
        make_experience()
        response = api_client.get('/api/experiences/')
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        assert len(response.json()) == 1

    def test_list_keys_exactly(self, api_client):
        make_experience()
        item = api_client.get('/api/experiences/').json()[0]
        assert set(item) == EXPERIENCE_LIST_KEYS, (
            f'missing={EXPERIENCE_LIST_KEYS - set(item)} '
            f'extra={set(item) - EXPERIENCE_LIST_KEYS}')

    def test_overview_is_detail_only(self, api_client):
        make_experience(overview='secret hero body')
        item = api_client.get('/api/experiences/').json()[0]
        assert 'overview' not in item

    def test_period_display_formats(self, api_client):
        make_experience()
        item = api_client.get('/api/experiences/').json()[0]
        assert item['period_display'] == 'May 2025 - Nov 2025'

    def test_period_display_open_ended(self, api_client):
        make_experience(slug='open', end_date=None)
        item = api_client.get('/api/experiences/').json()[0]
        assert item['period_display'] == 'May 2025 - Present'

    def test_project_count(self, api_client):
        experience = make_experience()
        make_project(title='One', project_type='internship',
                     experience=experience)
        make_project(title='Two', project_type='internship',
                     experience=experience)
        item = api_client.get('/api/experiences/').json()[0]
        assert item['project_count'] == 2

    def test_inactive_experiences_hidden(self, api_client):
        make_experience(slug='active-one')
        make_experience(slug='inactive-one', is_active=False)
        data = api_client.get('/api/experiences/').json()
        assert len(data) == 1
        assert data[0]['slug'] == 'active-one'


# ═════════════════════════════════════════════════════════════════════════════
# #7 GET /api/experiences/{slug}/ (§3.5 — hero detail + nested cards)
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestExperienceDetail:

    def test_detail_keys_exactly(self, api_client):
        make_experience()
        response = api_client.get('/api/experiences/qynapse-healthcare/')
        assert response.status_code == 200
        body = response.json()
        assert set(body) == EXPERIENCE_DETAIL_KEYS, (
            f'missing={EXPERIENCE_DETAIL_KEYS - set(body)} '
            f'extra={set(body) - EXPERIENCE_DETAIL_KEYS}')

    def test_nested_projects_use_the_card_serializer(self, api_client):
        experience = make_experience()
        make_project(title='Nested One', project_type='internship',
                     experience=experience, is_featured=False)
        body = api_client.get(
            '/api/experiences/qynapse-healthcare/').json()
        assert len(body['projects']) == 1
        assert set(body['projects'][0]) == CARD_KEYS

    def test_duration_months_inclusive_formula(self, api_client):
        """§2.3: (ey−sy)×12 + (em−sm) + 1 — inclusive of both end months."""
        make_experience(start_date='2025-05-02', end_date='2025-11-28')
        body = api_client.get('/api/experiences/qynapse-healthcare/').json()
        assert body['duration_months'] == 7

    def test_duration_months_open_ended_recomputes_vs_today(self, api_client):
        """§2.3: end_date null → recomputed against today."""
        make_experience(slug='open-ended', start_date='2025-05-02',
                        end_date=None)
        body = api_client.get('/api/experiences/open-ended/').json()
        today = datetime.date.today()
        expected = (today.year - 2025) * 12 + (today.month - 5) + 1
        assert body['duration_months'] == expected

    def test_unknown_slug_404(self, api_client):
        response = api_client.get('/api/experiences/ghost/')
        assert response.status_code == 404
        assert response.json() == {'detail': 'Not found.'}


# ═════════════════════════════════════════════════════════════════════════════
# #8 POST /api/contact/ (§3.6, §4.1)
# ═════════════════════════════════════════════════════════════════════════════

VALID_CONTACT = {
    'name': 'Alice Tester',
    'email': 'alice@example.com',
    'message': 'Hello from the contract suite.',
}


@pytest.mark.django_db
class TestContactEndpoint:

    def test_valid_post_201_shape_exactly(self, api_client):
        response = api_client.post('/api/contact/', data=VALID_CONTACT,
                                   format='json')
        assert response.status_code == 201
        assert response.json() == {
            'name': 'Alice Tester',
            'email': 'alice@example.com',
            'message': 'Hello from the contract suite.',
        }

    def test_invalid_email_400_field_error_shape(self, api_client):
        payload = {**VALID_CONTACT, 'email': 'not-an-email'}
        response = api_client.post('/api/contact/', data=payload,
                                   format='json')
        assert response.status_code == 400
        body = response.json()
        assert set(body) == {'email'}
        assert isinstance(body['email'], list)

    def test_missing_fields_400_field_error_map(self, api_client):
        response = api_client.post('/api/contact/', data={}, format='json')
        assert response.status_code == 400
        body = response.json()
        assert set(body) == {'name', 'email', 'message'}
        for value in body.values():
            assert isinstance(value, list)

    def test_rate_limited_429_uses_detail_key(self, api_client):
        """§4.1 KEY CHANGE: 429 body is {"detail": ...} — the old "error" key
        is renamed so v2 has ONE error type. Rate: 5/min/IP (§3.6)."""
        with override_settings(RATELIMIT_ENABLE=True), \
             mock.patch('django_ratelimit.core.get_usage',
                        return_value={'should_limit': True}):
            response = api_client.post('/api/contact/', data=VALID_CONTACT,
                                       format='json')
        assert response.status_code == 429
        body = response.json()
        assert set(body) == {'detail'}
        assert 'error' not in body


# ═════════════════════════════════════════════════════════════════════════════
# #9 GET /api/auth/terminal-token/ (§3.7 — 30/min/IP is NEW)
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestTerminalTokenEndpoint:

    def test_mint_200_token_only(self, api_client):
        response = api_client.get('/api/auth/terminal-token/')
        assert response.status_code == 200
        assert set(response.json()) == {'token'}

    def test_token_is_hs256_guest_jwt_purpose_scoped(self, api_client):
        token = api_client.get('/api/auth/terminal-token/').json()['token']
        payload = pyjwt.decode(token, settings.SECRET_KEY,
                               algorithms=['HS256'])
        assert payload['purpose'] == 'terminal_access'
        assert payload['username'] == 'guest'
        # §3.7: 5-minute expiry
        now = datetime.datetime.now(datetime.timezone.utc)
        exp = datetime.datetime.fromtimestamp(payload['exp'],
                                              tz=datetime.timezone.utc)
        assert datetime.timedelta(0) < exp - now <= datetime.timedelta(
            minutes=5, seconds=30)

    def test_throttle_engages_429_detail_shape(self, api_client):
        """§3.7 NEW requirement: 30/min/IP (security review C7 — the mint is
        currently unthrottled). The throttle must engage and answer with the
        §4.1 429 shape."""
        with override_settings(RATELIMIT_ENABLE=True), \
             mock.patch('django_ratelimit.core.get_usage',
                        return_value={'should_limit': True}):
            response = api_client.get('/api/auth/terminal-token/')
        assert response.status_code == 429
        body = response.json()
        assert set(body) == {'detail'}
        assert 'error' not in body

    def test_mint_does_not_require_authentication(self, api_client):
        api_client.credentials()
        response = api_client.get('/api/auth/terminal-token/')
        assert response.status_code == 200


# ═════════════════════════════════════════════════════════════════════════════
# #1/#2 meta root + healthz · §7 kill-list: /api/health/ is DEAD
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestMetaSurfaces:

    def test_api_root_shape_exactly(self, api_client):
        response = api_client.get('/api/')
        assert response.status_code == 200
        assert response.json() == {'status': 'ok',
                                   'service': 'portfolio-api'}

    def test_healthz_shape_exactly(self, api_client):
        response = api_client.get('/healthz')
        assert response.status_code == 200
        assert response.json() == {'status': 'healthy'}

    def test_api_health_duplicate_is_killed(self, api_client):
        """§7 kill-list: /api/health/ duplicates /healthz → 404."""
        response = api_client.get('/api/health/')
        assert response.status_code == 404

    def test_healthz_is_root_level_not_under_api(self, api_client):
        """§1 endpoint #2: Render's health check path is /healthz (no /api
        prefix)."""
        response = api_client.get('/api/healthz')
        assert response.status_code == 404
