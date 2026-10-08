# tests/integration/test_views_residual_branches.py
"""F2-08 — residual uncovered branches in views.py (post-contract v2).

The contract suite (test_api_contract_v2.py) pins the happy shapes;
this file targets the branches it does not reach:

- ContactSubmissionView.validate_domain: the DNS resolver matrix
  (MX ok, MX-miss→A fallback ok, both miss → reject, resolver timeout →
  allow, unexpected resolver error → allow) — resolver stubbed, no
  network
- generate_terminal_token: the AUTHENTICATED branch (payload carries
  user_id/username) vs the anonymous guest branch
- GET /api/projects/{slug}/files/: S3 URL failure → clean 500 with the
  legacy 'error' key shape ( pre-contract endpoint — shape pinned as-is )

Also closes small residual model/serializer misses discovered in the
F2-08 coverage pass (Experience slug dedup, Project.clean branches,
GalleryImage.__str__, GalleryImageSerializer.image_url None branch).
"""

from unittest import mock

import dns.resolver
import jwt as pyjwt
import pytest
from django.conf import settings
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.test import override_settings
from projects.models import Experience, Gallery, GalleryImage, Project
from projects.views import ContactSubmissionView, generate_terminal_token

from tests.conftest import make_project

# ═════════════════════════════════════════════════════════════════════════════
# validate_domain — the DNS resolver matrix (resolver stubbed)
# ═════════════════════════════════════════════════════════════════════════════

class TestValidateDomainMatrix:

    def _view(self):
        return ContactSubmissionView()

    def _with_resolver(self, resolver_factory):
        """Patch the Resolver CONSTRUCTOR so validate_domain's internal
        resolver is our fake — no network, fully deterministic."""
        return mock.patch.object(dns.resolver, 'Resolver', resolver_factory)

    def test_mx_record_found_allows(self):
        class FakeResolver:
            def __init__(self):
                self.timeout = self.lifetime = None

            def resolve(self, domain, rdtype):
                assert rdtype == 'MX'
                return ['mx-record']

        with self._with_resolver(FakeResolver):
            ok, message = self._view().validate_domain('a@example.com')
        assert ok is True

    def test_no_mx_but_a_record_allows(self):
        class FakeResolver:
            def __init__(self):
                self.timeout = self.lifetime = None

            def resolve(self, domain, rdtype):
                if rdtype == 'MX':
                    raise dns.resolver.NoAnswer()
                assert rdtype == 'A'
                return ['1.2.3.4']

        with self._with_resolver(FakeResolver):
            ok, message = self._view().validate_domain('a@example.com')
        assert ok is True

    def test_no_mx_and_no_a_record_rejects(self):
        class FakeResolver:
            def __init__(self):
                self.timeout = self.lifetime = None

            def resolve(self, domain, rdtype):
                raise dns.resolver.NXDOMAIN()

        with self._with_resolver(FakeResolver):
            ok, message = self._view().validate_domain('a@nowhere.test')
        assert ok is False
        assert "doesn't appear to be valid" in message

    def test_resolver_lifetime_timeout_allows_submission(self):
        """DNS slowness must not block a legitimate submit (documented
        behavior — fail-open on timeout)."""
        class FakeResolver:
            def __init__(self):
                self.timeout = self.lifetime = None

            def resolve(self, domain, rdtype):
                raise dns.resolver.LifetimeTimeout()

        with self._with_resolver(FakeResolver):
            ok, _ = self._view().validate_domain('a@example.com')
        assert ok is True

    def test_unexpected_resolver_error_fails_open(self):
        class FakeResolver:
            def __init__(self):
                pass

            def resolve(self, domain, rdtype):
                raise RuntimeError('resolver exploded')

        with self._with_resolver(FakeResolver):
            ok, message = self._view().validate_domain('a@example.com')
        assert ok is True
        assert 'allowing submission' in message


