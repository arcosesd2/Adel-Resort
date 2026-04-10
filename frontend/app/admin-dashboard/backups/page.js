'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Database, Download, Upload, Plus, Eye, EyeOff, AlertTriangle, CheckCircle, Loader2, HardDrive, Clock, Archive } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

export default function BackupsPage() {
  const { user, isAuthenticated, isReady } = useAuthStore()
  const router = useRouter()
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(true)
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [pinVerified, setPinVerified] = useState(false)
  const [creating, setCreating] = useState(false)
  const [downloading, setDownloading] = useState(null)
  const [restoring, setRestoring] = useState(false)
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false)
  const [restoreFile, setRestoreFile] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (isReady && (!isAuthenticated || !user?.is_superadmin)) {
      router.replace('/admin-dashboard')
    }
  }, [isReady, isAuthenticated, user, router])

  const fetchBackups = async () => {
    if (!pinVerified) return
    setLoading(true)
    try {
      const { data } = await api.get('/analytics/backups/', { params: { pin } })
      setBackups(data)
    } catch (err) {
      toast.error('Failed to load backups')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (pinVerified) fetchBackups()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinVerified])

  const verifyPin = () => {
    if (!pin) {
      toast.error('Enter the PIN')
      return
    }
    setPinVerified(true)
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const { data } = await api.post('/analytics/backups/create/', { pin })
      toast.success(`Backup created: ${data.size_display}`)
      fetchBackups()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create backup')
    } finally {
      setCreating(false)
    }
  }

  const handleDownload = async (filename) => {
    setDownloading(filename)
    try {
      const res = await api.post('/analytics/backups/download/', { pin, filename }, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to download backup')
    } finally {
      setDownloading(null)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.sql.gz')) {
      toast.error('File must be a .sql.gz backup')
      return
    }
    setRestoreFile(file)
    setRestoreConfirmOpen(true)
    e.target.value = ''
  }

  const handleRestore = async () => {
    if (!restoreFile) return
    setRestoreConfirmOpen(false)
    setRestoring(true)
    try {
      const formData = new FormData()
      formData.append('file', restoreFile)
      formData.append('pin', pin)
      const { data } = await api.post('/analytics/backups/restore/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      })
      toast.success(data.detail || 'Database restored successfully')
      if (data.safety_backup) {
        toast(`Safety backup: ${data.safety_backup}`, { duration: 8000 })
      }
      fetchBackups()
    } catch (err) {
      const detail = err.response?.data?.detail || 'Restore failed'
      toast.error(detail, { duration: 8000 })
    } finally {
      setRestoring(false)
      setRestoreFile(null)
    }
  }

  if (!isReady || !isAuthenticated || !user?.is_superadmin) return null

  if (!pinVerified) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 max-w-md mx-auto">
        <div className="card p-8 text-center">
          <Database size={48} className="mx-auto text-ocean-500 mb-4" />
          <h1 className="text-2xl font-serif font-bold text-gray-900 mb-2">Database Backups</h1>
          <p className="text-gray-500 mb-6">Enter the PIN to access backup management.</p>
          <div className="relative mb-4">
            <input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter 7-digit PIN"
              maxLength={7}
              className="input-field pr-10 text-center text-lg tracking-widest"
              onKeyDown={(e) => e.key === 'Enter' && verifyPin()}
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button onClick={verifyPin} className="btn-primary w-full">Unlock</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-ocean-800">Database Backups</h1>
          <p className="text-gray-500 mt-1">Create, download, and restore database backups</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleCreate} disabled={creating} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {creating ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
            {creating ? 'Creating...' : 'Create Backup'}
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="btn-outline flex items-center gap-2">
            <Upload size={18} /> Upload & Restore
          </button>
          <input ref={fileInputRef} type="file" accept=".sql.gz" onChange={handleFileSelect} className="hidden" />
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center">
          <Loader2 className="animate-spin mx-auto text-ocean-500" size={32} />
          <p className="text-gray-500 mt-3">Loading backups...</p>
        </div>
      ) : backups.length === 0 ? (
        <div className="card p-12 text-center">
          <Archive size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">No backups found</h3>
          <p className="text-sm text-gray-400">Click &quot;Create Backup&quot; to create your first backup, or wait for the daily cron to run.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Filename</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Size</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.filename} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <HardDrive size={16} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-800 font-mono">{b.filename}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-gray-400" />
                      {new Date(b.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{b.size_display}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDownload(b.filename)}
                      disabled={downloading === b.filename}
                      className="text-ocean-600 hover:text-ocean-700 font-medium text-sm flex items-center gap-1 ml-auto disabled:opacity-50"
                    >
                      {downloading === b.filename ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                      {downloading === b.filename ? 'Downloading...' : 'Download'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {restoring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-8 text-center max-w-sm">
            <Loader2 className="animate-spin mx-auto text-ocean-500 mb-4" size={40} />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Restoring Database...</h3>
            <p className="text-gray-500 text-sm">This may take a few minutes. Please do not close this page.</p>
          </div>
        </div>
      )}

      {restoreConfirmOpen && restoreFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRestoreConfirmOpen(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-red-500" size={28} />
              <h3 className="text-lg font-bold text-gray-900">Confirm Database Restore</h3>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-700">
              <p className="font-medium mb-1">A safety backup will be created first.</p>
              <p>The current database will be backed up before restoring. You can always roll back if something goes wrong.</p>
            </div>
            <p className="text-gray-600 text-sm mb-2">
              You are about to restore from:
            </p>
            <p className="text-sm font-mono font-medium text-gray-800 bg-gray-50 p-2 rounded mb-4">{restoreFile.name} ({(restoreFile.size / (1024 * 1024)).toFixed(2)} MB)</p>
            <p className="text-red-600 text-sm font-medium mb-6">This will replace the entire database. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => { setRestoreConfirmOpen(false); setRestoreFile(null) }} className="btn-outline flex-1 py-2">Cancel</button>
              <button onClick={handleRestore} className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg flex-1 transition-colors">
                Restore Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}