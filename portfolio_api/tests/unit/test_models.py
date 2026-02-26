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
        p.save(bypass_validation=True)
        p.refresh_from_db()
        assert p.slug == 'original'


# ═════════════════════════════════════════════════════════════════════════════
# Project – validation
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestProjectValidation:

    def test_clean_raises_if_no_thumbnail(self):
        p = Project(title='No Thumb', description='desc', slug='no-thumb')
        with pytest.raises(ValidationError, match='Thumbnail is required'):
            p.clean()

    def test_full_clean_raises_if_no_thumbnail(self):
        p = Project(title='No Thumb', description='desc', slug='no-thumb-fc')
        with pytest.raises(ValidationError):
            p.full_clean()

    def test_bypass_validation_skips_thumbnail_check(self):
        """Projects can be saved without thumbnail when bypass_validation=True."""
        p = Project(title='No Thumb Bypass', description='desc', slug='bypass-test')
        p.save(bypass_validation=True)
        assert p.pk is not None

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

    def test_featured_projects_ordered_first(self):
        make_project(title='AAA Regular', is_featured=False)
        make_project(title='ZZZ Featured', is_featured=True)
        titles = list(Project.objects.values_list('title', flat=True))
        assert titles[0] == 'ZZZ Featured'

    def test_non_featured_ordered_by_title(self):
        make_project(title='B Project', is_featured=False)
        make_project(title='A Project', is_featured=False)
        titles = list(
            Project.objects.filter(is_featured=False).values_list('title', flat=True)
        )
        assert titles == ['A Project', 'B Project']


# ═════════════════════════════════════════════════════════════════════════════
# Project – optional fields
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestProjectOptionalFields:

    def test_tech_stack_json_field(self):
        tech = ['C', 'Make', 'Bash']
        p = make_project(tech_stack=tech)
        p.refresh_from_db()
        assert p.tech_stack == tech

    def test_features_json_field(self):
        feats = [{'name': 'Parsing', 'complete': True}]
        p = make_project(features=feats)
        p.refresh_from_db()
        assert p.features[0]['name'] == 'Parsing'

    def test_has_interactive_demo_defaults_false(self):
        p = make_project()
        assert p.has_interactive_demo is False


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
