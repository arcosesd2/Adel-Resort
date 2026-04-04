'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Upload, Trash2, Star, GripVertical, ArrowLeft, ImageIcon, X } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

export default function RoomImagesPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const fileInputRef = useRef(null)

  const [rooms, setRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [draggedIdx, setDraggedIdx] = useState(null)

  useEffect(() => {
    if (user && !user.is_staff) { router.replace('/dashboard'); return }
    if (!user) return
    api.get('/rooms/').then(({ data }) => {
      setRooms(data.results || data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user, router])

  const selectRoom = (room) => {
    setSelectedRoom(room)
    setImages(
      [...(room.images || [])].sort((a, b) => a.order - b.order)
    )
  }

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length || !selectedRoom) return

    const formData = new FormData()
    files.forEach(f => formData.append('images', f))

    setUploading(true)
    try {
      const { data } = await api.post(`/rooms/${selectedRoom.id}/images/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImages(prev => [...prev, ...data].sort((a, b) => a.order - b.order))
      toast.success(`${files.length} image(s) uploaded`)
      refreshRoom()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const refreshRoom = async () => {
    try {
      const { data } = await api.get(`/rooms/${selectedRoom.id}/`)
      setSelectedRoom(data)
      setImages([...(data.images || [])].sort((a, b) => a.order - b.order))
      setRooms(prev => prev.map(r => r.id === data.id ? { ...r, images: data.images } : r))
    } catch {}
  }

  const handleDelete = async (imageId) => {
    if (!confirm('Delete this image?')) return
    try {
      await api.delete(`/rooms/${selectedRoom.id}/images/${imageId}/`)
      setImages(prev => prev.filter(i => i.id !== imageId))
      toast.success('Image deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleSetPrimary = async (imageId) => {
    try {
      await api.patch(`/rooms/${selectedRoom.id}/images/${imageId}/`, { is_primary: true })
      setImages(prev => prev.map(i => ({ ...i, is_primary: i.id === imageId })))
      toast.success('Primary image set')
    } catch {
      toast.error('Failed to set primary')
    }
  }

  const handleDragStart = (idx) => setDraggedIdx(idx)
  const handleDragOver = (e) => e.preventDefault()

  const handleDrop = async (targetIdx) => {
    if (draggedIdx === null || draggedIdx === targetIdx) { setDraggedIdx(null); return }

    const newImages = [...images]
    const [moved] = newImages.splice(draggedIdx, 1)
    newImages.splice(targetIdx, 0, moved)

    const reordered = newImages.map((img, i) => ({ ...img, order: i + 1 }))
    setImages(reordered)
    setDraggedIdx(null)

    try {
      await api.patch(`/rooms/${selectedRoom.id}/images/reorder/`, {
        order: reordered.map(i => ({ id: i.id, order: i.order }))
      })
    } catch {
      toast.error('Failed to save order')
      refreshRoom()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
        <div className="card p-8 animate-pulse"><div className="h-6 bg-gray-200 rounded w-1/3" /></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/admin-dashboard')} className="text-ocean-600 hover:text-ocean-800">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-serif font-bold text-ocean-800">Room Image Management</h1>
      </div>

      {!selectedRoom ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => (
            <button key={room.id} onClick={() => selectRoom(room)}
              className="card p-4 text-left hover:shadow-lg transition-shadow group">
              <div className="relative h-40 bg-gray-100 rounded-lg overflow-hidden mb-3">
                {room.primary_image ? (
                  <Image src={room.primary_image} alt={room.name} fill className="object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-300">
                    <ImageIcon size={40} />
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  {room.images?.length || 0} photos
                </div>
              </div>
              <h3 className="font-semibold text-gray-900">{room.name}</h3>
              <p className="text-sm text-gray-500">{room.room_type_display}</p>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedRoom(null)}
                className="text-ocean-600 hover:text-ocean-800 text-sm flex items-center gap-1">
                <ArrowLeft size={16} /> All Rooms
              </button>
              <h2 className="text-lg font-semibold text-gray-900">{selectedRoom.name}</h2>
              <span className="text-sm text-gray-500">({images.length} images)</span>
            </div>
            <div>
              <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp"
                className="hidden" onChange={handleUpload} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="btn-primary text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-50">
                <Upload size={16} /> {uploading ? 'Uploading...' : 'Upload Photos'}
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-4">
            Drag to reorder. Click the star to set as primary. Accepts JPEG, PNG, WebP (max 10MB each).
          </p>

          {images.length === 0 ? (
            <div className="card p-12 text-center">
              <ImageIcon size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 mb-3">No images yet</p>
              <button onClick={() => fileInputRef.current?.click()}
                className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-2">
                <Upload size={16} /> Upload Photos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {images.map((img, idx) => (
                <div key={img.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(idx)}
                  className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing ${
                    draggedIdx === idx ? 'opacity-50 border-ocean-400' :
                    img.is_primary ? 'border-yellow-400' : 'border-transparent hover:border-ocean-200'
                  }`}
                >
                  <div className="relative aspect-square">
                    <Image src={img.image_url || img.image} alt={img.alt_text || ''} fill className="object-cover" />
                  </div>

                  {/* Order badge */}
                  <div className="absolute top-1.5 left-1.5 bg-black/60 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-medium">
                    {img.order}
                  </div>

                  {/* Primary badge */}
                  {img.is_primary && (
                    <div className="absolute top-1.5 left-9 bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full font-medium">
                      Primary
                    </div>
                  )}

                  {/* Hover actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button onClick={() => handleSetPrimary(img.id)} title="Set as primary"
                      className="bg-white/90 hover:bg-yellow-100 p-2 rounded-full transition-colors">
                      <Star size={16} className={img.is_primary ? 'text-yellow-500 fill-yellow-500' : 'text-gray-700'} />
                    </button>
                    <button onClick={() => handleDelete(img.id)} title="Delete"
                      className="bg-white/90 hover:bg-red-100 p-2 rounded-full transition-colors">
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>

                  {/* Drag handle */}
                  <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical size={16} className="text-white drop-shadow" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
