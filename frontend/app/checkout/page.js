'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { ArrowLeft, Shield, CalendarDays, Tag, X, AlertTriangle } from 'lucide-react'
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
  const [paymentType, setPaymentType] = useState('full')
  const [timeLeft, setTimeLeft] = useState('')

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
        if (data.status === 'cancelled') {
          toast.error('This booking has been cancelled.')
          router.push('/dashboard')
          return
        }
        // Check if deadline has passed
        if (data.payment_deadline && new Date(data.payment_deadline) < new Date()) {
          toast.error('Payment deadline has passed. This booking has been cancelled.')
          router.push('/dashboard')
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

  // Countdown timer for payment deadline
  useEffect(() => {
    if (!booking?.payment_deadline) return
    const updateTimer = () => {
      const deadline = new Date(booking.payment_deadline)
      const now = new Date()
      const diff = deadline - now
      if (diff <= 0) {
        setTimeLeft('expired')
        toast.error('Payment deadline has passed.')
        router.push('/dashboard')
        return
      }
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
    }
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [booking?.payment_deadline])

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

  const basePrice = voucherApplied ? parseFloat(voucherApplied.final_price) : parseFloat(booking.total_price)
  const amountDue = paymentType === 'downpayment' ? (basePrice * 0.2).toFixed(2) : basePrice.toFixed(2)
  const remainingBalance = paymentType === 'downpayment' ? (basePrice * 0.8).toFixed(2) : '0.00'

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <h1 className="font-serif text-3xl font-bold text-gray-900 mb-4">Checkout</h1>

        {/* Payment Deadline Warning */}
        {timeLeft && timeLeft !== 'expired' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="text-amber-500 flex-shrink-0" size={22} />
            <div>
              <p className="font-semibold text-amber-800">Payment deadline: {timeLeft} remaining</p>
              <p className="text-amber-600 text-sm">
                Please complete your payment within 24 hours of booking. Unpaid reservations will be automatically cancelled.
              </p>
            </div>
          </div>
        )}

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
                    ₱{basePrice.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Term Selector */}
              <div className="mt-5 border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">Payment Term</label>
                <div className="space-y-2">
                  <label
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      paymentType === 'full'
                        ? 'border-ocean-500 bg-ocean-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      value="full"
                      checked={paymentType === 'full'}
                      onChange={(e) => setPaymentType(e.target.value)}
                      className="accent-ocean-600"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-800">Full Payment</span>
                      <p className="text-xs text-gray-500">Pay the entire amount now</p>
                    </div>
                    <span className="font-semibold text-ocean-700">₱{basePrice.toFixed(2)}</span>
                  </label>
                  <label
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      paymentType === 'downpayment'
                        ? 'border-ocean-500 bg-ocean-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      value="downpayment"
                      checked={paymentType === 'downpayment'}
                      onChange={(e) => setPaymentType(e.target.value)}
                      className="accent-ocean-600"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-800">20% Downpayment</span>
                      <p className="text-xs text-gray-500">Pay 20% now, remaining balance upon check-in</p>
                    </div>
                    <span className="font-semibold text-ocean-700">₱{(basePrice * 0.2).toFixed(2)}</span>
                  </label>
                </div>

                {paymentType === 'downpayment' && (
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                    <p className="font-medium">Remaining balance: ₱{remainingBalance}</p>
                    <p className="text-xs mt-1">The remaining amount must be settled upon check-in.</p>
                  </div>
                )}
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
              totalAmount={amountDue}
              paymentType={paymentType}
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
