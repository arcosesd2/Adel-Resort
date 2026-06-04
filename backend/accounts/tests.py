from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from .models import LoginAttempt, RegisteredDevice, User


class SocialLoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_social_login_requires_supabase_token(self):
        response = self.client.post('/api/auth/social-login/', {}, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('Supabase access token is required', response.data['detail'])

    @patch('accounts.views._fetch_supabase_user')
    def test_social_login_creates_user_from_verified_supabase_identity(self, fetch_user):
        fetch_user.return_value = {
            'email': 'Guest@Example.com',
            'email_confirmed_at': '2026-01-01T00:00:00Z',
            'user_metadata': {'full_name': 'Guest Traveler'},
        }

        response = self.client.post(
            '/api/auth/social-login/',
            {'supabase_access_token': 'verified-token'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        fetch_user.assert_called_once_with('verified-token')
        user = User.objects.get(email='guest@example.com')
        self.assertEqual(user.first_name, 'Guest')
        self.assertEqual(user.last_name, 'Traveler')
        self.assertTrue(user.email_verified)
        self.assertIn('access', response.data)
        self.assertNotIn('refresh', response.data)
        self.assertTrue(response.cookies['refresh_token']['httponly'])

    @patch('accounts.views._fetch_supabase_user')
    def test_social_login_rejects_unverified_email(self, fetch_user):
        fetch_user.return_value = {
            'email': 'guest@example.com',
            'email_confirmed_at': None,
            'user_metadata': {},
        }

        response = self.client.post(
            '/api/auth/social-login/',
            {'supabase_access_token': 'unverified-token'},
            format='json',
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(User.objects.exists())

    @patch('accounts.views._fetch_supabase_user')
    def test_social_login_does_not_bypass_staff_device_controls(self, fetch_user):
        staff = User.objects.create_user(
            username='staff',
            email='staff@example.com',
            password='password123',
            first_name='Staff',
            last_name='Member',
            is_admin=True,
        )
        fetch_user.return_value = {
            'email': staff.email,
            'email_confirmed_at': '2026-01-01T00:00:00Z',
            'user_metadata': {'full_name': 'Staff Member'},
        }

        response = self.client.post(
            '/api/auth/social-login/',
            {'supabase_access_token': 'staff-token'},
            format='json',
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            LoginAttempt.objects.get(user=staff).failure_reason,
            'staff_social_login_blocked',
        )


class DeviceAuthorizationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_staff_without_bypass_must_authorize_first_device(self):
        User.objects.create_user(
            username='staff',
            email='staff@example.com',
            password='password123',
            first_name='Staff',
            last_name='Member',
            is_admin=True,
        )

        response = self.client.post(
            '/api/auth/login/',
            {'username': 'staff', 'password': 'password123', 'device_fingerprint': 'fingerprint-a'},
            format='json',
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data['code'], 'device_authorization_required')

    def test_staff_with_bypass_can_login_without_registered_device(self):
        user = User.objects.create_user(
            username='staff',
            email='staff@example.com',
            password='password123',
            first_name='Staff',
            last_name='Member',
            is_admin=True,
            bypass_device_authorization=True,
        )

        response = self.client.post(
            '/api/auth/login/',
            {'username': 'staff', 'password': 'password123', 'device_fingerprint': 'fingerprint-a'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertFalse(RegisteredDevice.objects.filter(user=user).exists())
