'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Film, ArrowLeft, Upload, Trash2 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

export default function HeroSettingsPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [videoFile, setVideoFile] = useState(null)
  const [posterFile, setPosterFile] = useState(null)
  const [videoPreview, setVideoPreview] = useState(null)
  const [posterPreview, setPosterPreview] = useState(null)
  const videoRef = useRef(null)
  const posterRef = useRef(null)

  useEffect(() => {
    if (user && !user.is_staff) { router.replace('/admin-dashboard'); return }
    if (!user) return
    fetchConfig()
  }, [user, router])

  const fetchConfig = async () => {
    try {
      const { data } = await api.get('/content/hero/')
      setConfig(data)
      setVideoPreview(data.video_url)
      setPosterPreview(data.poster_url)
    } catch { toast.error('Failed to load homepage intro.') }
    finally { setLoading(false) }
  }

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) { toast.error('Please upload a video file.'); return }
    setVideoFile(file)
    setVideoPreview(URL.createObjectURL(file))
  }

  const handlePosterChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file.'); return }
    setPosterFile(file)
    setPosterPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const formData = new FormData()
      if (videoFile) formData.append('video', videoFile)
      if (posterFile) formData.append('poster', posterFile)

      const { data } = await api.patch('/content/hero/update/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setConfig(data)
      setVideoFile(null)
      setPosterFile(null)
      setVideoPreview(data.video_url)
      setPosterPreview(data.poster_url)
      toast.success('Homepage intro updated!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update.')
    } finally { setSaving(false) }
  }

  const handleRemoveVideo = async () => {
    if (!confirm('Remove the hero video?')) return
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('remove_video', 'true')
      const { data } = await api.patch('/content/hero/update/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setConfig(data)
      setVideoPreview(data.video_url)
      setVideoFile(null)
      toast.success('Video removed.')
    } catch { toast.error('Failed to remove video.') }
    finally { setSaving(false) }
  }

  const handleRemovePoster = async () => {
    if (!confirm('Remove the poster image? The default Unsplash image will be used.')) return
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('remove_poster', 'true')
      const { data } = await api.patch('/content/hero/update/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setConfig(data)
      setPosterPreview(data.poster_url)
      setPosterFile(null)
      toast.success('Poster removed.')
    } catch { toast.error('Failed to remove poster.') }
    finally { setSaving(false) }
  }

  if (!user?.is_staff) return null

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin-dashboard" className="text-ocean-600 hover:text-ocean-800"><ArrowLeft size={20} /></Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">Homepage Intro</h1>
      </div>

      {loading ? (
        <div className="card p-6 animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-40 bg-gray-200 rounded" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Video */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2 mb-4">
              <Film size={20} /> Intro Video
            </h2>
            <p className="text-sm text-gray-500 mb-4">Upload an MP4 video for the homepage hero background. If no video is set, only the poster image will show.</p>

            <input ref={videoRef} type="file" accept="video/mp4,video/*" onChange={handleVideoChange} className="hidden" />

            {videoPreview && (
              <div className="mb-4">
                <video src={videoPreview} controls muted className="w-full max-h-64 rounded-lg border border-gray-200" />
                <button type="button" onClick={handleRemoveVideo} disabled={saving}
                  className="mt-2 text-sm text-red-600 hover:text-red-700 flex items-center gap-1">
                  <Trash2 size={14} /> Remove Video
                </button>
              </div>
            )}

            <button type="button" onClick={() => videoRef.current?.click()}
              className="btn-outline text-sm px-4 py-2 flex items-center gap-2">
              <Upload size={14} /> {videoPreview ? 'Change Video' : 'Upload Video'}
            </button>
          </div>

          {/* Poster */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-ocean-800 mb-4">Poster Image</h2>
            <p className="text-sm text-gray-500 mb-4">This image shows while the video loads, or as the hero background if no video is set.</p>

            <input ref={posterRef} type="file" accept="image/*" onChange={handlePosterChange} className="hidden" />

            {posterPreview && (
              <div className="mb-4">
                <img src={posterPreview} alt="Poster" className="w-full max-h-64 object-cover rounded-lg border border-gray-200" />
                <button type="button" onClick={handleRemovePoster} disabled={saving}
                  className="mt-2 text-sm text-red-600 hover:text-red-700 flex items-center gap-1">
                  <Trash2 size={14} /> Remove Poster
                </button>
              </div>
            )}

            <button type="button" onClick={() => posterRef.current?.click()}
              className="btn-outline text-sm px-4 py-2 flex items-center gap-2">
              <Upload size={14} /> {posterPreview ? 'Change Poster' : 'Upload Poster'}
            </button>
          </div>

          <button type="submit" disabled={saving || (!videoFile && !posterFile)}
            className="btn-primary text-sm px-6 py-2 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      )}
    </div>
  )
}
