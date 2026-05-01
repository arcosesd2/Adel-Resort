"""
Tests for the revenue_insights endpoint and its helper.

Covers all three phases of comprehensive revenue analytics:
- Phase 1: breakdowns (room/payment/weekday-weekend), KPIs (ADR/RevPAR/lead-time)
- Phase 2: voucher ROI, manual_discount persistence, walk-in detector, cancellations
- Phase 3: role gating (top_spenders), MoM/YoY comparisons, date-range filter
"""
from datetime import date, datetime, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from analytics.views import _compute_revenue_insights
from bookings.models import Booking, BookingStatus
from payments.models import Payment, PaymentStatus, PaymentType
from rooms.models import Room, BookingMode, RoomType
from vouchers.models import Voucher, VoucherUsage

User = get_user_model()


def _slot(d, kind='overnight'):
    return {'date': d.isoformat(), 'slot': kind}


class RevenueInsightsTestBase(TestCase):
    """Shared fixtures for the revenue_insights test suite."""

    @classmethod
    def setUpTestData(cls):
        cls.staff = User.objects.create_user(
            username='staff_user', password='x',
            first_name='Staff', last_name='User',
            is_staff=True,
        )
        cls.admin = User.objects.create_user(
            username='admin_user', password='x',
            first_name='Admin', last_name='User',
            is_admin=True,  # save() forces is_staff=True
        )
        cls.superadmin = User.objects.create_user(
            username='super_user', password='x',
            first_name='Super', last_name='Admin',
            is_superadmin=True,
        )
        cls.guest_a = User.objects.create_user(
            username='guest_a', password='x',
            first_name='Alice', last_name='Anderson',
        )
        cls.guest_b = User.objects.create_user(
            username='guest_b', password='x',
            first_name='Bob', last_name='Brown',
        )
        # Auto-generated walk-in user (matches the prefix the onsite booking
        # endpoint creates at bookings/views.py:135).
        cls.walkin_guest = User.objects.create_user(
            username='walkin-deadbeef', password='x',
            first_name='WalkIn', last_name='Guest',
        )

        cls.room_cottage = Room.objects.create(
            name='Cottage A', room_type=RoomType.COTTAGE,
            booking_mode=BookingMode.SLOT, description='',
            day_price=Decimal('1000.00'), night_price=Decimal('1500.00'),
            max_rooms=1,
        )
        cls.room_kubo = Room.objects.create(
            name='Kubo 1', room_type=RoomType.KUBO,
            booking_mode=BookingMode.OVERNIGHT, description='',
            day_price=Decimal('2500.00'),
            max_rooms=2,
        )


