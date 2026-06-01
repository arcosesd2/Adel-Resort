export const metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Adel Beach Resort. Learn how we collect, use, and protect your information.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl font-bold text-gray-900 mb-3">Privacy Policy</h1>
          <p className="text-gray-500 text-sm">Last updated: June 2026</p>
        </div>

        <div className="card p-8 md:p-12 prose prose-gray max-w-none">
          <h2>1. Information We Collect</h2>
          <p>When you use Adel Beach Resort&apos;s website and booking system, we may collect the following information:</p>
          <ul>
            <li><strong>Account Information:</strong> Name, username, phone number, and email address when you register.</li>
            <li><strong>Social Login Information:</strong> If you sign in with Facebook or Google, we may receive your name, profile picture, email address, provider user ID, and email verification status from that provider.</li>
            <li><strong>Booking Data:</strong> Room preferences, check-in/out dates, number of guests, and special requests.</li>
            <li><strong>Payment Information:</strong> GCash reference numbers and proof of payment images.</li>
            <li><strong>Device Information:</strong> Browser type, screen resolution, and a device fingerprint for security purposes (staff accounts only).</li>
            <li><strong>Usage Data:</strong> Pages visited, timestamps, and anonymous visitor IDs for analytics.</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>To process and manage your bookings.</li>
            <li>To verify payments and send booking confirmations.</li>
            <li>To communicate with you about your reservations via email or in-app notifications.</li>
            <li>To create, verify, and secure your account when you choose Google or Facebook Login.</li>
            <li>To improve our website and services through analytics.</li>
            <li>To ensure security and prevent unauthorized access to staff accounts.</li>
          </ul>

          <h2>3. Facebook Login Data</h2>
          <p>
            When you use Facebook Login, Adel Beach Resort requests access to your name and profile picture
            through the public profile permission and your email address through the email permission. We use
            this information only to create or sign in to your Adel Beach Resort account, verify your email
            address, personalize your account profile, and protect your account.
          </p>
          <p>
            We do not post to your Facebook account, access your friends list, sell Facebook Login data, or use
            Facebook Login data for advertising. If Facebook does not provide an email address, we may be unable
            to create or sign in to your account using Facebook Login.
          </p>

          <h2>4. Data Storage & Security</h2>
          <p>
            Your data is stored securely on our servers. Uploaded images (avatars, payment proofs, room photos)
            are stored via Cloudinary, a third-party cloud storage service. Passwords are encrypted and never
            stored in plain text. We use short-lived JWT access tokens and an HttpOnly refresh cookie
            for secure authentication.
          </p>

          <h2>5. Cookies & Local Storage</h2>
          <p>
            We use an HttpOnly cookie to maintain your login session and browser local storage for
            short-lived access state and booking drafts. We do not use tracking cookies from third-party advertisers.
          </p>

          <h2>6. Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul>
            <li><strong>Cloudinary:</strong> For image storage and optimization.</li>
            <li><strong>Supabase:</strong> For secure Google and Facebook social sign-in.</li>
            <li><strong>Meta/Facebook:</strong> For Facebook Login when you choose to use it.</li>
            <li><strong>Google:</strong> For Google sign-in when you choose to use it.</li>
            <li><strong>GCash:</strong> For payment processing (manual verification).</li>
            <li><strong>Gmail SMTP:</strong> For sending transactional emails.</li>
          </ul>
          <p>
            We share personal information only as needed to provide our booking, account, payment, storage,
            authentication, support, and security services. We do not sell your personal information.
          </p>

          <h2>7. Data Retention</h2>
          <p>
            We retain your account information and booking history for as long as your account is active.
            You may request account deactivation at any time through your account settings. Login activity
            logs are retained for security purposes. Some booking, payment, security, legal, accounting, or
            dispute-resolution records may be retained where required or permitted by law.
          </p>

          <h2>8. Your Rights and Data Deletion</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data through your account profile.</li>
            <li>Update or correct your personal information.</li>
            <li>Request deactivation of your account.</li>
            <li>Contact us to request deletion of eligible personal data.</li>
            <li>Remove Adel Beach Resort from your Facebook Apps and Websites settings.</li>
          </ul>
          <p>
            Data deletion instructions are available at{' '}
            <a href="/data-deletion">our Data Deletion Instructions page</a>. You may also email{' '}
            <a href="mailto:arnelarcos@adel-resort.ph">arnelarcos@adel-resort.ph</a> with the subject line
            &quot;Data Deletion Request&quot; and include the email address used for your account.
          </p>

          <h2>9. Children&apos;s Privacy</h2>
          <p>
            Our services are not intended for children under 18. We do not knowingly collect personal
            information from minors. Bookings must be made by adults.
          </p>

          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be posted on this page
            with an updated revision date.
          </p>

          <h2>11. Contact</h2>
          <p>
            For privacy-related concerns, please contact us at{' '}
            <a href="mailto:arnelarcos@adel-resort.ph">arnelarcos@adel-resort.ph</a> or call 09685361395.
          </p>
        </div>
      </div>
    </div>
  )
}
