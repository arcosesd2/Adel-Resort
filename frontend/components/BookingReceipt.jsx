'use client'

import { forwardRef } from 'react'

const BookingReceipt = forwardRef(function BookingReceipt({ booking }, ref) {
  if (!booking) return null

  const statusLabels = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
    completed: 'Completed',
  }

  return (
    <div ref={ref} className="print-receipt bg-white p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center border-b-2 border-ocean-600 pb-4 mb-6">
        <h1 className="text-2xl font-serif font-bold text-ocean-800">Adel Beach Resort</h1>
        <p className="text-sm text-gray-500">Official Booking Receipt</p>
      </div>

      {/* Booking Reference */}
      <div className="text-center mb-6">
        <p className="text-sm text-gray-500">Booking Reference</p>
        <p className="text-2xl font-bold text-gray-800">{booking.reference_code || `#${booking.id}`}</p>
        <span className={`inline-block mt-1 text-xs font-semibold px-3 py-1 rounded-full ${
          booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
          booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
          booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
          'bg-amber-100 text-amber-700'
        }`}>
          {statusLabels[booking.status] || booking.status}
        </span>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Room</p>
          <p className="font-semibold text-gray-800">{booking.room_detail?.name || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Guests</p>
          <p className="font-semibold text-gray-800">{booking.guests}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Check-in</p>
          <p className="font-semibold text-gray-800">{booking.check_in}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Check-out</p>
          <p className="font-semibold text-gray-800">{booking.check_out}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Slots</p>
          <p className="font-semibold text-gray-800">{booking.slots_summary}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Booked On</p>
          <p className="font-semibold text-gray-800">
            {new Date(booking.created_at).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Special Requests */}
      {booking.special_requests && (
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Special Requests</p>
          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{booking.special_requests}</p>
        </div>
      )}

      {/* Payment Summary */}
      <div className="border-t pt-4 mb-6">
        <h3 className="font-semibold text-gray-800 mb-3">Payment Summary</h3>
        <div className="space-y-2 text-sm">
          {booking.voucher_discount > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>PHP {(Number(booking.total_price) + Number(booking.voucher_discount)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Voucher Discount</span>
                <span>- PHP {Number(booking.voucher_discount).toLocaleString()}</span>
              </div>
            </>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total</span>
            <span className="text-ocean-700">PHP {Number(booking.total_price).toLocaleString()}</span>
          </div>
          {booking.payment_type && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>Payment Type</span>
              <span className="capitalize">{booking.payment_type}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center border-t pt-4 text-xs text-gray-400">
        <p>This serves as your official booking receipt.</p>
        <p className="mt-1">Adel Beach Resort &bull; adel-resort.ph</p>
        <p className="mt-1">Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
    </div>
  )
})

export default BookingReceipt
