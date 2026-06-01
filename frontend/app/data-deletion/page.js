export const metadata = {
  title: 'Data Deletion Instructions',
  description: 'How Adel Beach Resort users can request deletion of account and social login data.',
}

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl font-bold text-gray-900 mb-3">Data Deletion Instructions</h1>
          <p className="text-gray-500 text-sm">Last updated: June 2026</p>
        </div>

        <div className="card p-8 md:p-12 prose prose-gray max-w-none">
          <p>
            Adel Beach Resort uses Google and Facebook social sign-in to help guests create and access their
            accounts. If you want to delete or remove personal data associated with your Adel Beach Resort
            account, use one of the methods below.
          </p>

          <h2>Delete or Deactivate Your Account</h2>
          <ol>
            <li>Log in to your Adel Beach Resort account.</li>
            <li>Go to Account, then Security.</li>
            <li>Use the deactivate account option and follow the confirmation steps.</li>
          </ol>

          <h2>Request Full Data Deletion</h2>
          <p>
            To request deletion of account data that cannot be removed directly from your account settings,
            email <a href="mailto:arnelarcos@adel-resort.ph">arnelarcos@adel-resort.ph</a> with the subject
            line &quot;Data Deletion Request&quot;. Include the email address used for your Adel Beach Resort account.
          </p>
          <p>
            We will review the request, verify account ownership when needed, and delete or anonymize eligible
            personal data. Some records may be retained where required for security, legal, accounting, booking,
            or dispute-resolution purposes.
          </p>

          <h2>Remove Facebook Access</h2>
          <ol>
            <li>Open your Facebook account settings.</li>
            <li>Go to Apps and Websites.</li>
            <li>Select Adel Resort or Adel Beach Resort.</li>
            <li>Click Remove to disconnect Facebook Login from your Facebook account.</li>
          </ol>

          <h2>Contact</h2>
          <p>
            For privacy or data deletion questions, email{' '}
            <a href="mailto:arnelarcos@adel-resort.ph">arnelarcos@adel-resort.ph</a> or call 09685361395.
          </p>
        </div>
      </div>
    </div>
  )
}
