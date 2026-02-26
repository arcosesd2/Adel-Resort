'use client'

import { useState } from 'react'
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Lock, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1f2937',
      '::placeholder': { color: '#9ca3af' },
    },
    invalid: { color: '#ef4444' },
  },
}

export default function StripePaymentForm({ bookingId, totalAmount, onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setProcessing(true)
    setError(null)

    try {
      // Create PaymentIntent
      const { data } = await api.post('/payments/create-intent/', { booking_id: bookingId })
      const { client_secret } = data

      // Confirm payment with Stripe
      const result = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      })

      if (result.error) {
        setError(result.error.message)
        toast.error(result.error.message)
      } else if (result.paymentIntent.status === 'succeeded') {
        // Confirm on backend
        await api.post(`/payments/confirm/${bookingId}/`)
        toast.success('Payment successful! Your booking is confirmed.')
        onSuccess?.(bookingId)
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Payment failed. Please try again.'
      setError(msg)
      toast.error(msg)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <CreditCard size={15} className="inline mr-1" />
          Card Details
        </label>
        <div className="border border-gray-300 rounded-lg px-4 py-3 focus-within:ring-2 focus-within:ring-ocean-500 focus-within:border-transparent">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Test card: 4242 4242 4242 4242 | Any future date | Any CVC
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      <div className="bg-ocean-50 rounded-xl p-4">
        <div className="flex justify-between font-bold text-lg">
          <span>Total to pay</span>
          <span className="text-ocean-700">${totalAmount}</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={!stripe || processing}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Lock size={16} />
        {processing ? 'Processing...' : `Pay $${totalAmount}`}
      </button>

      <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
        <Lock size={12} />
        Secured by Stripe. Your card info is never stored.
      </p>
    </form>
  )
}
