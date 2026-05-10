'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Shield, CalendarDays, Tag, X, AlertTriangle } from 'lucide-react'
import { FadeInUp } from '@/components/motions'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'
import GCashPaymentForm from '@/components/GCashPaymentForm'

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('booking')
  const { isAuthenticated, isReady } = useAuthStore()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherApplied, setVoucherApplied] = useState(null)
  const [applyingVoucher, setApplyingVoucher] = useState(false)
  const [promotions, setPromotions] = useState([])
  const [selectedPromo, setSelectedPromo] = useState(null)
  const [paymentType, setPaymentType] = useState('full')
  const [customAmount, setCustomAmount] = useState('')
  const [timeLeft, setTimeLeft] = useState('')
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const pendingNavRef = useRef(null)
  const setupRef = useRef(false)
  const { push: routerPush } = useRouter()

  const cancelBookingOnLeave = async () => {
    if (!bookingId) return
    try {
      await api.delete(`/bookings/${bookingId}/`)
    } catch {}
  }

  useEffect(() => {
    if (!booking) return
    const origPush = window.history.pushState.bind(window.history)
    const origReplace = window.history.replaceState.bind(window.history)

    const intercept = (method) => function (state, title, url) {
      if (leaving || !url || setupRef.current) { method.call(window.history, state, title, url); return }
      pendingNavRef.current = { method, state, title, url }
      setShowLeaveModal(true)
    }

    window.history.pushState = intercept(origPush)
    window.history.replaceState = intercept(origReplace)

    return () => {
      window.history.pushState = origPush
      window.history.replaceState = origReplace
    }
  }, [booking, leaving])

  useEffect(() => {
    if (!booking) return
    setupRef.current = true
    window.history.pushState({ checkout: true }, '', window.location.href)
    setupRef.current = false
    const handlePopState = () => {
      setupRef.current = true
      window.history.pushState({ checkout: true }, '', window.location.href)
      setupRef.current = false
      if (!leaving) setShowLeaveModal(true)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [booking, leaving])

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!booking || leaving) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [booking, leaving])

  const handleConfirmLeave = async () => {
    setLeaving(true)
    const roomId = booking?.room
    await cancelBookingOnLeave()
    const pending = pendingNavRef.current
    if (pending) {
      pending.method.call(window.history, pending.state, pending.title, pending.url)
    } else {
      router.replace(roomId ? `/rooms/${roomId}` : '/dashboard')
    }
  }

  useEffect(() => {
    if (!isReady) return
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
        api.get(`/vouchers/promotions/?booking_id=${bookingId}`)
          .then(({ data }) => {
            setPromotions(data)
            if (data.length > 0) setSelectedPromo(data[0])
          })
          .catch(() => {})
      } catch {
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetchBooking()
  }, [bookingId, isReady, isAuthenticated])

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
      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`)
      }
    }
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [booking?.payment_deadline])

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return
    setApplyingVoucher(true)
    try {
      const payload = { code: voucherCode.trim(), booking_id: bookingId }
      if (selectedPromo) payload.promotion_id = selectedPromo.id
      const { data } = await api.post('/vouchers/validate/', payload)
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

  const basePrice = voucherApplied ? parseFloat(voucherApplied.final_price) : selectedPromo ? parseFloat(selectedPromo.final_price) : parseFloat(booking.total_price)
  const parseCustom = parseFloat(customAmount) || 0
  const amountDue = paymentType === 'downpayment' ? (basePrice * 0.2).toFixed(2) : paymentType === 'partial' ? parseCustom.toFixed(2) : basePrice.toFixed(2)
  const remainingBalance = paymentType === 'downpayment' ? (basePrice * 0.8).toFixed(2) : paymentType === 'partial' ? (basePrice - parseCustom).toFixed(2) : '0.00'
  const partialMin = (basePrice * 0.2).toFixed(2)
  const partialMax = (basePrice * 0.99).toFixed(2)
  const partialError = paymentType === 'partial' && customAmount !== ''
    ? parseCustom < parseFloat(partialMin) ? `Minimum is ₱${partialMin}`
    : parseCustom > parseFloat(partialMax) ? `Maximum is ₱${partialMax}`
    : ''
    : ''

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={() => setShowLeaveModal(true)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
          <ArrowLeft size={16} /> Back
        </button>

        <FadeInUp>
          <h1 className="font-serif text-3xl font-bold text-gray-900 mb-4">Checkout</h1>
        </FadeInUp>

        {/* Payment Deadline Warning */}
        {timeLeft && timeLeft !== 'expired' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="text-red-500 flex-shrink-0" size={22} />
            <div>
              <p className="font-semibold text-red-800">Payment deadline: {timeLeft} remaining</p>
              <p className="text-red-600 text-sm">
                Please complete your payment within 1 hour of booking. Unpaid reservations will be automatically cancelled.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <FadeInUp delay={0.1}>
            <div className="glass-card p-6">
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
                {selectedPromo && !voucherApplied && (
                  <div className="flex justify-between text-green-600">
                    <span>Promotion ({selectedPromo.title})</span>
                    <span>-₱{selectedPromo.discount_amount}</span>
                  </div>
                )}
                {voucherApplied && voucherApplied.promotion_discount && parseFloat(voucherApplied.promotion_discount) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Promotion Discount</span>
                    <span>-₱{voucherApplied.promotion_discount}</span>
                  </div>
                )}
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
                  <label
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      paymentType === 'partial'
                        ? 'border-ocean-500 bg-ocean-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      value="partial"
                      checked={paymentType === 'partial'}
                      onChange={(e) => setPaymentType(e.target.value)}
                      className="accent-ocean-600"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-800">Partial Payment</span>
                      <p className="text-xs text-gray-500">Pay a custom amount (min. 20%), remaining upon check-in</p>
                    </div>
                  </label>
                </div>

                {paymentType === 'partial' && (
                  <div className="mt-3">
                    <label className="block text-xs text-gray-600 mb-1">
                      Enter amount (₱{partialMin} – ₱{partialMax})
                    </label>
                    <input
                      type="number"
                      min={partialMin}
                      max={partialMax}
                      step="0.01"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder={`Min ₱${partialMin}`}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ocean-500 focus:border-transparent ${
                        partialError ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {partialError && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertTriangle size={12} /> {partialError}
                      </p>
                    )}
                  </div>
                )}

                {(paymentType === 'downpayment' || paymentType === 'partial') && parseFloat(amountDue) > 0 && (
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                    <p className="font-medium">Remaining balance: ₱{remainingBalance}</p>
                    <p className="text-xs mt-1">The remaining amount must be settled upon check-in.</p>
                  </div>
                )}
              </div>

              {/* Promotions */}
              {promotions.length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Tag size={14} className="inline mr-1" />
                    Available Promotions
                  </label>
                  <div className="space-y-2">
                    {promotions.map(promo => (
                      <label
                        key={promo.id}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedPromo?.id === promo.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="promotion"
                          checked={selectedPromo?.id === promo.id}
                          onChange={() => { setSelectedPromo(promo); setVoucherApplied(null) }}
                          className="accent-green-600"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-800 text-sm">{promo.title}</span>
                          <span className="ml-2 text-xs font-bold text-green-700">-₱{promo.discount_amount}</span>
                          {!promo.allows_voucher && (
                            <span className="ml-2 text-xs text-gray-400">(cannot combine with voucher)</span>
                          )}
                        </div>
                      </label>
                    ))}
                    <label
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        !selectedPromo
                          ? 'border-gray-400 bg-gray-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="promotion"
                        checked={!selectedPromo}
                        onChange={() => { setSelectedPromo(null); setVoucherApplied(null) }}
                        className="accent-gray-600"
                      />
                      <span className="text-sm text-gray-600">No promotion</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Voucher Code Input */}
              {(!selectedPromo || selectedPromo.allows_voucher) && (
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
              )}

              <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                <Shield size={16} className="text-ocean-500 flex-shrink-0" />
                <span>Your room will be reserved once the admin approves your booking. Payment will be verified by our team.</span>
              </div>
            </div>
          </FadeInUp>

          

          {/* Cancellation Policy Notice */}
          <FadeInUp delay={0.15}>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <p className="font-medium mb-1">Cancellation Policy</p>
              <p>Confirmed bookings cannot be cancelled directly through the website. To cancel a confirmed booking, please contact us:</p>
              <ul className="list-disc ml-4 mt-1">
                <li>Email: <span className="underline">arnelarcos@adel-resort.ph</span></li>
                <li>Phone: <span className="underline">09685361395</span></li>
                <li><span className="underline">In-app chat</span></li>
              </ul>
            </div>
          </FadeInUp>

          {/* Payment Form */}
          <FadeInUp delay={0.2}><div className="card p-6">
            <h2 className="font-semibold text-lg mb-4 text-gray-900">Payment Details</h2>
            <GCashPaymentForm
              bookingId={booking.id}
              totalAmount={amountDue}
              paymentType={paymentType}
              customAmount={paymentType === 'partial' ? customAmount : ''}
              customError={partialError}
              voucherCode={voucherApplied?.code || ''}
              promotionId={selectedPromo?.id || ''}
              onSuccess={handlePaymentSuccess}
            />
          </div></FadeInUp>
        </div>
      </div>

      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
              <h3 className="text-lg font-bold text-gray-900">Leave Checkout?</h3>
            </div>
            <p className="text-gray-600 text-sm mb-2">
              If you leave, your booking will be <strong className="text-red-600">cancelled</strong> and you&apos;ll return to the room page.
            </p>
            <p className="text-gray-400 text-xs mb-6">Press Cancel to stay and continue with payment.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="btn-primary flex-1 text-sm"
              >
                Stay
              </button>
              <button
                onClick={handleConfirmLeave}
                disabled={leaving}
                className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {leaving ? 'Cancelling...' : 'Leave & Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
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
