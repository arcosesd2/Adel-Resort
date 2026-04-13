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
          <p>
            Contact us via email, phone number or in-app chat.
          </p>
        </div>
      </div>
    </div>
  )
}
