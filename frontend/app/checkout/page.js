'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { ArrowLeft, Shield, CalendarDays } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'
import StripePaymentForm from '@/components/StripePaymentForm'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('booking')
  const { isAuthenticated } = useAuthStore()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/checkout')
      return
    }
    if (!bookingId) {
      router.push('/dashboard')
      return
    }

    const fetchBooking = async () => {
      try {
        const { data } = await api.get(`/bookings/${bookingId}/`)
        if (data.status === 'confirmed') {
          router.push(`/booking/${bookingId}`)
          return
        }
        setBooking(data)
      } catch {
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetchBooking()
  }, [bookingId, isAuthenticated])

  const handlePaymentSuccess = (id) => {
    router.push(`/booking/${id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ocean-600" />
      </div>
    )
  }

  if (!booking) return null

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <h1 className="font-serif text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div>
            <div className="card p-6">
              <h2 className="font-semibold text-lg mb-4 text-gray-900">Booking Summary</h2>

              <div className="bg-ocean-50 rounded-xl p-4 mb-4">
                <h3 className="font-semibold text-gray-800">{booking.room_detail?.name}</h3>
                <p className="text-gray-500 text-sm">{booking.room_detail?.room_type_display}</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <CalendarDays size={15} className="text-ocean-500" />
                  <span>
                    {format(parseISO(booking.check_in), 'MMM d')} –{' '}
                    {format(parseISO(booking.check_out), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    ${booking.room_detail?.price_per_night} × {booking.nights} nights
                  </span>
                  <span className="font-medium">${booking.total_price}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-3">
                  <span>Total</span>
                  <span className="text-ocean-700">${booking.total_price}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                <Shield size={16} className="text-ocean-500 flex-shrink-0" />
                <span>Your payment is secured and encrypted by Stripe.</span>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="card p-6">
            <h2 className="font-semibold text-lg mb-4 text-gray-900">Payment Details</h2>
            <Elements stripe={stripePromise}>
              <StripePaymentForm
                bookingId={booking.id}
                totalAmount={booking.total_price}
                onSuccess={handlePaymentSuccess}
              />
            </Elements>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ocean-600" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
