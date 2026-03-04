'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Shield, CalendarDays, Tag, X } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'
import GCashPaymentForm from '@/components/GCashPaymentForm'

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('booking')
  const { isAuthenticated } = useAuthStore()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherApplied, setVoucherApplied] = useState(null)
  const [applyingVoucher, setApplyingVoucher] = useState(false)

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

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return
    setApplyingVoucher(true)
    try {
      const { data } = await api.post('/vouchers/validate/', {
        code: voucherCode.trim(),
        booking_id: bookingId,
      })
      setVoucherApplied(data)
      toast.success('Voucher applied!')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid voucher code.'
      toast.error(msg)
    } finally {
      setApplyingVoucher(false)
    }
  }

  const handleRemoveVoucher = () => {
    setVoucherApplied(null)
    setVoucherCode('')
  }

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
                  <span className="text-gray-500 capitalize">
                    {booking.slots_summary}
                  </span>
                  <span className="font-medium">₱{booking.total_price}</span>
                </div>
                {voucherApplied && (
                  <div className="flex justify-between text-green-600">
                    <span>Voucher ({voucherApplied.code})</span>
                    <span>-₱{voucherApplied.discount_amount}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-3">
                  <span>Total</span>
                  <span className="text-ocean-700">
                    ₱{voucherApplied ? voucherApplied.final_price : booking.total_price}
                  </span>
                </div>
              </div>

              {/* Voucher Code Input */}
              <div className="mt-4 border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Tag size={14} className="inline mr-1" />
                  Voucher Code
                </label>
                {voucherApplied ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <span className="text-sm text-green-700 font-medium">
                      {voucherApplied.code} applied — ₱{voucherApplied.discount_amount} off
                    </span>
                    <button type="button" onClick={handleRemoveVoucher} className="text-green-600 hover:text-green-800">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value)}
                      placeholder="Enter voucher code"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={handleApplyVoucher}
                      disabled={applyingVoucher || !voucherCode.trim()}
                      className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
                    >
                      {applyingVoucher ? 'Applying...' : 'Apply'}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                <Shield size={16} className="text-ocean-500 flex-shrink-0" />
                <span>Your payment will be verified by our team within 24 hours.</span>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="card p-6">
            <h2 className="font-semibold text-lg mb-4 text-gray-900">Payment Details</h2>
            <GCashPaymentForm
              bookingId={booking.id}
              totalAmount={voucherApplied ? voucherApplied.final_price : booking.total_price}
              voucherCode={voucherApplied?.code || ''}
              onSuccess={handlePaymentSuccess}
            />
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
