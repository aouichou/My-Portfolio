# tests/unit/test_models.py
"""Unit tests for Project and related Django models."""

import pytest
from django.core.exceptions import ValidationError
from projects.models import ContactSubmission, Gallery, Project

from tests.conftest import make_project

# ═════════════════════════════════════════════════════════════════════════════
# Project – slug generation & deduplication
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestProjectSlug:

    def test_slug_auto_generated_from_title(self):
        p = make_project(title='My Awesome Project')
        assert p.slug == 'my-awesome-project'

    def test_slug_preserved_when_already_set(self):
        p = make_project(title='Something', slug='custom-slug')
        assert p.slug == 'custom-slug'

    def test_duplicate_slug_gets_counter_suffix(self):
        make_project(title='Clash', slug='clash')
        p2 = make_project(title='Clash', slug='clash')
        assert p2.slug == 'clash-1'

    def test_third_duplicate_gets_counter_2(self):
        make_project(title='Dup', slug='dup')
        make_project(title='Dup', slug='dup')
        p3 = make_project(title='Dup', slug='dup')
        assert p3.slug == 'dup-2'

    def test_slug_not_regenerated_on_update(self):
        p = make_project(title='Original', slug='original')
        p.description = 'Updated description'
        p.save()
        p.refresh_from_db()
        assert p.slug == 'original'


# ═════════════════════════════════════════════════════════════════════════════
# Project – validation
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestProjectValidation:

    def test_clean_raises_if_featured_without_thumbnail(self):
        """Schema v2 (map §3.3): thumbnail required IFF is_featured."""
        p = Project(title='Featured No Thumb', description='desc', slug='featured-no-thumb', project_type='school', is_featured=True)
        with pytest.raises(ValidationError, match='Thumbnail is required'):
            p.clean()

    def test_full_clean_raises_if_featured_without_thumbnail(self):
        p = Project(title='Featured No Thumb', description='desc', slug='featured-no-thumb-fc', project_type='school', is_featured=True)
        with pytest.raises(ValidationError):
            p.full_clean()

    def test_score_min_validator(self):
        p = Project(title='Scored', description='d', slug='scored', score=-1)
        with pytest.raises(ValidationError):
            p.full_clean()

    def test_score_max_validator(self):
        p = Project(title='Scored', description='d', slug='scored2', score=126)
        with pytest.raises(ValidationError):
            p.full_clean()

    def test_valid_score_boundary_values(self):
        p0 = make_project(title='Score Zero', score=0)
        p125 = make_project(title='Score Max', score=125)
        assert p0.score == 0
        assert p125.score == 125


# ═════════════════════════════════════════════════════════════════════════════
# Project – ordering & __str__
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestProjectMetaAndStr:

    def test_str_returns_title(self):
        p = make_project(title='Minishell')
        assert str(p) == 'Minishell'

    def test_ordering_is_ledger_order(self):
        """Schema v2 (map §3.5): Meta.ordering = ['order', 'title'] — featured-first
        curation lives in the API queryset default, not the model."""
        make_project(title='AAA Order 5', order=5)
        make_project(title='ZZZ Order 1', order=1)
        titles = list(Project.objects.values_list('title', flat=True))
        assert titles == ['ZZZ Order 1', 'AAA Order 5']

    def test_same_order_falls_back_to_title(self):
        make_project(title='B Project')
        make_project(title='A Project')
        titles = list(Project.objects.values_list('title', flat=True))
        assert titles == ['A Project', 'B Project']


# ═════════════════════════════════════════════════════════════════════════════
# Project – optional fields
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestProjectOptionalFields:

    def test_tech_stack_json_field(self):
        tech = [{'name': 'C'}, {'name': 'Make'}, {'name': 'Bash'}]
        p = make_project(tech_stack=tech)
        p.refresh_from_db()
        assert p.tech_stack == tech

    def test_features_json_field(self):
        feats = ['Parsing', 'Execution']
        p = make_project(features=feats)
        p.refresh_from_db()
        assert p.features == feats

    def test_has_demo_defaults_false(self):
        p = make_project()
        assert p.has_demo is False


# ═════════════════════════════════════════════════════════════════════════════
# Gallery
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestGallery:

    def test_gallery_str(self, project):
        gallery = Gallery.objects.create(project=project, name='Screenshots')
        assert 'Screenshots' in str(gallery)
        assert project.title in str(gallery)

    def test_gallery_cascade_delete(self, project):
        Gallery.objects.create(project=project, name='Photos')
        project.delete()
        assert Gallery.objects.count() == 0


# ═════════════════════════════════════════════════════════════════════════════
# ContactSubmission
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestContactSubmission:

    def test_create_contact_submission(self):
        cs = ContactSubmission.objects.create(
            name='Alice',
            email='alice@example.com',
            message='Hello!',
        )
        assert cs.pk is not None
        assert cs.name == 'Alice'

    def test_contact_submission_str_contains_name(self):
        cs = ContactSubmission.objects.create(
            name='Bob',
            email='bob@example.com',
            message='Hi',
        )
        assert 'Bob' in str(cs)
