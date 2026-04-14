export const metadata = {
  title: 'Refund & Cancellation Policy',
  description: 'Refund and cancellation policy for bookings at Adel Beach Resort.',
}

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl font-bold text-gray-900 mb-3">Refund & Cancellation Policy</h1>
          <p className="text-gray-500 text-sm">Last updated: April 2026</p>
        </div>

        <div className="card p-8 md:p-12 prose prose-gray max-w-none">

          <h2>1. Booking & Payment</h2>
          <p>
            We accept payments via GCash. Upon booking, you may choose full payment or a 20%
            downpayment option. If you select the downpayment option, the remaining balance must
            be settled upon check-in at the resort.
          </p>
          <p>
            Payment proof must be submitted within <strong>1 hour</strong> of booking. Unpaid
            reservations will be automatically cancelled after this period.
          </p>
          <p>
            A booking is considered confirmed only after payment has been verified by our staff.
          </p>

          <h2>2. Cancelling a Pending Booking</h2>
          <p>
            Pending bookings (those not yet confirmed) can be cancelled by the guest at any time
            through the website dashboard. No fees apply for cancelling a pending booking.
          </p>

          <h2>3. Refund Process</h2>
          <p>
            Approved refunds are processed through GCash. Once our staff marks your payment as
            refunded, you will receive a notification and the booking will be automatically
            cancelled. Processing time may vary depending on GCash.
          </p>

          <h2>4. Vouchers & Promotions</h2>
          <p>
            If a voucher or promotion code was applied to a cancelled booking, the voucher usage
            will be reversed and the code will be available for reuse, subject to its original
            expiration date and terms.
          </p>

          <h2>5. No-Show Policy</h2>
          <p>
            Guests who do not check in on their scheduled date and have not notified the resort
            in advance will be considered a no-show. No-show bookings are
            <strong>non-refundable</strong>.
          </p>

          <h2>6. Resort-Initiated Cancellations</h2>
          <p>
            In the rare event that the resort must cancel a booking due to unforeseen
            circumstances (e.g., natural disasters, force majeure), a full refund will be
            issued regardless of the cancellation timeframe.
          </p>

          <h2>7. Contact Us</h2>
          <p>
            For cancellation requests, refund inquiries, or any questions regarding this policy,
            please reach out to us through any of the following channels:
          </p>
          <ul>
            <li>Email: <a href="mailto:arnelarcos@adel-resort.ph">arnelarcos@adel-resort.ph</a></li>
            <li>Phone: 09685361395</li>
            <li>In-app chat</li>
          </ul>

        </div>
      </div>
    </div>
  )
}
