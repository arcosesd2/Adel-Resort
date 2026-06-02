'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { setAccessToken } from '@/lib/auth'

export default function StaffSecurityPage() {
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', new_password2: '' })
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false })
  const [pwLoading, setPwLoading] = useState(false)

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.new_password2) {
      toast.error('New passwords do not match')
      return
    }
    setPwLoading(true)
    try {
      const { data } = await api.post('/auth/change-password/', pwForm)
      setAccessToken(data.access)
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
      <form onSubmit={handleChangePassword} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Change Password</h2>
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
            className="bg-slate-800 hover:bg-slate-900 text-white font-medium py-2.5 px-6 text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            {pwLoading ? <Loader2 className="animate-spin" size={16} /> : null}
            Update Password
          </button>
        </div>
      </form>
    </div>
  )
}
