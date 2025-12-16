import { useState, useEffect, useRef } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { FiVideo, FiBarChart2, FiDollarSign, FiSettings, FiEdit, FiTrash2, FiEye, FiImage, FiUpload } from 'react-icons/fi'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../services/api'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

function StudioDashboard() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/analytics/channel?period=28')
      setAnalytics(response.data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-32 bg-dark-800 rounded-xl" /></div>

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Tableau de bord</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-dark-400 text-sm">Vues totales</p>
          <p className="text-2xl font-bold">{analytics?.totals?.total_views?.toLocaleString() || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-dark-400 text-sm">Likes</p>
          <p className="text-2xl font-bold">{analytics?.totals?.total_likes?.toLocaleString() || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-dark-400 text-sm">Commentaires</p>
          <p className="text-2xl font-bold">{analytics?.totals?.total_comments?.toLocaleString() || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-dark-400 text-sm">Vidéos</p>
          <p className="text-2xl font-bold">{analytics?.totals?.total_videos || 0}</p>
        </div>
      </div>

      {analytics?.viewsOverTime?.length > 0 && (
        <div className="card p-4">
          <h3 className="font-medium mb-4">Vues (28 derniers jours)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.viewsOverTime}>
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }} />
                <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {analytics?.topVideos?.length > 0 && (
        <div className="card p-4">
          <h3 className="font-medium mb-4">Vidéos populaires</h3>
          <div className="space-y-3">
            {analytics.topVideos.slice(0, 5).map((video) => (
              <div key={video.id} className="flex items-center gap-3">
                <img src={video.thumbnail_url || '/placeholder.jpg'} alt="" className="w-24 h-14 object-cover rounded" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium line-clamp-1">{video.title}</p>
                  <p className="text-sm text-dark-400">{video.view_count?.toLocaleString()} vues</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StudioVideos() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingVideo, setEditingVideo] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', description: '', visibility: 'public' })
  const [thumbnailPreview, setThumbnailPreview] = useState(null)
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const thumbnailInputRef = useRef(null)
  const { channel } = useAuthStore()

  useEffect(() => {
    if (channel?.handle) fetchVideos()
  }, [channel])

  const fetchVideos = async () => {
    try {
      const response = await api.get(`/channels/${channel.handle}/videos`)
      setVideos(response.data.videos)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (video) => {
    setEditingVideo(video)
    setEditForm({
      title: video.title || '',
      description: video.description || '',
      visibility: video.visibility || 'public'
    })
    setThumbnailPreview(video.thumbnail_url)
  }

  const handleThumbnailChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Preview
    const previewUrl = URL.createObjectURL(file)
    setThumbnailPreview(previewUrl)

    // Upload
    setUploadingThumbnail(true)
    try {
      const formData = new FormData()
      formData.append('thumbnail', file)
      const response = await api.post(`/videos/${editingVideo.id}/thumbnail`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setVideos(videos.map(v => v.id === editingVideo.id ? { ...v, thumbnail_url: response.data.thumbnailUrl } : v))
      toast.success('Miniature mise à jour')
    } catch (error) {
      toast.error('Erreur lors de l\'upload de la miniature')
      setThumbnailPreview(editingVideo.thumbnail_url)
    } finally {
      setUploadingThumbnail(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.put(`/videos/${editingVideo.id}`, editForm)
      setVideos(videos.map(v => v.id === editingVideo.id ? { ...v, ...editForm } : v))
      setEditingVideo(null)
      toast.success('Vidéo mise à jour')
    } catch (error) {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const deleteVideo = async (id) => {
    if (!confirm('Supprimer cette vidéo ?')) return
    try {
      await api.delete(`/videos/${id}`)
      setVideos(videos.filter(v => v.id !== id))
      toast.success('Vidéo supprimée')
    } catch (error) {
      toast.error('Erreur')
    }
  }

  if (loading) return <div className="animate-pulse"><div className="h-20 bg-dark-800 rounded-xl" /></div>

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Mes vidéos</h2>
      {videos.length === 0 ? (
        <p className="text-dark-400 text-center py-10">Aucune vidéo</p>
      ) : (
        <div className="space-y-3">
          {videos.map((video) => (
            <div key={video.id} className="card p-4 flex gap-4">
              <img src={video.thumbnail_url || '/placeholder.jpg'} alt="" className="w-40 aspect-video object-cover rounded-lg" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium line-clamp-1">{video.title}</h3>
                <p className="text-sm text-dark-400 line-clamp-2 mt-1">{video.description || 'Aucune description'}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-dark-400">
                  <span className={`px-2 py-0.5 rounded text-xs ${video.visibility === 'public' ? 'bg-green-500/20 text-green-400' : 'bg-dark-700'}`}>
                    {video.visibility}
                  </span>
                  <span>{video.view_count?.toLocaleString()} vues</span>
                  <span>{video.like_count} likes</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={`/watch/${video.id}`} target="_blank" className="p-2 hover:bg-dark-700 rounded-lg"><FiEye /></a>
                <button onClick={() => openEditModal(video)} className="p-2 hover:bg-dark-700 rounded-lg"><FiEdit /></button>
                <button onClick={() => deleteVideo(video.id)} className="p-2 hover:bg-dark-700 rounded-lg text-red-400"><FiTrash2 /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal d'édition */}
      {editingVideo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setEditingVideo(null)}>
          <div className="bg-dark-900 rounded-xl p-6 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4">Modifier la vidéo</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Thumbnail Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">Miniature</label>
                <div className="flex gap-4 items-start">
                  <div className="relative w-48 aspect-video bg-dark-800 rounded-lg overflow-hidden">
                    <img 
                      src={thumbnailPreview || '/placeholder.jpg'} 
                      alt="Miniature" 
                      className="w-full h-full object-cover"
                    />
                    {uploadingThumbnail && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      ref={thumbnailInputRef}
                      onChange={handleThumbnailChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => thumbnailInputRef.current?.click()}
                      className="btn btn-secondary w-full"
                      disabled={uploadingThumbnail}
                    >
                      <FiUpload className="w-4 h-4" />
                      <span>Changer la miniature</span>
                    </button>
                    <p className="text-xs text-dark-400 mt-2">
                      Format recommandé: 1280x720 (16:9). JPG, PNG ou WebP.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Titre</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="input w-full min-h-[120px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Visibilité</label>
                <select
                  value={editForm.visibility}
                  onChange={(e) => setEditForm({ ...editForm, visibility: e.target.value })}
                  className="input w-full"
                >
                  <option value="public">Public</option>
                  <option value="unlisted">Non répertorié</option>
                  <option value="private">Privé</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setEditingVideo(null)} className="btn btn-ghost">Annuler</button>
                <button type="submit" className="btn btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function StudioAnalytics() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Analytics détaillées</h2>
      <p className="text-dark-400">Statistiques avancées de votre chaîne</p>
    </div>
  )
}

function StudioSettings() {
  const { channel, updateChannel } = useAuthStore()
  const [formData, setFormData] = useState({ name: '', description: '' })

  useEffect(() => {
    if (channel) setFormData({ name: channel.name || '', description: channel.description || '' })
  }, [channel])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.put(`/channels/${channel.handle}`, formData)
      updateChannel(formData)
      toast.success('Chaîne mise à jour')
    } catch (error) {
      toast.error('Erreur')
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold mb-4">Paramètres de la chaîne</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Nom de la chaîne</label>
          <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input min-h-[120px]" />
        </div>
        <button type="submit" className="btn btn-primary">Enregistrer</button>
      </form>
    </div>
  )
}

export default function Studio() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <aside className="w-full md:w-48 flex-shrink-0">
        <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          <NavLink to="/studio" end className={({ isActive }) => `sidebar-link whitespace-nowrap ${isActive ? 'active' : ''}`}>
            <FiBarChart2 /> Dashboard
          </NavLink>
          <NavLink to="/studio/videos" className={({ isActive }) => `sidebar-link whitespace-nowrap ${isActive ? 'active' : ''}`}>
            <FiVideo /> Vidéos
          </NavLink>
          <NavLink to="/studio/analytics" className={({ isActive }) => `sidebar-link whitespace-nowrap ${isActive ? 'active' : ''}`}>
            <FiBarChart2 /> Analytics
          </NavLink>
          <NavLink to="/studio/settings" className={({ isActive }) => `sidebar-link whitespace-nowrap ${isActive ? 'active' : ''}`}>
            <FiSettings /> Paramètres
          </NavLink>
        </nav>
      </aside>
      <div className="flex-1 min-w-0">
        <Routes>
          <Route index element={<StudioDashboard />} />
          <Route path="videos" element={<StudioVideos />} />
          <Route path="analytics" element={<StudioAnalytics />} />
          <Route path="settings" element={<StudioSettings />} />
        </Routes>
      </div>
    </div>
  )
}
