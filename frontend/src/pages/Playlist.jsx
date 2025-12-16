import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FiPlay, FiList, FiClock, FiTrash2, FiEdit2, FiX, FiMoreVertical } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import useAuthStore from '../store/authStore'
import VideoCard from '../components/VideoCard'
import { useIsMobile } from '../hooks/useMediaQuery'
import toast from 'react-hot-toast'

const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m} min`
}

export default function Playlist() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [playlist, setPlaylist] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    fetchPlaylist()
  }, [id])

  const fetchPlaylist = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/playlists/${id}`)
      setPlaylist(response.data)
    } catch (error) {
      toast.error('Playlist non trouvée')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveVideo = async (videoId) => {
    try {
      await api.delete(`/playlists/${id}/videos/${videoId}`)
      setPlaylist(prev => ({
        ...prev,
        videos: prev.videos.filter(v => v.id !== videoId),
        video_count: prev.video_count - 1
      }))
      toast.success('Vidéo retirée')
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const handleOpenEdit = () => {
    setEditForm({ title: playlist.title, description: playlist.description || '' })
    setShowEditModal(true)
    setShowMenu(false)
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editForm.title.trim()) {
      toast.error('Le titre est requis')
      return
    }
    setSaving(true)
    try {
      await api.put(`/playlists/${id}`, editForm)
      setPlaylist(prev => ({ ...prev, ...editForm }))
      setShowEditModal(false)
      toast.success('Playlist mise à jour')
    } catch (error) {
      toast.error('Erreur')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePlaylist = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette playlist ?')) return
    try {
      await api.delete(`/playlists/${id}`)
      toast.success('Playlist supprimée')
      navigate(-1)
    } catch (error) {
      toast.error('Erreur')
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <div className="w-full sm:w-80 aspect-video bg-dark-800 rounded-xl" />
          <div className="flex-1 space-y-3">
            <div className="h-6 bg-dark-800 rounded w-3/4" />
            <div className="h-4 bg-dark-800 rounded w-1/2" />
            <div className="h-4 bg-dark-800 rounded w-1/4" />
          </div>
        </div>
      </div>
    )
  }

  if (!playlist) {
    return (
      <div className="text-center py-20">
        <FiList className="w-16 h-16 mx-auto text-dark-600 mb-4" />
        <p className="text-dark-400">Playlist non trouvée</p>
      </div>
    )
  }

  const isOwner = user?.id && playlist.channel_id && user.channels?.some(c => c.id === playlist.channel_id)

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Playlist Header */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6">
        {/* Thumbnail */}
        <div className="w-full sm:w-80 aspect-video bg-dark-800 rounded-xl overflow-hidden relative group flex-shrink-0">
          {playlist.thumbnail_url ? (
            <img src={playlist.thumbnail_url} alt={playlist.title} className="w-full h-full object-cover" />
          ) : playlist.videos?.[0]?.thumbnail_url ? (
            <img src={playlist.videos[0].thumbnail_url} alt={playlist.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FiList className="w-12 h-12 text-dark-600" />
            </div>
          )}
          {playlist.videos?.length > 0 && (
            <Link 
              to={`/watch/${playlist.videos[0].id}?list=${playlist.id}`}
              className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <div className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-medium">
                <FiPlay className="w-5 h-5" />
                Tout lire
              </div>
            </Link>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl sm:text-2xl font-bold">{playlist.title}</h1>
            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-dark-800 rounded-full"
                >
                  <FiMoreVertical className="w-5 h-5" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-1 bg-dark-800 rounded-lg border border-dark-700 py-1 min-w-[150px] z-10">
                    <button
                      onClick={handleOpenEdit}
                      className="w-full flex items-center gap-2 px-4 py-2 hover:bg-dark-700 text-left"
                    >
                      <FiEdit2 className="w-4 h-4" />
                      Modifier
                    </button>
                    <button
                      onClick={handleDeletePlaylist}
                      className="w-full flex items-center gap-2 px-4 py-2 hover:bg-dark-700 text-left text-red-400"
                    >
                      <FiTrash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <Link 
            to={`/channel/${playlist.channel_handle}`}
            className="text-dark-400 hover:text-white text-sm sm:text-base mt-1 block"
          >
            {playlist.channel_name}
          </Link>
          <div className="flex items-center gap-3 text-dark-400 text-sm mt-2">
            <span>{playlist.video_count || 0} vidéos</span>
            {playlist.total_duration > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <FiClock className="w-4 h-4" />
                  {formatDuration(playlist.total_duration)}
                </span>
              </>
            )}
          </div>
          {playlist.description && (
            <p className="text-dark-300 mt-3 text-sm line-clamp-3">{playlist.description}</p>
          )}
        </div>
      </div>

      {/* Videos */}
      {playlist.videos?.length === 0 ? (
        <div className="text-center py-12">
          <FiList className="w-12 h-12 mx-auto text-dark-600 mb-3" />
          <p className="text-dark-400">Cette playlist est vide</p>
        </div>
      ) : (
        <div className={`${isMobile ? 'space-y-3' : 'space-y-2'}`}>
          {playlist.videos?.map((video, index) => (
            <div key={video.id} className="flex items-start gap-2 group">
              <span className="text-dark-500 text-sm w-6 text-center pt-2 flex-shrink-0">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <VideoCard video={video} compact />
              </div>
              {isOwner && (
                <button
                  onClick={() => handleRemoveVideo(video.id)}
                  className="p-2 text-dark-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Retirer de la playlist"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-900 rounded-xl w-full max-w-md border border-dark-700">
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <h3 className="font-semibold">Modifier la playlist</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-dark-700 rounded"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Titre *</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="input w-full h-24 resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
