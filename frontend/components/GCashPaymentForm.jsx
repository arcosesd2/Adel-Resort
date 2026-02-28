'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Upload, CheckCircle, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'

export default function GCashPaymentForm({ bookingId, totalAmount, onSuccess }) {
  const [gcashReference, setGcashReference] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB.')
      return
    }
    setProofFile(file)
    setProofPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!gcashReference.trim()) {
      toast.error('Please enter your GCash reference number.')
      return
    }
    if (!proofFile) {
      toast.error('Please upload your proof of payment.')
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('booking_id', bookingId)
      formData.append('gcash_reference', gcashReference.trim())
      formData.append('proof_of_payment', proofFile)

      await api.post('/payments/submit-proof/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Payment proof submitted! Awaiting admin confirmation.')
      onSuccess?.(bookingId)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to submit. Please try again.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* GCash Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-semibold text-blue-800 flex items-center gap-2 mb-3">
          <Smartphone size={18} />
          Pay via GCash
        </h3>
        <div className="flex flex-col items-center gap-3 mb-3">
          <Image
            src="/gcash-qr.png"
            alt="GCash QR Code"
            width={200}
            height={200}
            className="rounded-lg border border-blue-200"
          />
        </div>
        <div className="text-sm text-blue-700 space-y-1">
          <p><span className="font-medium">GCash Number:</span> 0916 315 2117</p>
          <p><span className="font-medium">Account Name:</span> Ralph Arcos</p>
        </div>
      </div>

      {/* Amount */}
      <div className="bg-ocean-50 rounded-xl p-4">
        <div className="flex justify-between font-bold text-lg">
          <span>Amount to send</span>
          <span className="text-ocean-700">₱{totalAmount}</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 space-y-1">
        <p className="font-medium text-gray-700">Steps:</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>Open your GCash app and send ₱{totalAmount} to the number above</li>
          <li>Copy the GCash reference number from the confirmation</li>
          <li>Take a screenshot of the payment confirmation</li>
          <li>Fill in the form below and submit</li>
        </ol>
      </div>

      {/* Reference Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          GCash Reference Number
        </label>
        <input
          type="text"
          value={gcashReference}
          onChange={(e) => setGcashReference(e.target.value)}
          placeholder="e.g. 1234 567 890"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
          required
        />
      </div>

      {/* Proof Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Proof of Payment (Screenshot)
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        {proofPreview ? (
          <div className="relative">
            <img
              src={proofPreview}
              alt="Payment proof preview"
              className="w-full max-h-64 object-contain rounded-lg border border-gray-200"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 text-sm text-ocean-600 hover:text-ocean-700 font-medium"
            >
              Change image
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-ocean-400 hover:bg-ocean-50/50 transition-colors"
          >
            <Upload size={24} className="mx-auto text-gray-400 mb-2" />
            <span className="text-sm text-gray-500">Click to upload screenshot</span>
          </button>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <CheckCircle size={16} />
        {submitting ? 'Submitting...' : 'Submit Payment Proof'}
      </button>

      <p className="text-center text-xs text-gray-400">
        Your payment will be verified by our team. Booking will be confirmed once verified.
      </p>
    </form>
  )
}
