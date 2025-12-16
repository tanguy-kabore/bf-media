import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FiBell, FiCheck } from 'react-icons/fi'
import api from '../services/api'
import useAuthStore from '../store/authStore'
import VideoCard from '../components/VideoCard'
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

  useEffect(() => {
    if (handle) {
      fetchChannel()
      fetchVideos()
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
              className={`btn text-sm sm:text-base ${isSubscribed ? 'btn-secondary' : 'btn-primary'}`}
            >
              {isSubscribed ? (
                <>
                  <FiBell className="w-4 h-4" />
                  <span>Abonné</span>
                </>
              ) : (
                "S'abonner"
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
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {videos.map((video) => (
                <VideoCard key={video.id} video={{ ...video, channel_name: channel.name, channel_handle: channel.handle }} />
              ))}
            </div>
          )
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
    </div>
  )
}