class Phase1BreakdownsTests(RevenueInsightsTestBase):
    """Phase 1: revenue breakdowns and hotel KPIs."""

    def test_excluded_from_sales_skipped_in_revenue_by_room(self):
        today = date.today()
        # Counted booking
        Booking.objects.create(
            user=self.guest_a, room=self.room_cottage,
            check_in=today, check_out=today + timedelta(days=1),
            slots=[_slot(today, 'day')],
            total_price=Decimal('1000.00'),
            status=BookingStatus.CONFIRMED,
            excluded_from_sales=False,
        )
        # Excluded booking — same room, should not contribute to revenue
        Booking.objects.create(
            user=self.guest_a, room=self.room_cottage,
            check_in=today, check_out=today + timedelta(days=1),
            slots=[_slot(today, 'day')],
            total_price=Decimal('999999.00'),
            status=BookingStatus.CONFIRMED,
            excluded_from_sales=True,
        )

        data = _compute_revenue_insights(False, None, None)
        cottage_row = next(r for r in data['revenue_by_room'] if r['room__id'] == self.room_cottage.id)
        self.assertEqual(cottage_row['revenue'], 1000.0)
        self.assertEqual(cottage_row['bookings'], 1)

    def test_weekday_vs_weekend_split(self):
        # Pick a known Monday and Saturday
        monday = date(2026, 4, 6)   # Monday (weekday() == 0)
        saturday = date(2026, 4, 11)  # Saturday (weekday() == 5)
        Booking.objects.create(
            user=self.guest_a, room=self.room_cottage,
            check_in=monday, check_out=monday + timedelta(days=1),
            slots=[_slot(monday, 'day')],
            total_price=Decimal('500.00'),
            status=BookingStatus.CONFIRMED,
        )
        Booking.objects.create(
            user=self.guest_b, room=self.room_cottage,
            check_in=saturday, check_out=saturday + timedelta(days=1),
            slots=[_slot(saturday, 'day')],
            total_price=Decimal('800.00'),
            status=BookingStatus.COMPLETED,
        )

        data = _compute_revenue_insights(False, date(2026, 1, 1), date(2026, 12, 31))
        self.assertEqual(data['weekday_vs_weekend']['weekday']['revenue'], 500.0)
        self.assertEqual(data['weekday_vs_weekend']['weekday']['bookings'], 1)
        self.assertEqual(data['weekday_vs_weekend']['weekend']['revenue'], 800.0)
        self.assertEqual(data['weekday_vs_weekend']['weekend']['bookings'], 1)

    def test_payment_type_buckets_null_as_onsite(self):
        today = date.today()
        b_full = Booking.objects.create(
            user=self.guest_a, room=self.room_kubo,
            check_in=today, check_out=today + timedelta(days=1),
            slots=[_slot(today, 'overnight')],
            total_price=Decimal('2500.00'),
            status=BookingStatus.CONFIRMED,
        )
        Payment.objects.create(
            booking=b_full, amount=Decimal('2500.00'),
            payment_type=PaymentType.FULL, status=PaymentStatus.SUCCEEDED,
        )
        # Booking without a Payment row → bucketed as 'onsite'
        Booking.objects.create(
            user=self.guest_b, room=self.room_kubo,
            check_in=today, check_out=today + timedelta(days=1),
            slots=[_slot(today, 'overnight')],
            total_price=Decimal('2500.00'),
            status=BookingStatus.CONFIRMED,
        )

        data = _compute_revenue_insights(False, None, None)
        buckets = {r['payment__payment_type']: r for r in data['revenue_by_payment_type']}
        self.assertIn('full', buckets)
        self.assertIn('onsite', buckets)
        self.assertEqual(buckets['full']['revenue'], 2500.0)
        self.assertEqual(buckets['onsite']['revenue'], 2500.0)

    def test_adr_uses_occupied_room_nights(self):
        # Two slot-bookings within the 30-day short window.
        today = date.today()
        d1 = today - timedelta(days=2)
        d2 = today - timedelta(days=1)
        Booking.objects.create(
            user=self.guest_a, room=self.room_kubo,
            check_in=d1, check_out=d1 + timedelta(days=2),
            slots=[_slot(d1, 'overnight'), _slot(d2, 'overnight')],
            total_price=Decimal('5000.00'),
            status=BookingStatus.CONFIRMED,
        )

        data = _compute_revenue_insights(False, None, None)
        self.assertEqual(data['occupied_room_nights'], 2)
        self.assertEqual(data['adr'], 2500.0)  # 5000 / 2 nights

    def test_lead_time_buckets(self):
        today = date.today()
        # Build a booking whose `created_at` falls in the long window AND check_in is 10 days later
        b = Booking.objects.create(
            user=self.guest_a, room=self.room_cottage,
            check_in=today + timedelta(days=10),
            check_out=today + timedelta(days=11),
            slots=[_slot(today + timedelta(days=10), 'day')],
            total_price=Decimal('1000.00'),
            status=BookingStatus.CONFIRMED,
        )
        # The auto_now_add on created_at means it's "today", so lead-time is 10 → 8-14 bucket
        data = _compute_revenue_insights(False, None, None)
        buckets = {b['bucket']: b['count'] for b in data['lead_time_buckets']}
        self.assertEqual(buckets['8-14'], 1)
        self.assertEqual(buckets['0'] + buckets['1-3'] + buckets['4-7'] + buckets['15-30'] + buckets['31+'], 0)


