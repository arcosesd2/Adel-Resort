'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { setTokens } from '@/lib/auth'
import useAuthStore from '@/store/authStore'
import { useRouter } from 'next/navigation'

export default function SecurityPage() {
  const { logout } = useAuthStore()
  const router = useRouter()

  // Change password state
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', new_password2: '' })
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false })
  const [pwLoading, setPwLoading] = useState(false)

  // Deactivation state
  const [showDeactivate, setShowDeactivate] = useState(false)
  const [deactivateForm, setDeactivateForm] = useState({ password: '', confirmation: '' })
  const [deactivateLoading, setDeactivateLoading] = useState(false)

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.new_password2) {
      toast.error('New passwords do not match')
      return
    }
    setPwLoading(true)
    try {
      const { data } = await api.post('/auth/change-password/', pwForm)
      setTokens(data.access, data.refresh)
      const secure = window.location.protocol === 'https:' ? '; Secure' : ''
      document.cookie = `access_token=${data.access}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${secure}`
      setPwForm({ current_password: '', new_password: '', new_password2: '' })
      toast.success('Password changed successfully')
    } catch (err) {
      const errors = err.response?.data
      if (errors) {
        const msg = Object.values(errors).flat().join(', ')
        toast.error(msg)
      } else {
        toast.error('Failed to change password')
      }
    } finally {
      setPwLoading(false)
    }
  }

  const handleDeactivate = async (e) => {
    e.preventDefault()
    setDeactivateLoading(true)
    try {
      await api.post('/auth/deactivate/', deactivateForm)
      await logout()
      document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      toast.success('Account deactivated')
      router.push('/')
    } catch (err) {
      const errors = err.response?.data
      if (errors) {
        const msg = Object.values(errors).flat().join(', ')
        toast.error(msg)
      } else {
        toast.error('Failed to deactivate account')
      }
    } finally {
      setDeactivateLoading(false)
    }
  }

  const PasswordInput = ({ id, value, onChange, show, onToggle, placeholder }) => (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        id={id}
        value={value}
        onChange={onChange}
        className="input-field pr-10"
        placeholder={placeholder}
        required
        minLength={id === 'current_password' ? 1 : 10}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <form onSubmit={handleChangePassword} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-ocean-800 mb-4">Change Password</h2>
        <div className="space-y-4 max-w-md">
          <div>
            <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <PasswordInput
              id="current_password"
              value={pwForm.current_password}
              onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
              show={showPw.current}
              onToggle={() => setShowPw({ ...showPw, current: !showPw.current })}
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <PasswordInput
              id="new_password"
              value={pwForm.new_password}
              onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
              show={showPw.new}
              onToggle={() => setShowPw({ ...showPw, new: !showPw.new })}
              placeholder="Min. 8 characters"
            />
          </div>
          <div>
            <label htmlFor="new_password2" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <PasswordInput
              id="new_password2"
              value={pwForm.new_password2}
              onChange={(e) => setPwForm({ ...pwForm, new_password2: e.target.value })}
              show={showPw.confirm}
              onToggle={() => setShowPw({ ...showPw, confirm: !showPw.confirm })}
              placeholder="Confirm new password"
            />
          </div>
          <button
            type="submit"
            disabled={pwLoading}
            className="btn-primary py-2.5 px-6 text-sm flex items-center gap-2"
          >
            {pwLoading ? <Loader2 className="animate-spin" size={16} /> : null}
            Update Password
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="border-2 border-red-200 rounded-2xl p-6 bg-red-50/50">
        <h2 className="text-lg font-semibold text-red-700 flex items-center gap-2 mb-2">
          <AlertTriangle size={20} />
          Danger Zone
        </h2>
        <p className="text-sm text-red-600 mb-4">
          Deactivating your account will disable your login. Your booking history will be preserved.
          Contact support to reactivate.
        </p>

        {!showDeactivate ? (
          <button
            onClick={() => setShowDeactivate(true)}
            className="border-2 border-red-400 text-red-600 hover:bg-red-100 font-semibold py-2.5 px-6 rounded-lg text-sm transition-colors"
          >
            Deactivate Account
          </button>
        ) : (
          <form onSubmit={handleDeactivate} className="space-y-3 max-w-md">
            <div>
              <label className="block text-sm font-medium text-red-700 mb-1">Enter your password</label>
              <input
                type="password"
                value={deactivateForm.password}
                onChange={(e) => setDeactivateForm({ ...deactivateForm, password: e.target.value })}
                className="input-field border-red-300 focus:ring-red-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-red-700 mb-1">
                Type <span className="font-mono font-bold">DEACTIVATE</span> to confirm
              </label>
              <input
                type="text"
                value={deactivateForm.confirmation}
                onChange={(e) => setDeactivateForm({ ...deactivateForm, confirmation: e.target.value })}
                className="input-field border-red-300 focus:ring-red-500"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={deactivateLoading || deactivateForm.confirmation !== 'DEACTIVATE'}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold py-2.5 px-6 rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                {deactivateLoading ? <Loader2 className="animate-spin" size={16} /> : null}
                Confirm Deactivation
              </button>
              <button
                type="button"
                onClick={() => { setShowDeactivate(false); setDeactivateForm({ password: '', confirmation: '' }) }}
                className="text-gray-600 hover:text-gray-800 font-medium text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