# ═════════════════════════════════════════════════════════════════════════════
# generate_terminal_token — authenticated vs anonymous branches
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestGenerateTerminalTokenBranches:

    def _mint_for(self, user):
        from rest_framework.test import APIRequestFactory
        # F4-02: the mint is slug-bound — factory requests carry ?slug=
        if not Project.objects.filter(slug='minishell').exists():
            Project.objects.create(
                slug='minishell', title='Minishell',
                description='d', project_type='school', has_demo=True)
        factory = APIRequestFactory()
        request = factory.get('/api/auth/terminal-token/?slug=minishell')
        request.user = user
        response = generate_terminal_token(request)
        assert response.status_code == 200
        token = response.data['token']
        return pyjwt.decode(token, settings.SECRET_KEY,
                            algorithms=['HS256'])

    def test_anonymous_mints_guest_payload(self):
        from django.contrib.auth.models import AnonymousUser
        payload = self._mint_for(AnonymousUser())
        assert payload['user_id'] is None
        assert payload['username'] == 'guest'
        assert payload['purpose'] == 'terminal_access'
        assert payload['slug'] == 'minishell'
        assert 'exp' in payload

    def test_authenticated_mints_user_payload(self):
        user = User.objects.create_user(
            username='batman', password='x' * 12)
        payload = self._mint_for(user)
        assert payload['user_id'] == user.id
        assert payload['username'] == 'batman'
        assert payload['purpose'] == 'terminal_access'
        assert payload['slug'] == 'minishell'


# ═════════════════════════════════════════════════════════════════════════════
# GET /api/projects/{slug}/files/ — storage failure path
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestProjectFilesStorageFailure:

    def test_s3_url_failure_returns_500_error_shape(self, api_client):
        make_project(title='Broken Files', demo_files_path='files/broken.zip')
        with mock.patch('projects.views.CustomS3Storage') as storage_cls:
            storage_cls.return_value.url.side_effect = \
                RuntimeError('R2 unreachable')
            response = api_client.get('/api/projects/broken-files/files/')
        assert response.status_code == 500
        assert response.json() == {'error': 'Could not retrieve project files'}


# ═════════════════════════════════════════════════════════════════════════════
# Residual model / serializer branches surfaced by the F2-08 pass
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestProjectSaveAutoSlug:

    def test_save_generates_slug_when_missing(self):
        """Project.save auto-slug (models.py:250) — conftest's make_project
        pre-sets the slug, so this path is only reachable by saving a
        slug-less row directly."""
        p = Project.objects.create(
            title='Auto Slugged', description='d', project_type='school')
        assert p.slug == 'auto-slugged'


@pytest.mark.django_db
class TestExperienceSlugDedup:

    def test_experience_slug_auto_and_dedup(self):
        e1 = Experience.objects.create(
            company='Acme', role='R', subtitle='S', start_date='2025-01-01',
            overview='o')
        e2 = Experience.objects.create(
            company='Acme', role='R2', subtitle='S', start_date='2025-02-01',
            overview='o')
        assert e1.slug == 'acme'
        assert e2.slug == 'acme-1'

    def test_experience_slug_preserved_when_set(self):
        e = Experience.objects.create(
            company='Acme', role='R', subtitle='S', slug='custom-exp',
            start_date='2025-01-01', overview='o')
        assert e.slug == 'custom-exp'


@pytest.mark.django_db
class TestProjectCleanBranches:

    def test_clean_generates_slug_when_missing(self):
        p = Project(title='Slugless', description='d',
                    project_type='school', is_featured=False)
        p.clean()
        assert p.slug == 'slugless'

    def test_clean_rejects_duplicate_slug(self):
        make_project(title='Taken', slug='taken')
        p = Project(title='Other', description='d', slug='taken',
                    project_type='school', is_featured=False)
        with pytest.raises(ValidationError, match='Slug must be unique'):
            p.clean()

    def test_clean_rejects_internship_without_experience(self):
        p = Project(title='Orphan Intern', description='d',
                    project_type='internship', is_featured=False)
        with pytest.raises(ValidationError,
                           match='must link an experience'):
            p.clean()


@pytest.mark.django_db
class TestGalleryImageStrAndUrl:

    def test_gallery_image_str(self, project):
        gallery = Gallery.objects.create(project=project, name='Shots')
        image = GalleryImage.objects.create(
            gallery=gallery, caption='prompt', order=3,
            image='galleries/2025/01/01/pic.png')
        assert '3' in str(image)
        assert 'Shots' in str(image) or 'Image' in str(image)

    def test_image_url_is_none_when_image_empty(self):
        """GalleryImageSerializer.get_image_url: a row with no stored file
        must serialize to None, not raise (the None branch)."""
        from projects.serializers import GalleryImageSerializer

        class FakeImage:
            image = None

        serializer = GalleryImageSerializer(FakeImage())
        assert serializer.data['image_url'] is None
