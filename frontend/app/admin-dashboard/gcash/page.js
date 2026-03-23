'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Smartphone, ArrowLeft, Upload } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

export default function GCashSettingsPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ gcash_number: '', account_name: '' })
  const [qrFile, setQrFile] = useState(null)
  const [qrPreview, setQrPreview] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (user && !user.is_superadmin) { router.replace('/admin-dashboard'); return }
    if (!user) return
    fetchConfig()
  }, [user, router])

  const fetchConfig = async () => {
    try {
      const { data } = await api.get('/payments/gcash-config/')
      setConfig(data)
      setForm({ gcash_number: data.gcash_number, account_name: data.account_name })
      setQrPreview(data.qr_code_url)
    } catch { toast.error('Failed to load GCash config.') }
    finally { setLoading(false) }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setQrFile(file)
    setQrPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('gcash_number', form.gcash_number)
      formData.append('account_name', form.account_name)
      if (qrFile) formData.append('qr_code', qrFile)

      const { data } = await api.patch('/payments/gcash-config/update/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setConfig(data)
      setQrFile(null)
      toast.success('GCash settings updated!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update.')
    } finally { setSaving(false) }
  }

  if (!user?.is_superadmin) return null

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin-dashboard" className="text-ocean-600 hover:text-ocean-800"><ArrowLeft size={20} /></Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">GCash Settings</h1>
      </div>

      {loading ? (
        <div className="card p-6 animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>
      ) : (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2 mb-6">
            <Smartphone size={20} /> Payment Configuration
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GCash Number</label>
              <input type="text" required value={form.gcash_number}
                onChange={e => setForm(f => ({ ...f, gcash_number: e.target.value }))}
                className="input-field" placeholder="e.g. 0916 315 2117" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
              <input type="text" required value={form.account_name}
                onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))}
                className="input-field" placeholder="e.g. Ralph Arcos" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">QR Code</label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              {qrPreview && (
                <div className="mb-3">
                  <img src={qrPreview} alt="QR Code" className="max-w-[250px] rounded-lg border border-gray-200" />
                </div>
              )}
              <button type="button" onClick={() => fileRef.current?.click()}
                className="btn-outline text-sm px-4 py-2 flex items-center gap-2">
                <Upload size={14} /> {qrPreview ? 'Change QR Code' : 'Upload QR Code'}
              </button>
            </div>
            <div className="pt-2">
              <button type="submit" disabled={saving} className="btn-primary text-sm px-6 py-2 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
