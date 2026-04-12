import { MapPin, Phone, Mail, Clock } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'About Us',
  description: 'Learn about Adel Beach Resort in Lawigan, Surigao Del Sur. Your perfect beach getaway destination.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-ocean-600 font-semibold tracking-widest text-sm uppercase mb-3">About Us</p>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Adel Beach Resort
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Your perfect beach getaway in Lawigan, Surigao Del Sur
          </p>
        </div>

        {/* Our Story */}
        <div className="card p-8 md:p-12 mb-10">
          <h2 className="font-serif text-2xl font-bold text-gray-900 mb-4">Our Story</h2>
          <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed space-y-4">
            <p>
              Nestled along the pristine shores of Lawigan in Surigao Del Sur, Adel Beach Resort offers
              an unforgettable tropical experience. With crystal-clear waters, white sand beaches, and
              lush surroundings, our resort is the ideal destination for families, couples, and groups
              looking for a peaceful retreat.
            </p>
            <p>
              We offer a variety of accommodations to suit every need — from cozy cottages and traditional
              kubo rooms to our spacious Lavender House and fully-equipped Function Hall for events.
              Whether you're here for a relaxing day tour or an overnight adventure, Adel Beach Resort
              has something for everyone.
            </p>
            <p>
              Our friendly staff is dedicated to making your stay comfortable and memorable. We take pride
              in providing excellent service, clean facilities, and a welcoming atmosphere that keeps our
              guests coming back.
            </p>
          </div>
        </div>

        {/* Contact & Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="card p-8">
            <h2 className="font-serif text-2xl font-bold text-gray-900 mb-6">Contact Information</h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="text-ocean-500 mt-0.5 flex-shrink-0" size={20} />
                <div>
                  <p className="font-medium text-gray-900">Address</p>
                  <p className="text-gray-600 text-sm">Adel Beach Resort, Lawigan, Surigao Del Sur, Philippines</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="text-ocean-500 mt-0.5 flex-shrink-0" size={20} />
                <div>
                  <p className="font-medium text-gray-900">Phone</p>
                  <p className="text-gray-600 text-sm">09685361395</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="text-ocean-500 mt-0.5 flex-shrink-0" size={20} />
                <div>
                  <p className="font-medium text-gray-900">Email</p>
                  <p className="text-gray-600 text-sm">arnelarcos@adel-resort.ph</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="text-ocean-500 mt-0.5 flex-shrink-0" size={20} />
                <div>
                  <p className="font-medium text-gray-900">Hours</p>
                  <p className="text-gray-600 text-sm">Day Tour: 8:00 AM &ndash; 5:00 PM</p>
                  <p className="text-gray-600 text-sm">Night Tour: 5:00 PM &ndash; 8:00 AM</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Google Maps */}
          <div className="card overflow-hidden">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3945.123!2d126.1!3d8.5!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sLawigan%2C+Surigao+Del+Sur!5e0!3m2!1sen!2sph!4v1"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: 350 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Adel Beach Resort Location"
            />
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/rooms" className="btn-primary py-3 px-8 text-sm inline-block">
            Browse Our Accommodations
          </Link>
        </div>
      </div>
    </div>
  )
}
