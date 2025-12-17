import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FiBell, FiCheck, FiList, FiPlay, FiPlus, FiX, FiUserPlus } from 'react-icons/fi'
import api from '../services/api'
import useAuthStore from '../store/authStore'
import VideoCard from '../components/VideoCard'
import { useIsMobile } from '../hooks/useMediaQuery'
import toast from 'react-hot-toast'

const formatCount = (count) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count?.toString() || '0'
}

export default function Channel() {
  const { handle } = useParams()
  const { user, isAuthenticated } = useAuthStore()
  const [channel, setChannel] = useState(null)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [activeTab, setActiveTab] = useState('videos')
  const [playlists, setPlaylists] = useState([])
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false)
  const [newPlaylist, setNewPlaylist] = useState({ title: '', description: '' })
  const [creating, setCreating] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (handle) {
      fetchChannel()
      fetchVideos()
      fetchPlaylists()
    }
  }, [handle])

  const fetchChannel = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/channels/${handle}`)
      setChannel(response.data)
      setIsSubscribed(response.data.isSubscribed)
    } catch (error) {
      toast.error('Chaîne non trouvée')
    } finally {
      setLoading(false)
    }
  }

  const fetchVideos = async () => {
    try {
      const response = await api.get(`/channels/${handle}/videos`)
      setVideos(response.data.videos)
    } catch (error) {
      console.error('Error fetching videos:', error)
    }
  }

  const fetchPlaylists = async () => {
    try {
      const response = await api.get(`/channels/${handle}/playlists`)
      setPlaylists(response.data || [])
    } catch (error) {
      console.error('Error fetching playlists:', error)
    }
  }

  const handleCreatePlaylist = async (e) => {
    e.preventDefault()
    if (!newPlaylist.title.trim()) {
      toast.error('Le titre est requis')
      return
    }
    setCreating(true)
    try {
      const response = await api.post('/playlists', {
        title: newPlaylist.title,
        description: newPlaylist.description
      })
      setPlaylists(prev => [response.data, ...prev])
      setShowCreatePlaylist(false)
      setNewPlaylist({ title: '', description: '' })
      toast.success('Playlist créée !')
    } catch (error) {
      toast.error('Erreur lors de la création')
    } finally {
      setCreating(false)
    }
  }

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour vous abonner')
      return
    }
    try {
      if (isSubscribed) {
        await api.delete(`/subscriptions/${channel.id}`)
        setIsSubscribed(false)
        setChannel(prev => ({ ...prev, subscriber_count: prev.subscriber_count - 1 }))
      } else {
        await api.post(`/subscriptions/${channel.id}`)
        setIsSubscribed(true)
        setChannel(prev => ({ ...prev, subscriber_count: prev.subscriber_count + 1 }))
      }
    } catch (error) {
      toast.error('Erreur')
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse w-full max-w-full overflow-hidden">
        <div className="h-32 sm:h-48 bg-dark-800 rounded-lg sm:rounded-xl" />
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mt-4">
          <div className="w-20 h-20 sm:w-32 sm:h-32 bg-dark-800 rounded-full mx-auto sm:mx-0 -mt-10 sm:-mt-16" />
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <div className="h-6 sm:h-8 bg-dark-800 rounded w-1/2 mx-auto sm:mx-0" />
            <div className="h-4 bg-dark-800 rounded w-1/3 mx-auto sm:mx-0" />
          </div>
        </div>
      </div>
    )
  }

  if (!channel) {
    return <div className="text-center py-20 text-dark-400">Chaîne non trouvée</div>
  }

  const isOwner = user?.id === channel.user_id

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Banner */}
      <div 
        className="h-32 sm:h-48 bg-dark-800 rounded-lg sm:rounded-xl bg-cover bg-center"
        style={{ backgroundImage: channel.banner_url ? `url(${channel.banner_url})` : undefined }}
      />

      {/* Channel info - stacked on mobile, row on desktop */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-6 mt-4">
        {/* Avatar */}
        <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-dark-700 overflow-hidden border-4 border-dark-950 -mt-12 sm:-mt-16 relative z-10 flex-shrink-0">
          {channel.avatar_url ? (
            <img src={channel.avatar_url} alt={channel.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl sm:text-4xl font-bold">
              {channel.name?.charAt(0)}
            </div>
          )}
        </div>

        {/* Channel details */}
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{channel.name}</h1>
            {!!channel.is_verified && <FiCheck className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500 flex-shrink-0" />}
          </div>
          <p className="text-dark-400 text-sm sm:text-base">@{channel.handle}</p>
          <p className="text-dark-400 text-xs sm:text-sm mt-1">
            {formatCount(channel.subscriber_count)} abonnés • {channel.video_count} vidéos
          </p>
          {channel.description && (
            <p className="text-dark-300 mt-2 line-clamp-2 text-sm sm:text-base hidden sm:block">{channel.description}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end mt-2 sm:mt-0">
          {isOwner ? (
            <Link to="/studio" className="btn btn-secondary text-sm sm:text-base">Gérer la chaîne</Link>
          ) : (
            <button
              onClick={handleSubscribe}
              className={`group flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${
                isSubscribed 
                  ? 'bg-dark-700 text-white hover:bg-dark-600' 
                  : 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 hover:shadow-lg hover:shadow-red-500/25'
              }`}
            >
              {isSubscribed ? (
                <>
                  <FiBell className="w-4 h-4" />
                  <span>Abonné</span>
                </>
              ) : (
                <>
                  <FiUserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>S'abonner</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Tabs - horizontal scroll on mobile */}
      <div className="flex gap-2 sm:gap-4 border-b border-dark-800 mt-4 sm:mt-6 overflow-x-auto hide-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
        <button
          onClick={() => setActiveTab('videos')}
          className={`tab flex-shrink-0 ${activeTab === 'videos' ? 'active' : ''}`}
        >
          Vidéos
        </button>
        <button
          onClick={() => setActiveTab('playlists')}
          className={`tab flex-shrink-0 ${activeTab === 'playlists' ? 'active' : ''}`}
        >
          Playlists
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`tab flex-shrink-0 ${activeTab === 'about' ? 'active' : ''}`}
        >
          À propos
        </button>
      </div>

      {/* Tab content */}
      <div className="mt-4 sm:mt-6">
        {activeTab === 'videos' && (
          videos.length === 0 ? (
            <p className="text-center py-8 sm:py-10 text-dark-400 text-sm sm:text-base">Aucune vidéo</p>
          ) : (
            <div className={`${
              isMobile 
                ? 'space-y-3' 
                : 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            }`}>
              {videos.map((video) => (
                <VideoCard 
                  key={video.id} 
                  video={{ ...video, channel_name: channel.name, channel_handle: channel.handle }} 
                  compact 
                />
              ))}
            </div>
          )
        )}

        {activeTab === 'playlists' && (
          <>
            {isOwner && (
              <button
                onClick={() => setShowCreatePlaylist(true)}
                className="btn btn-primary mb-4 flex items-center gap-2"
              >
                <FiPlus className="w-4 h-4" />
                Créer une playlist
              </button>
            )}
            {playlists.length === 0 ? (
              <div className="text-center py-8 sm:py-10">
                <FiList className="w-12 h-12 mx-auto text-dark-600 mb-3" />
                <p className="text-dark-400 text-sm sm:text-base">Aucune playlist</p>
                {isOwner && (
                  <p className="text-dark-500 text-xs mt-1">Créez votre première playlist !</p>
                )}
              </div>
            ) : (
            <div className={`${
              isMobile 
                ? 'space-y-3' 
                : 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            }`}>
              {playlists.map((playlist) => (
                <Link 
                  key={playlist.id} 
                  to={`/playlist/${playlist.id}`}
                  className="group block"
                >
                  <div className={`${isMobile ? 'flex gap-3' : ''}`}>
                    <div className={`relative ${isMobile ? 'w-36 flex-shrink-0' : ''} aspect-video bg-dark-800 rounded-lg overflow-hidden`}>
                      {playlist.thumbnail_url ? (
                        <img src={playlist.thumbnail_url} alt={playlist.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FiList className="w-8 h-8 text-dark-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <FiPlay className="w-8 h-8" />
                      </div>
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-xs rounded">
                        {playlist.video_count} vidéos
                      </div>
                    </div>
                    <div className={`${isMobile ? 'flex-1 min-w-0 py-0.5' : 'mt-2'}`}>
                      <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary-400">{playlist.title}</h3>
                      {playlist.description && (
                        <p className="text-xs text-dark-400 mt-1 line-clamp-1">{playlist.description}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            )}
          </>
        )}

        {activeTab === 'about' && (
          <div className="max-w-2xl mx-auto sm:mx-0">
            <h3 className="font-semibold mb-2 text-sm sm:text-base">Description</h3>
            <p className="text-dark-300 whitespace-pre-wrap text-sm sm:text-base">{channel.description || 'Aucune description'}</p>
            <div className="mt-4 sm:mt-6">
              <h3 className="font-semibold mb-2 text-sm sm:text-base">Statistiques</h3>
              <p className="text-dark-400 text-sm">Inscrit le {new Date(channel.created_at).toLocaleDateString('fr-FR')}</p>
              <p className="text-dark-400 text-sm">{formatCount(channel.total_views)} vues totales</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Playlist Modal */}
      {showCreatePlaylist && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-900 rounded-xl w-full max-w-md border border-dark-700">
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <h3 className="font-semibold">Créer une playlist</h3>
              <button
                onClick={() => setShowCreatePlaylist(false)}
                className="p-1 hover:bg-dark-700 rounded"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePlaylist} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Titre *</label>
                <input
                  type="text"
                  value={newPlaylist.title}
                  onChange={(e) => setNewPlaylist(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ma playlist"
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={newPlaylist.description}
                  onChange={(e) => setNewPlaylist(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description de la playlist..."
                  className="input w-full h-24 resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreatePlaylist(false)}
                  className="btn btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn btn-primary"
                >
                  {creating ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
