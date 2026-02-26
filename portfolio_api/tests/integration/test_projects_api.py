# tests/integration/test_projects_api.py
"""Integration tests for the Projects REST API endpoints."""

import pytest
from django.urls import reverse

from tests.conftest import make_project

# ═════════════════════════════════════════════════════════════════════════════
# GET /api/projects/
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestProjectListEndpoint:

    def test_returns_200_with_no_projects(self, api_client):
        url = reverse('project-list')
        response = api_client.get(url)
        assert response.status_code == 200

    def test_returns_only_featured_projects_by_default(self, api_client, db):
        make_project(title='Featured', is_featured=True)
        make_project(title='Not Featured', is_featured=False)
        url = reverse('project-list')
        response = api_client.get(url)
        data = response.json()
        # Default = featured only
        assert len(data) == 1
        assert data[0]['title'] == 'Featured'

    def test_include_all_param_returns_all(self, api_client, db):
        make_project(title='Featured', is_featured=True)
        make_project(title='Regular', is_featured=False)
        url = reverse('project-list')
        response = api_client.get(url, {'include_all': 'true'})
        assert len(response.json()) == 2

    def test_filter_by_project_type_school(self, api_client, db):
        make_project(title='School P', project_type='school', is_featured=True)
        make_project(title='Internship P', project_type='internship', is_featured=True)
        url = reverse('project-list')
        response = api_client.get(url, {'project_type': 'school', 'include_all': 'true'})
        data = response.json()
        assert all(p['project_type'] == 'school' for p in data)

    def test_filter_by_project_type_internship(self, api_client, db):
        make_project(title='School P', project_type='school', is_featured=True)
        make_project(title='Internship P', project_type='internship', is_featured=True)
        url = reverse('project-list')
        response = api_client.get(url, {'project_type': 'internship', 'include_all': 'true'})
        data = response.json()
        assert all(p['project_type'] == 'internship' for p in data)

    def test_response_contains_expected_fields(self, api_client, db):
        make_project(title='Rich Project', is_featured=True)
        url = reverse('project-list')
        response = api_client.get(url)
        item = response.json()[0]
        assert 'title' in item
        assert 'slug' in item
        assert 'description' in item

    def test_featured_projects_ordered_first(self, api_client, db):
        make_project(title='Z Regular', is_featured=False)
        make_project(title='A Featured', is_featured=True)
        url = reverse('project-list')
        response = api_client.get(url, {'include_all': 'true'})
        titles = [p['title'] for p in response.json()]
        # Featured project should come before regular regardless of alphabetical order
        featured_index = titles.index('A Featured')
        regular_index = titles.index('Z Regular')
        assert featured_index < regular_index


# ═════════════════════════════════════════════════════════════════════════════
# GET /api/projects/<slug>/
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestProjectDetailEndpoint:

    def test_returns_200_for_existing_slug(self, api_client, db):
        project = make_project(title='Minishell')
        url = reverse('project-detail', kwargs={'slug': project.slug})
        response = api_client.get(url)
        assert response.status_code == 200

    def test_returns_correct_project(self, api_client, db):
        project = make_project(title='Push Swap')
        url = reverse('project-detail', kwargs={'slug': project.slug})
        response = api_client.get(url)
        assert response.json()['title'] == 'Push Swap'

    def test_returns_404_for_nonexistent_slug(self, api_client):
        url = reverse('project-detail', kwargs={'slug': 'does-not-exist'})
        response = api_client.get(url)
        assert response.status_code == 404

    def test_slug_field_present_in_detail(self, api_client, db):
        project = make_project(title='FDF')
        url = reverse('project-detail', kwargs={'slug': project.slug})
        response = api_client.get(url)
        assert response.json()['slug'] == project.slug

    def test_detail_does_not_require_authentication(self, api_client, db):
        project = make_project(title='Public Project')
        url = reverse('project-detail', kwargs={'slug': project.slug})
        api_client.credentials()  # clear any credentials
        response = api_client.get(url)
        assert response.status_code == 200


# ═════════════════════════════════════════════════════════════════════════════
# GET /api/auth/terminal-token/
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestTerminalTokenEndpoint:

    def test_returns_200_for_anonymous_user(self, api_client):
        url = reverse('terminal_token')
        response = api_client.get(url)
        assert response.status_code == 200

    def test_response_contains_token(self, api_client):
        url = reverse('terminal_token')
        response = api_client.get(url)
        data = response.json()
        assert 'token' in data

    def test_token_is_non_empty_string(self, api_client):
        url = reverse('terminal_token')
        response = api_client.get(url)
        token = response.json().get('token', '')
        assert isinstance(token, str) and len(token) > 10

    def test_token_contains_three_jwt_segments(self, api_client):
        """A JWT always has exactly three base64url segments separated by dots."""
        url = reverse('terminal_token')
        token = api_client.get(url).json()['token']
        assert len(token.split('.')) == 3
