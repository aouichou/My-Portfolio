# tests/conftest.py
"""Shared pytest fixtures for the portfolio_api test suite."""

import pytest
from django.test import override_settings
from rest_framework.test import APIClient

# ─────────────────────────── helpers ─────────────────────────────────────────

def make_project(**kwargs):
    """
    Create a Project bypassing thumbnail validation (safe for test environments).
    Pass keyword arguments to override defaults.
    """
    from projects.models import Project

    defaults = {
        'title': 'Test Project',
        'description': 'A test project description.',
        'project_type': 'school',
        'is_featured': False,
    }
    defaults.update(kwargs)

    project = Project(**defaults)
    if not project.slug:
        from django.utils.text import slugify
        project.slug = slugify(defaults['title'])
    project.save(bypass_validation=True)
    return project


# ─────────────────────────── fixtures ────────────────────────────────────────

@pytest.fixture
def api_client():
    """A DRF APIClient ready to make requests."""
    return APIClient()


@pytest.fixture
def project(db):
    """A saved Project instance available to any test that requests it."""
    return make_project()


@pytest.fixture
def featured_project(db):
    """A featured Project instance."""
    return make_project(title='Featured Project', is_featured=True)


@pytest.fixture
def school_project(db):
    """A school-type Project."""
    return make_project(title='School Project', project_type='school')


@pytest.fixture
def internship_project(db):
    """An internship-type Project."""
    return make_project(
        title='Internship Project',
        project_type='internship',
        company='Acme Corp',
        role='Backend Engineer',
    )


@pytest.fixture
def multiple_projects(db):
    """Return a list of several saved projects for list-endpoint tests."""
    projects = []
    for i in range(5):
        projects.append(
            make_project(
                title=f'Project {i}',
                is_featured=(i < 2),
            )
        )
    return projects
