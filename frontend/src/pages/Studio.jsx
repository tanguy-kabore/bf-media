import { useState, useEffect, useRef } from 'react'
import { Routes, Route, NavLink, Navigate, Link } from 'react-router-dom'
import { FiVideo, FiBarChart2, FiDollarSign, FiSettings, FiEdit, FiTrash2, FiEye, FiImage, FiUpload, FiHardDrive, FiFlag, FiMessageCircle, FiUserPlus, FiAlertTriangle, FiCheckCircle, FiClock } from 'react-icons/fi'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../services/api'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

const formatBytes = (bytes) => {
  const num = Number(bytes)
  if (!num || isNaN(num) || num <= 0) return '0 B'
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(num) / Math.log(k))
  return parseFloat((num / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatTimeAgo = (date) => {
  const now = new Date()
  const d = new Date(date)
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'À l\'instant'
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)}j`
  return d.toLocaleDateString('fr-FR')
}

const reasonLabels = {
  spam: 'Spam', harassment: 'Harcèlement', hate_speech: 'Discours haineux',
  violence: 'Violence', sexual_content: 'Contenu sexuel', copyright: 'Droits d\'auteur',
  misinformation: 'Désinformation', other: 'Autre'
}

function StudioDashboard() {
  const [analytics, setAnalytics] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [analyticsRes, dashboardRes] = await Promise.all([
        api.get('/analytics/channel?period=28'),
        api.get('/analytics/dashboard')
      ])
      console.log('Dashboard response:', dashboardRes.data)
      console.log('Storage data:', dashboardRes.data?.storage)
      setAnalytics(analyticsRes.data)
      setDashboard(dashboardRes.data)
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-32 bg-dark-800 rounded-xl" /></div>

  const storagePercent = dashboard?.storage ? Math.min((dashboard.storage.used / dashboard.storage.limit) * 100, 100) : 0
  const totalReports = dashboard?.reports?.stats ? Object.values(dashboard.reports.stats).reduce((a, b) => a + b, 0) : 0

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Tableau de bord</h2>
      
      {/* Stats principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      {/* Stockage et Signalements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stockage */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <FiHardDrive className="w-5 h-5 text-primary-400" />
            <h3 className="font-medium">Espace de stockage</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">{formatBytes(dashboard?.storage?.used || 0)} utilisés</span>
              <span className="text-dark-400">sur {formatBytes(dashboard?.storage?.limit || 0)}</span>
            </div>
            <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${storagePercent > 90 ? 'bg-red-500' : storagePercent > 70 ? 'bg-yellow-500' : 'bg-primary-500'}`}
                style={{ width: `${storagePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">{dashboard?.storage?.videoCount || 0} vidéos</span>
              <span className={`font-medium ${storagePercent > 90 ? 'text-red-400' : storagePercent > 70 ? 'text-yellow-400' : 'text-green-400'}`}>
                {storagePercent.toFixed(1)}% utilisé
              </span>
            </div>
          </div>
        </div>

        {/* Signalements */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FiFlag className="w-5 h-5 text-orange-400" />
              <h3 className="font-medium">Signalements sur vos vidéos</h3>
            </div>
            {totalReports > 0 && (
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full text-xs font-medium">
                {totalReports} total
              </span>
            )}
          </div>
          {totalReports === 0 ? (
            <div className="text-center py-4 text-dark-400">
              <FiCheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <p className="text-sm">Aucun signalement sur vos vidéos</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 bg-yellow-500/10 rounded-lg">
                <p className="text-lg font-bold text-yellow-400">{dashboard?.reports?.stats?.pending || 0}</p>
                <p className="text-xs text-dark-400">En attente</p>
              </div>
              <div className="text-center p-2 bg-blue-500/10 rounded-lg">
                <p className="text-lg font-bold text-blue-400">{dashboard?.reports?.stats?.reviewing || 0}</p>
                <p className="text-xs text-dark-400">En cours</p>
              </div>
              <div className="text-center p-2 bg-green-500/10 rounded-lg">
                <p className="text-lg font-bold text-green-400">{dashboard?.reports?.stats?.resolved || 0}</p>
                <p className="text-xs text-dark-400">Résolus</p>
              </div>
              <div className="text-center p-2 bg-dark-700 rounded-lg">
                <p className="text-lg font-bold">{dashboard?.reports?.stats?.dismissed || 0}</p>
                <p className="text-xs text-dark-400">Rejetés</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Graphique des vues */}
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

      {/* Vidéos signalées récentes */}
      {dashboard?.reports?.recent?.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <FiAlertTriangle className="w-5 h-5 text-orange-400" />
            <h3 className="font-medium">Vidéos signalées récemment</h3>
          </div>
          <div className="space-y-3">
            {dashboard.reports.recent.slice(0, 5).map((report) => (
              <div key={report.id} className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-lg">
                <img src={report.thumbnail_url || '/placeholder.jpg'} alt="" className="w-20 h-12 object-cover rounded" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-1">{report.video_title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-dark-700 rounded text-xs">{reasonLabels[report.reason] || report.reason}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      report.status === 'reviewing' ? 'bg-blue-500/20 text-blue-400' :
                      report.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                      'bg-dark-600'
                    }`}>
                      {report.status === 'pending' ? 'En attente' : report.status === 'reviewing' ? 'En cours' : report.status === 'resolved' ? 'Résolu' : 'Rejeté'}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-dark-400">{formatTimeAgo(report.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activité récente */}
      {dashboard?.recentActivity?.length > 0 && (
        <div className="card p-4">
          <h3 className="font-medium mb-4">Activité récente</h3>
          <div className="space-y-3">
            {dashboard.recentActivity.map((activity, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm">
                <div className={`p-2 rounded-full ${activity.type === 'comment' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                  {activity.type === 'comment' ? <FiMessageCircle className="w-4 h-4" /> : <FiUserPlus className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  {activity.type === 'comment' ? (
                    <p><span className="font-medium">{activity.username}</span> a commenté sur <span className="text-primary-400">{activity.video_title}</span></p>
                  ) : (
                    <p><span className="font-medium">{activity.username}</span> s'est abonné à votre chaîne</p>
                  )}
                  <p className="text-dark-400 text-xs mt-0.5">{formatTimeAgo(activity.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vidéos populaires */}
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
            <div key={video.id} className="card p-3 sm:p-4">
              <div className="flex gap-3">
                <img src={video.thumbnail_url || '/placeholder.jpg'} alt="" className="w-24 sm:w-40 aspect-video object-cover rounded-lg flex-shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col">
                  <h3 className="font-medium text-sm sm:text-base line-clamp-2">{video.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-dark-400">
                    <span className={`px-2 py-0.5 rounded ${video.visibility === 'public' ? 'bg-green-500/20 text-green-400' : 'bg-dark-700'}`}>
                      {video.visibility}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-auto pt-2 text-xs text-dark-400">
                    <span>{video.view_count?.toLocaleString()} vues</span>
                    <span>{video.like_count} likes</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-1 flex-shrink-0">
                  <a href={`/watch/${video.id}`} target="_blank" className="p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-white"><FiEye className="w-4 h-4" /></a>
                  <button onClick={() => openEditModal(video)} className="p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-white"><FiEdit className="w-4 h-4" /></button>
                  <button onClick={() => deleteVideo(video.id)} className="p-2 hover:bg-dark-700 rounded-lg text-red-400"><FiTrash2 className="w-4 h-4" /></button>
                </div>
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
  const [analytics, setAnalytics] = useState(null)
  const [realtime, setRealtime] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('28')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchAnalytics()
    fetchRealtime()
    const interval = setInterval(fetchRealtime, 60000) // Refresh realtime every minute
    return () => clearInterval(interval)
  }, [period])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/analytics/channel?period=${period}`)
      setAnalytics(response.data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRealtime = async () => {
    try {
      const response = await api.get('/analytics/realtime')
      setRealtime(response.data)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const formatWatchTime = (seconds) => {
    if (!seconds) return '0 min'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}min`
    return `${minutes} min`
  }

  const formatNumber = (num) => {
    if (!num) return '0'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-dark-800 rounded w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-dark-800 rounded-xl" />)}
        </div>
        <div className="h-64 bg-dark-800 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-semibold">Analytics</h2>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="input py-2 text-sm"
          >
            <option value="7">7 derniers jours</option>
            <option value="28">28 derniers jours</option>
            <option value="90">90 derniers jours</option>
            <option value="365">12 derniers mois</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto hide-scrollbar border-b border-dark-700 pb-2">
        {[
          { id: 'overview', label: 'Vue d\'ensemble' },
          { id: 'content', label: 'Contenu' },
          { id: 'audience', label: 'Audience' },
          { id: 'realtime', label: 'Temps réel' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.id ? 'bg-primary-500 text-white' : 'text-dark-400 hover:bg-dark-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card p-4">
              <p className="text-dark-400 text-xs sm:text-sm">Vues</p>
              <p className="text-xl sm:text-2xl font-bold">{formatNumber(analytics?.totals?.total_views)}</p>
            </div>
            <div className="card p-4">
              <p className="text-dark-400 text-xs sm:text-sm">Temps de visionnage</p>
              <p className="text-xl sm:text-2xl font-bold">{formatWatchTime(analytics?.watchTime)}</p>
            </div>
            <div className="card p-4">
              <p className="text-dark-400 text-xs sm:text-sm">Abonnés</p>
              <p className="text-xl sm:text-2xl font-bold">
                +{analytics?.subscriberGrowth?.reduce((sum, d) => sum + d.new_subscribers, 0) || 0}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-dark-400 text-xs sm:text-sm">Engagement</p>
              <p className="text-xl sm:text-2xl font-bold">{formatNumber(analytics?.totals?.total_likes + analytics?.totals?.total_comments)}</p>
            </div>
          </div>

          {/* Views Chart */}
          {analytics?.viewsOverTime?.length > 0 && (
            <div className="card p-4">
              <h3 className="font-medium mb-4">Vues</h3>
              <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.viewsOverTime}>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#64748b', fontSize: 10 }} 
                      tickFormatter={(d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }}
                      labelFormatter={(d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    />
                    <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Subscriber Growth Chart */}
          {analytics?.subscriberGrowth?.length > 0 && (
            <div className="card p-4">
              <h3 className="font-medium mb-4">Croissance des abonnés</h3>
              <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.subscriberGrowth}>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickFormatter={(d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }}
                      labelFormatter={(d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    />
                    <Line type="monotone" dataKey="new_subscribers" stroke="#10b981" strokeWidth={2} dot={false} name="Nouveaux abonnés" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          <div className="card p-4">
            <h3 className="font-medium mb-4">Vidéos les plus performantes</h3>
            {analytics?.topVideos?.length > 0 ? (
              <div className="space-y-3">
                {analytics.topVideos.map((video, index) => (
                  <div key={video.id} className="flex items-center gap-3">
                    <span className="text-dark-500 text-sm w-6">{index + 1}</span>
                    <img 
                      src={video.thumbnail_url || '/placeholder.jpg'} 
                      alt="" 
                      className="w-20 sm:w-28 aspect-video object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{video.title}</p>
                      <div className="flex items-center gap-3 text-xs text-dark-400 mt-1">
                        <span>{formatNumber(video.view_count)} vues</span>
                        <span>{formatNumber(video.like_count)} likes</span>
                        <span className="hidden sm:inline">{formatNumber(video.recent_views)} vues récentes</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-dark-400 text-center py-6">Aucune donnée disponible</p>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="card p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-primary-400">{analytics?.totals?.total_videos || 0}</p>
              <p className="text-dark-400 text-sm">Vidéos publiées</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-green-400">{formatNumber(analytics?.totals?.total_likes)}</p>
              <p className="text-dark-400 text-sm">Total likes</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-yellow-400">{formatNumber(analytics?.totals?.total_comments)}</p>
              <p className="text-dark-400 text-sm">Total commentaires</p>
            </div>
          </div>
        </div>
      )}

      {/* Audience Tab */}
      {activeTab === 'audience' && (
        <div className="space-y-6">
          {/* Key Audience Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-primary-400">{formatNumber(analytics?.audience?.uniqueViewers)}</p>
              <p className="text-dark-400 text-xs sm:text-sm">Spectateurs uniques</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-green-400">{formatNumber(analytics?.audience?.totalSubscribers)}</p>
              <p className="text-dark-400 text-xs sm:text-sm">Abonnés</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-yellow-400">{formatWatchTime(analytics?.audience?.avgWatchDuration)}</p>
              <p className="text-dark-400 text-xs sm:text-sm">Durée moy. visionnage</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-purple-400">
                {analytics?.audience?.uniqueViewers > 0 
                  ? ((analytics?.audience?.returningViewers / analytics?.audience?.uniqueViewers) * 100).toFixed(0) 
                  : 0}%
              </p>
              <p className="text-dark-400 text-xs sm:text-sm">Taux de retour</p>
            </div>
          </div>

          {/* New vs Returning Viewers */}
          <div className="card p-4">
            <h3 className="font-medium mb-4">Nouveaux vs Fidèles</h3>
            <div className="flex flex-col gap-4">
              <div className="w-full">
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></span>
                    <span>Nouveaux</span>
                  </div>
                  <span className="text-dark-400 font-medium">{formatNumber(analytics?.audience?.newViewers || 0)}</span>
                </div>
                <div className="w-full h-3 bg-dark-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full" 
                    style={{ 
                      width: `${(analytics?.audience?.newViewers || 0) + (analytics?.audience?.returningViewers || 0) > 0 
                        ? ((analytics?.audience?.newViewers / ((analytics?.audience?.newViewers || 0) + (analytics?.audience?.returningViewers || 0))) * 100) 
                        : 50}%` 
                    }}
                  />
                </div>
              </div>
              <div className="w-full">
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-purple-500 rounded-full flex-shrink-0"></span>
                    <span>Fidèles</span>
                  </div>
                  <span className="text-dark-400 font-medium">{formatNumber(analytics?.audience?.returningViewers || 0)}</span>
                </div>
                <div className="w-full h-3 bg-dark-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full" 
                    style={{ 
                      width: `${(analytics?.audience?.newViewers || 0) + (analytics?.audience?.returningViewers || 0) > 0 
                        ? ((analytics?.audience?.returningViewers / ((analytics?.audience?.newViewers || 0) + (analytics?.audience?.returningViewers || 0))) * 100) 
                        : 50}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Views by Hour */}
          {analytics?.audience?.viewsByHour?.length > 0 && (
            <div className="card p-4">
              <h3 className="font-medium mb-4">Heures d'activité de votre audience</h3>
              <div className="h-32 sm:h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.audience.viewsByHour}>
                    <XAxis 
                      dataKey="hour" 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickFormatter={(h) => `${h}h`}
                    />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} hide />
                    <Tooltip 
                      contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }}
                      labelFormatter={(h) => `${h}h00 - ${h}h59`}
                    />
                    <Line type="monotone" dataKey="views" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-dark-500 mt-2 text-center">Meilleur moment pour publier : {
                analytics.audience.viewsByHour.reduce((max, h) => h.views > max.views ? h : max, { hour: 0, views: 0 }).hour
              }h00</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Devices */}
            <div className="card p-4">
              <h3 className="font-medium mb-4">Appareils</h3>
              {analytics?.demographics?.devices?.length > 0 ? (
                <div className="space-y-3">
                  {analytics.demographics.devices.map((device) => {
                    const total = analytics.demographics.devices.reduce((sum, d) => sum + d.views, 0)
                    const percent = total > 0 ? ((device.views / total) * 100).toFixed(1) : 0
                    const icons = { mobile: '📱', desktop: '💻', tablet: '📲', tv: '📺' }
                    return (
                      <div key={device.device_type} className="flex items-center gap-3">
                        <span className="text-lg">{icons[device.device_type?.toLowerCase()] || '🖥️'}</span>
                        <span className="w-16 text-sm capitalize">{device.device_type || 'Autre'}</span>
                        <div className="flex-1 h-2 bg-dark-700 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                        <span className="text-sm text-dark-400 w-14 text-right">{percent}%</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-dark-400 text-center py-6 text-sm">Aucune donnée</p>
              )}
            </div>

            {/* Operating Systems */}
            <div className="card p-4">
              <h3 className="font-medium mb-4">Systèmes d'exploitation</h3>
              {analytics?.demographics?.operatingSystems?.length > 0 ? (
                <div className="space-y-3">
                  {analytics.demographics.operatingSystems.map((os) => {
                    const total = analytics.demographics.operatingSystems.reduce((sum, o) => sum + o.views, 0)
                    const percent = total > 0 ? ((os.views / total) * 100).toFixed(1) : 0
                    const icons = { windows: '🪟', macos: '🍎', linux: '🐧', android: '🤖', ios: '📱' }
                    return (
                      <div key={os.os} className="flex items-center gap-3">
                        <span className="text-lg">{icons[os.os?.toLowerCase()] || '💻'}</span>
                        <span className="w-16 text-sm">{os.os || 'Autre'}</span>
                        <div className="flex-1 h-2 bg-dark-700 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                        <span className="text-sm text-dark-400 w-14 text-right">{percent}%</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-dark-400 text-center py-6 text-sm">Aucune donnée</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Browsers */}
            <div className="card p-4">
              <h3 className="font-medium mb-4">Navigateurs</h3>
              {analytics?.demographics?.browsers?.length > 0 ? (
                <div className="space-y-3">
                  {analytics.demographics.browsers.map((browser) => {
                    const total = analytics.demographics.browsers.reduce((sum, b) => sum + b.views, 0)
                    const percent = total > 0 ? ((browser.views / total) * 100).toFixed(1) : 0
                    const icons = { chrome: '🌐', firefox: '🦊', safari: '🧭', edge: '🔷', opera: '🔴' }
                    return (
                      <div key={browser.browser} className="flex items-center gap-3">
                        <span className="text-lg">{icons[browser.browser?.toLowerCase()] || '🌐'}</span>
                        <span className="w-16 text-sm">{browser.browser || 'Autre'}</span>
                        <div className="flex-1 h-2 bg-dark-700 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                        <span className="text-sm text-dark-400 w-14 text-right">{percent}%</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-dark-400 text-center py-6 text-sm">Aucune donnée</p>
              )}
            </div>

            {/* Countries */}
            <div className="card p-4">
              <h3 className="font-medium mb-4">Pays</h3>
              {analytics?.demographics?.countries?.length > 0 ? (
                <div className="space-y-2">
                  {analytics.demographics.countries.slice(0, 5).map((country, index) => {
                    const total = analytics.demographics.countries.reduce((sum, c) => sum + c.views, 0)
                    const percent = total > 0 ? ((country.views / total) * 100).toFixed(1) : 0
                    return (
                      <div key={country.country} className="flex items-center justify-between py-2 border-b border-dark-700 last:border-0">
                        <span className="text-sm">{index + 1}. {country.country}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-dark-500">{percent}%</span>
                          <span className="text-sm text-dark-400">{formatNumber(country.views)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-dark-400 text-center py-6 text-sm">Aucune donnée</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Realtime Tab */}
      {activeTab === 'realtime' && (
        <div className="space-y-6">
          {/* Live Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-6 text-center bg-gradient-to-br from-primary-500/20 to-transparent">
              <div className="w-3 h-3 bg-red-500 rounded-full mx-auto mb-2 animate-pulse" />
              <p className="text-3xl sm:text-4xl font-bold">{realtime?.currentlyWatching || 0}</p>
              <p className="text-dark-400 text-sm">Spectateurs actuels</p>
            </div>
            <div className="card p-6 text-center">
              <p className="text-3xl sm:text-4xl font-bold text-primary-400">{realtime?.viewsLastHour || 0}</p>
              <p className="text-dark-400 text-sm">Vues (dernière heure)</p>
            </div>
            <div className="card p-6 text-center">
              <p className="text-3xl sm:text-4xl font-bold text-green-400">
                {realtime?.viewsPerMinute?.reduce((sum, m) => sum + m.views, 0) || 0}
              </p>
              <p className="text-dark-400 text-sm">Vues (30 dernières min)</p>
            </div>
          </div>

          {/* Realtime Chart */}
          {realtime?.viewsPerMinute?.length > 0 && (
            <div className="card p-4">
              <h3 className="font-medium mb-4">Vues en temps réel (30 dernières minutes)</h3>
              <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={realtime.viewsPerMinute}>
                    <XAxis dataKey="minute" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }} />
                    <Line type="monotone" dataKey="views" stroke="#ef4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <p className="text-dark-500 text-xs text-center">Mise à jour automatique toutes les minutes</p>
        </div>
      )}
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
