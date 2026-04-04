export const metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for Adel Beach Resort online booking system.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl font-bold text-gray-900 mb-3">Terms of Service</h1>
          <p className="text-gray-500 text-sm">Last updated: April 2026</p>
        </div>

        <div className="card p-8 md:p-12 prose prose-gray max-w-none">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using the Adel Beach Resort website and booking system, you agree to be bound by
            these Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>

          <h2>2. Booking Terms</h2>
          <p>
            All bookings are subject to availability. A booking is considered confirmed only after payment
            has been verified by our staff. Pending bookings that are not paid within 24 hours will be
            automatically cancelled.
          </p>
          <ul>
            <li>Guests must provide accurate personal information when making a reservation.</li>
            <li>The resort reserves the right to refuse service to anyone.</li>
            <li>Check-in and check-out times must be strictly followed.</li>
            <li>Day tour hours: 8:00 AM &ndash; 5:00 PM. Night tour hours: 5:00 PM &ndash; 8:00 AM.</li>
          </ul>

          <h2>3. Payment Terms</h2>
          <p>
            We accept payments via GCash. Payment proof must be submitted within 24 hours of booking.
            The resort offers full payment and 20% downpayment options. The remaining balance for
            downpayment bookings must be settled upon check-in.
          </p>

          <h2>4. Cancellation Policy</h2>
          <p>
            Please refer to our <a href="/refund-policy">Refund & Cancellation Policy</a> for detailed
            information about cancellations and refunds.
          </p>

          <h2>5. User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials. You agree to
            notify us immediately of any unauthorized use of your account. The resort is not liable for any
            loss or damage arising from your failure to protect your account information.
          </p>

          <h2>6. Resort Rules</h2>
          <ul>
            <li>Guests must follow all resort rules and regulations during their stay.</li>
            <li>Any damage to resort property will be charged to the guest.</li>
            <li>Pets may not be allowed in certain accommodations.</li>
            <li>Loud music and disturbances after quiet hours are prohibited.</li>
            <li>The resort is not responsible for loss of personal belongings.</li>
          </ul>

          <h2>7. Intellectual Property</h2>
          <p>
            All content on this website, including text, images, logos, and design, is the property of
            Adel Beach Resort and is protected by applicable intellectual property laws.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            Adel Beach Resort shall not be liable for any indirect, incidental, or consequential damages
            arising from the use of our services. Our total liability shall not exceed the amount paid
            for the specific booking in question.
          </p>

          <h2>9. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Changes will be effective immediately
            upon posting on this page. Continued use of our services constitutes acceptance of the updated terms.
          </p>

          <h2>10. Contact</h2>
          <p>
            For questions about these Terms of Service, please contact us at{' '}
            <a href="mailto:adelbeachresortph@gmail.com">adelbeachresortph@gmail.com</a> or call 09685361395.
          </p>
        </div>
      </div>
    </div>
  )
}
