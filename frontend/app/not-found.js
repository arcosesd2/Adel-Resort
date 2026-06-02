import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="font-serif text-8xl font-bold text-ocean-600 mb-4">404</h1>
        <h2 className="font-serif text-2xl font-bold text-gray-900 mb-3">Page Not Found</h2>
        <p className="text-gray-500 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn-primary py-2.5 px-6 text-sm">
            Back to Home
          </Link>
          <Link href="/rooms" className="btn-outline py-2.5 px-6 text-sm">
            Browse Rooms
          </Link>
        </div>
      </div>
    </div>
  )
}
