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
      <div className="animate-pulse">
        <div className="h-48 bg-dark-800 rounded-xl" />
        <div className="flex gap-6 mt-4">
          <div className="w-32 h-32 bg-dark-800 rounded-full" />
          <div className="flex-1 space-y-3">
            <div className="h-8 bg-dark-800 rounded w-1/3" />
            <div className="h-4 bg-dark-800 rounded w-1/4" />
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
    <div>
      <div 
        className="h-48 bg-dark-800 rounded-xl bg-cover bg-center"
        style={{ backgroundImage: channel.banner_url ? `url(${channel.banner_url})` : undefined }}
      />

      <div className="flex flex-wrap gap-6 mt-4 items-start">
        <div className="w-32 h-32 rounded-full bg-dark-700 overflow-hidden border-4 border-dark-950 -mt-16 relative z-10">
          {channel.avatar_url ? (
            <img src={channel.avatar_url} alt={channel.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl font-bold">
              {channel.name?.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{channel.name}</h1>
            {!!channel.is_verified && <FiCheck className="w-5 h-5 text-primary-500" />}
          </div>
          <p className="text-dark-400">@{channel.handle}</p>
          <p className="text-dark-400 text-sm mt-1">
            {formatCount(channel.subscriber_count)} abonnés • {channel.video_count} vidéos
          </p>
          {channel.description && (
            <p className="text-dark-300 mt-2 line-clamp-2">{channel.description}</p>
          )}
        </div>

        <div className="flex gap-2">
          {isOwner ? (
            <Link to="/studio" className="btn btn-secondary">Gérer la chaîne</Link>
          ) : (
            <button
              onClick={handleSubscribe}
              className={`btn ${isSubscribed ? 'btn-secondary' : 'btn-primary'}`}
            >
              {isSubscribed ? (
                <>
                  <FiBell className="w-4 h-4" />
                  Abonné
                </>
              ) : (
                "S'abonner"
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 border-b border-dark-800 mt-6">
        <button
          onClick={() => setActiveTab('videos')}
          className={`tab ${activeTab === 'videos' ? 'active' : ''}`}
        >
          Vidéos
        </button>
        <button
          onClick={() => setActiveTab('playlists')}
          className={`tab ${activeTab === 'playlists' ? 'active' : ''}`}
        >
          Playlists
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`tab ${activeTab === 'about' ? 'active' : ''}`}
        >
          À propos
        </button>
      </div>

      <div className="mt-6">
        {activeTab === 'videos' && (
          videos.length === 0 ? (
            <p className="text-center py-10 text-dark-400">Aucune vidéo</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.map((video) => (
                <VideoCard key={video.id} video={{ ...video, channel_name: channel.name, channel_handle: channel.handle }} />
              ))}
            </div>
          )
        )}

        {activeTab === 'about' && (
          <div className="max-w-2xl">
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-dark-300 whitespace-pre-wrap">{channel.description || 'Aucune description'}</p>
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Statistiques</h3>
              <p className="text-dark-400">Inscrit le {new Date(channel.created_at).toLocaleDateString('fr-FR')}</p>
              <p className="text-dark-400">{formatCount(channel.total_views)} vues totales</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