class Phase2DiscountsTests(RevenueInsightsTestBase):
    """Phase 2: vouchers, manual_discount, cancellations, walk-in detector."""

    def test_walkin_detector_matches_username_prefix(self):
        today = date.today()
        # Walk-in via auto-generated username
        Booking.objects.create(
            user=self.walkin_guest, room=self.room_cottage,
            check_in=today, check_out=today + timedelta(days=1),
            slots=[_slot(today, 'day')],
            total_price=Decimal('1000.00'),
            status=BookingStatus.CONFIRMED,
        )
        # Online booking
        Booking.objects.create(
            user=self.guest_a, room=self.room_cottage,
            check_in=today, check_out=today + timedelta(days=1),
            slots=[_slot(today, 'day')],
            total_price=Decimal('1000.00'),
            status=BookingStatus.CONFIRMED,
        )

        data = _compute_revenue_insights(False, None, None)
        self.assertEqual(data['walkin_vs_online']['walkin']['count'], 1)
        self.assertEqual(data['walkin_vs_online']['online']['count'], 1)
        self.assertEqual(data['walkin_vs_online']['walkin']['revenue'], 1000.0)
        self.assertEqual(data['walkin_vs_online']['online']['revenue'], 1000.0)

    def test_walkin_detector_matches_is_backdated(self):
        today = date.today()
        # Backdated booking — registered username, but flagged as walk-in
        Booking.objects.create(
            user=self.guest_a, room=self.room_cottage,
            check_in=today - timedelta(days=2),
            check_out=today - timedelta(days=1),
            slots=[_slot(today - timedelta(days=2), 'day')],
            total_price=Decimal('1500.00'),
            status=BookingStatus.COMPLETED,
            is_backdated=True,
        )

        data = _compute_revenue_insights(False, None, None)
        self.assertEqual(data['walkin_vs_online']['walkin']['count'], 1)
        self.assertEqual(data['walkin_vs_online']['walkin']['revenue'], 1500.0)
        self.assertEqual(data['walkin_vs_online']['online']['count'], 0)

    def test_manual_discount_total_aggregates_across_bookings(self):
        today = date.today()
        Booking.objects.create(
            user=self.guest_a, room=self.room_cottage,
            check_in=today, check_out=today + timedelta(days=1),
            slots=[_slot(today, 'day')],
            total_price=Decimal('900.00'),
            status=BookingStatus.CONFIRMED,
            manual_discount=Decimal('100.00'),
            manual_discount_type='fixed',
        )
        Booking.objects.create(
            user=self.guest_b, room=self.room_cottage,
            check_in=today, check_out=today + timedelta(days=1),
            slots=[_slot(today, 'day')],
            total_price=Decimal('800.00'),
            status=BookingStatus.CONFIRMED,
            manual_discount=Decimal('200.00'),
            manual_discount_type='percentage',
        )

        data = _compute_revenue_insights(False, None, None)
        self.assertEqual(data['manual_discount_total'], 300.0)

    def test_voucher_roi(self):
        today = date.today()
        voucher = Voucher.objects.create(
            code='SUMMER20', discount_type='percentage', discount_value=Decimal('20'),
            valid_from=timezone.now() - timedelta(days=7),
            valid_until=timezone.now() + timedelta(days=30),
            is_active=True,
        )
        booking = Booking.objects.create(
            user=self.guest_a, room=self.room_kubo,
            check_in=today, check_out=today + timedelta(days=1),
            slots=[_slot(today, 'overnight')],
            total_price=Decimal('2000.00'),
            status=BookingStatus.CONFIRMED,
        )
        VoucherUsage.objects.create(
            voucher=voucher, booking=booking, user=self.guest_a,
            discount_amount=Decimal('500.00'),
        )

        data = _compute_revenue_insights(False, None, None)
        self.assertEqual(len(data['voucher_roi']), 1)
        row = data['voucher_roi'][0]
        self.assertEqual(row['voucher__code'], 'SUMMER20')
        self.assertEqual(row['uses'], 1)
        self.assertEqual(row['total_discount'], 500.0)
        self.assertEqual(row['revenue_after'], 2000.0)
        self.assertEqual(row['roi'], 4.0)  # 2000 / 500

    def test_cancellation_stats_and_lost_revenue(self):
        today = date.today()
        Booking.objects.create(
            user=self.guest_a, room=self.room_cottage,
            check_in=today, check_out=today + timedelta(days=1),
            slots=[_slot(today, 'day')],
            total_price=Decimal('1000.00'),
            status=BookingStatus.CONFIRMED,
        )
        Booking.objects.create(
            user=self.guest_b, room=self.room_cottage,
            check_in=today, check_out=today + timedelta(days=1),
            slots=[_slot(today, 'day')],
            total_price=Decimal('1500.00'),
            status=BookingStatus.CANCELLED,
        )

        data = _compute_revenue_insights(False, None, None)
        self.assertEqual(data['cancellation_stats']['total'], 2)
        self.assertEqual(data['cancellation_stats']['cancelled'], 1)
        self.assertEqual(data['cancellation_stats']['rate_pct'], 50.0)
        self.assertEqual(data['lost_revenue'], 1500.0)


