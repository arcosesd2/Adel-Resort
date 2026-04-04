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
          <h2>1. Cancellation by Guest</h2>

          <h3>Pending Bookings (Not Yet Paid)</h3>
          <p>
            Bookings that have not been paid can be cancelled at any time through your dashboard at no charge.
            Unpaid bookings are automatically cancelled after 24 hours.
          </p>

          <h3>Confirmed Bookings (Payment Verified)</h3>
          <p>
            Once a booking has been confirmed and payment has been verified by our staff, cancellation
            is handled on a case-by-case basis. Please contact us directly to discuss cancellation options:
          </p>
          <ul>
            <li><strong>More than 7 days before check-in:</strong> Eligible for a full refund minus processing fees.</li>
            <li><strong>3 to 7 days before check-in:</strong> Eligible for a 50% refund.</li>
            <li><strong>Less than 3 days before check-in:</strong> No refund. The booking may be rescheduled subject to availability.</li>
            <li><strong>No-shows:</strong> No refund will be issued for no-shows.</li>
          </ul>

          <h2>2. Cancellation by the Resort</h2>
          <p>
            Adel Beach Resort reserves the right to cancel bookings in the following circumstances:
          </p>
          <ul>
            <li>Severe weather conditions or natural disasters (force majeure).</li>
            <li>Facility maintenance or unexpected operational issues.</li>
            <li>Violation of resort rules by the guest.</li>
          </ul>
          <p>
            In cases where the resort initiates the cancellation, a full refund will be provided.
          </p>

          <h2>3. Refund Process</h2>
          <p>
            Approved refunds will be processed within 5-7 business days via GCash. You will be contacted
            by our staff to arrange the refund. Please ensure your GCash account is active and can receive transfers.
          </p>

          <h2>4. Rescheduling</h2>
          <p>
            Guests may request to reschedule their booking instead of cancelling, subject to availability.
            Rescheduling requests should be made at least 3 days before the original check-in date.
            Please contact us via chat or phone to arrange rescheduling.
          </p>

          <h2>5. Downpayment Bookings</h2>
          <p>
            For bookings made with a 20% downpayment, the downpayment is non-refundable if the guest
            cancels within 3 days of check-in or does not show up. The remaining balance must be settled
            upon check-in.
          </p>

          <h2>6. Voucher/Discount Bookings</h2>
          <p>
            Refunds for bookings made with a discount voucher will be based on the actual amount paid,
            not the original room price. Voucher codes cannot be reissued after cancellation.
          </p>

          <h2>7. How to Request a Cancellation</h2>
          <p>To cancel a booking:</p>
          <ol>
            <li>Log in to your account and go to <strong>My Bookings</strong>.</li>
            <li>For pending bookings, click <strong>Cancel</strong> directly.</li>
            <li>For confirmed bookings, use the <strong>Chat</strong> feature or contact us at 09685361395.</li>
          </ol>

          <h2>8. Contact</h2>
          <p>
            For any questions about this policy, please contact us at{' '}
            <a href="mailto:adelbeachresortph@gmail.com">adelbeachresortph@gmail.com</a> or call 09685361395.
          </p>
        </div>
      </div>
    </div>
  )
}
