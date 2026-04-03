'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, X, CheckCircle, AlertCircle, Loader2, Mail } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import useAuthStore from '@/store/authStore'

export default function ProfilePage() {
  const { user, updateUser, fetchMe } = useAuthStore()
  const fileInputRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
  })

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        email: user.email || '',
      })
    }
  }, [user])

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.patch('/auth/me/', form)
      updateUser(data)
      toast.success('Profile updated')
    } catch (err) {
      const errors = err.response?.data
      if (errors) {
        const msg = Object.values(errors).flat().join(', ')
        toast.error(msg)
      } else {
        toast.error('Failed to update profile')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('avatar', file)
    setAvatarLoading(true)
    try {
      const { data } = await api.post('/auth/me/avatar/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      updateUser(data)
      toast.success('Avatar updated')
    } catch (err) {
      const msg = err.response?.data?.avatar || 'Failed to upload avatar'
      toast.error(typeof msg === 'string' ? msg : msg[0])
    } finally {
      setAvatarLoading(false)
    }
  }

  const handleAvatarRemove = async () => {
    setAvatarLoading(true)
    try {
      await api.delete('/auth/me/avatar/')
      updateUser({ avatar_url: null })
      toast.success('Avatar removed')
    } catch {
      toast.error('Failed to remove avatar')
    } finally {
      setAvatarLoading(false)
    }
  }

  const handleSendVerification = async () => {
    setVerifyLoading(true)
    try {
      await api.post('/auth/send-verification-email/')
      toast.success('Verification email sent! Check your inbox.')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send verification email')
    } finally {
      setVerifyLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-ocean-800 mb-4">Profile Photo</h2>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-ocean-100 flex items-center justify-center">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-ocean-400">
                  {user.first_name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              )}
              {avatarLoading && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-white" size={24} />
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-ocean-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-ocean-700 transition-colors"
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <div>
            <p className="text-sm text-gray-500">JPEG, PNG, or WebP. Max 5MB.</p>
            {user.avatar_url && (
              <button
                onClick={handleAvatarRemove}
                className="text-sm text-red-500 hover:text-red-600 mt-1 flex items-center gap-1"
              >
                <X size={14} /> Remove photo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-ocean-800 mb-4">Personal Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input type="text" value={user.username} disabled className="input-field bg-gray-50 text-gray-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
            <input
              type="text"
              value={new Date(user.date_joined).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              disabled
              className="input-field bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input-field"
              placeholder="e.g. 09XX XXX XXXX"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field pr-24"
                placeholder="your@email.com"
              />
              {user.email && (
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-medium ${
                  user.email_verified ? 'text-emerald-600' : 'text-amber-500'
                }`}>
                  {user.email_verified ? (
                    <><CheckCircle size={14} /> Verified</>
                  ) : (
                    <><AlertCircle size={14} /> Unverified</>
                  )}
                </span>
              )}
            </div>
            {user.email && !user.email_verified && (
              <button
                type="button"
                onClick={handleSendVerification}
                disabled={verifyLoading}
                className="mt-1.5 text-sm text-ocean-600 hover:text-ocean-700 font-medium flex items-center gap-1"
              >
                <Mail size={14} />
                {verifyLoading ? 'Sending...' : 'Send verification email'}
              </button>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary py-2.5 px-6 text-sm flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : null}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}
