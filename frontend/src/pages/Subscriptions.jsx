import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import api from '../services/api'
import useAuthStore from '../store/authStore'
import VideoCard from '../components/VideoCard'

export default function Subscriptions() {
  const { isAuthenticated } = useAuthStore()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated) fetchFeed()
  }, [isAuthenticated])

  const fetchFeed = async () => {
    try {
      const response = await api.get('/subscriptions/feed')
      setVideos(response.data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Abonnements</h1>
      
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-dark-800 rounded-xl" />
              <div className="flex gap-3 mt-3">
                <div className="w-9 h-9 bg-dark-800 rounded-full" />
                <div className="flex-1"><div className="h-4 bg-dark-800 rounded w-3/4" /></div>
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-dark-400 text-lg">Aucune nouvelle vidéo</p>
          <p className="text-dark-500 mt-2">Abonnez-vous à des chaînes pour voir leurs vidéos ici</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  )
}
