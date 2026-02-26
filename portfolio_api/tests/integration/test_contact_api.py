# tests/integration/test_contact_api.py
"""Integration tests for the ContactSubmission API endpoint."""

import pytest
from django.urls import reverse
from projects.models import ContactSubmission

VALID_PAYLOAD = {
    'name': 'Alice Tester',
    'email': 'alice@example.com',
    'message': 'Hello, this is a test message.',
}


@pytest.mark.django_db
class TestContactSubmissionEndpoint:

    def test_post_valid_data_returns_201(self, api_client):
        url = reverse('contact-submission')
        response = api_client.post(url, data=VALID_PAYLOAD, format='json')
        assert response.status_code == 201

    def test_post_creates_db_record(self, api_client):
        url = reverse('contact-submission')
        api_client.post(url, data=VALID_PAYLOAD, format='json')
        assert ContactSubmission.objects.filter(email='alice@example.com').exists()

    def test_post_missing_name_returns_400(self, api_client):
        url = reverse('contact-submission')
        payload = {'email': 'x@example.com', 'message': 'Hi'}
        response = api_client.post(url, data=payload, format='json')
        assert response.status_code == 400

    def test_post_missing_email_returns_400(self, api_client):
        url = reverse('contact-submission')
        payload = {'name': 'Bob', 'message': 'Hi'}
        response = api_client.post(url, data=payload, format='json')
        assert response.status_code == 400

    def test_post_missing_message_returns_400(self, api_client):
        url = reverse('contact-submission')
        payload = {'name': 'Bob', 'email': 'bob@example.com'}
        response = api_client.post(url, data=payload, format='json')
        assert response.status_code == 400

    def test_post_invalid_email_format_returns_400(self, api_client):
        url = reverse('contact-submission')
        payload = {**VALID_PAYLOAD, 'email': 'not-an-email'}
        response = api_client.post(url, data=payload, format='json')
        assert response.status_code == 400

    def test_post_empty_payload_returns_400(self, api_client):
        url = reverse('contact-submission')
        response = api_client.post(url, data={}, format='json')
        assert response.status_code == 400

    def test_get_method_not_allowed(self, api_client):
        url = reverse('contact-submission')
        response = api_client.get(url)
        assert response.status_code == 405
