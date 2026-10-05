# tests/integration/test_projects_api.py
"""Integration tests for the Projects REST API endpoints.

Aligned to the frozen contract v2 (docs/designs/2026-10-05-api-contract-v2.md,
F2-03): the list is the full ledger (Q1 countersigned YES — featured gate
and include_all param are killed; is_featured stays a field), responses are
paginated {count, next, previous, results} (§3.2/§4.3), ordering is the
ledger (order, title). The exhaustive clause-by-clause suite lives in
tests/test_api_contract_v2.py; these are the per-route integration rails."""

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

    def test_returns_full_ledger_by_default(self, api_client, db):
        """Q1: featured and unfeatured rows are ALL ledger rows now."""
        make_project(title='Featured', is_featured=True)
        make_project(title='Not Featured', is_featured=False)
        url = reverse('project-list')
        response = api_client.get(url)
        data = response.json()
        assert data['count'] == 2
        assert len(data['results']) == 2

    def test_response_is_paginated_envelope(self, api_client, db):
        make_project(title='P')
        url = reverse('project-list')
        data = api_client.get(url).json()
        assert set(data) == {'count', 'next', 'previous', 'results'}

    def test_filter_by_project_type_school(self, api_client, db):
        make_project(title='School P', project_type='school')
        make_project(title='Internship P', project_type='internship')
        url = reverse('project-list')
        response = api_client.get(url, {'project_type': 'school'})
        data = response.json()
        assert data['count'] == 1
        assert all(p['project_type'] == 'school' for p in data['results'])

    def test_filter_by_project_type_internship(self, api_client, db):
        make_project(title='School P', project_type='school')
        make_project(title='Internship P', project_type='internship')
        url = reverse('project-list')
        response = api_client.get(url, {'project_type': 'internship'})
        data = response.json()
        assert data['count'] == 1
        assert all(p['project_type'] == 'internship' for p in data['results'])

    def test_response_contains_expected_fields(self, api_client, db):
        make_project(title='Rich Project')
        url = reverse('project-list')
        response = api_client.get(url)
        item = response.json()['results'][0]
        assert 'title' in item
        assert 'slug' in item
        assert 'description' in item

    def test_ledger_order_not_featured_hoisted(self, api_client, db):
        """§1: fixed server-side ordering (order, title) — featured is NOT
        hoisted (curation moved client-side per Q1)."""
        make_project(title='Z Regular', is_featured=False, order=1)
        make_project(title='A Featured', is_featured=True, order=2)
        url = reverse('project-list')
        titles = [p['title'] for p in api_client.get(url).json()['results']]
        assert titles == ['Z Regular', 'A Featured']


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