class Phase3RoleGatingTests(RevenueInsightsTestBase):
    """Phase 3: role-based payload split and date-range filter."""

    def test_top_spenders_only_for_superadmin(self):
        today = date.today()
        Booking.objects.create(
            user=self.guest_a, room=self.room_cottage,
            check_in=today, check_out=today + timedelta(days=1),
            slots=[_slot(today, 'day')],
            total_price=Decimal('5000.00'),
            status=BookingStatus.CONFIRMED,
        )

        staff_data = _compute_revenue_insights(False, None, None)
        super_data = _compute_revenue_insights(True, None, None)

        self.assertNotIn('top_spenders', staff_data)
        self.assertIn('top_spenders', super_data)
        self.assertEqual(len(super_data['top_spenders']), 1)
        self.assertEqual(super_data['top_spenders'][0]['guest_name'], 'Alice Anderson')

    def test_date_range_excludes_out_of_window(self):
        # In-window booking
        Booking.objects.create(
            user=self.guest_a, room=self.room_cottage,
            check_in=date(2026, 4, 15),
            check_out=date(2026, 4, 16),
            slots=[_slot(date(2026, 4, 15), 'day')],
            total_price=Decimal('1000.00'),
            status=BookingStatus.CONFIRMED,
        )
        # Out-of-window booking
        Booking.objects.create(
            user=self.guest_b, room=self.room_cottage,
            check_in=date(2025, 4, 15),
            check_out=date(2025, 4, 16),
            slots=[_slot(date(2025, 4, 15), 'day')],
            total_price=Decimal('9999.00'),
            status=BookingStatus.CONFIRMED,
        )
        # Update the second booking's created_at directly to be in 2025
        Booking.objects.filter(user=self.guest_b).update(
            created_at=datetime(2025, 4, 14, tzinfo=timezone.get_current_timezone()),
        )

        data = _compute_revenue_insights(
            False, date(2026, 1, 1), date(2026, 12, 31),
        )
        room_revenues = {r['room__id']: r['revenue'] for r in data['revenue_by_room']}
        # Only the 2026 booking should count
        self.assertEqual(room_revenues.get(self.room_cottage.id), 1000.0)


class RevenueInsightsAPITests(RevenueInsightsTestBase):
    """End-to-end HTTP tests of /api/analytics/revenue-insights/."""

    def setUp(self):
        self.client = APIClient()

    def test_unauthenticated_request_rejected(self):
        url = reverse('revenue-insights')
        res = self.client.get(url)
        self.assertEqual(res.status_code, 401)

    def test_regular_guest_forbidden(self):
        self.client.force_authenticate(user=self.guest_a)
        res = self.client.get(reverse('revenue-insights'))
        self.assertEqual(res.status_code, 403)

    def test_plain_staff_without_admin_role_forbidden(self):
        # IsAdminOrSuperAdmin requires is_admin OR is_superadmin.
        # is_staff=True alone is not enough — same gating as the existing admin_dashboard.
        self.client.force_authenticate(user=self.staff)
        res = self.client.get(reverse('revenue-insights'))
        self.assertEqual(res.status_code, 403)

    def test_admin_gets_payload_without_top_spenders(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(reverse('revenue-insights'))
        self.assertEqual(res.status_code, 200)
        self.assertIn('revenue_by_room', res.data)
        self.assertIn('comparisons', res.data)
        self.assertNotIn('top_spenders', res.data)

    def test_superadmin_gets_top_spenders(self):
        today = date.today()
        Booking.objects.create(
            user=self.guest_a, room=self.room_cottage,
            check_in=today, check_out=today + timedelta(days=1),
            slots=[_slot(today, 'day')],
            total_price=Decimal('1000.00'),
            status=BookingStatus.CONFIRMED,
        )
        self.client.force_authenticate(user=self.superadmin)
        res = self.client.get(reverse('revenue-insights'))
        self.assertEqual(res.status_code, 200)
        self.assertIn('top_spenders', res.data)

    def test_export_top_guests_blocked_for_admin(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(reverse('export-top-guests-csv'))
        self.assertEqual(res.status_code, 403)

    def test_export_top_guests_allowed_for_superadmin(self):
        self.client.force_authenticate(user=self.superadmin)
        res = self.client.get(reverse('export-top-guests-csv'))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res['Content-Type'], 'text/csv')
