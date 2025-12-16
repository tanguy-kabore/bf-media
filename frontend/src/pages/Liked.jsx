import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import api from '../services/api'
import useAuthStore from '../store/authStore'
import VideoCard from '../components/VideoCard'

export default function Liked() {
  const { isAuthenticated } = useAuthStore()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated) fetchLiked()
  }, [isAuthenticated])

  const fetchLiked = async () => {
    try {
      const response = await api.get('/users/liked')
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
      <h1 className="text-2xl font-bold mb-6">Vidéos aimées</h1>
      
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-40 aspect-video bg-dark-800 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-dark-800 rounded w-3/4" />
                <div className="h-3 bg-dark-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-dark-400 text-lg">Aucune vidéo aimée</p>
          <p className="text-dark-500 mt-2">Les vidéos que vous aimez apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} horizontal />
          ))}
        </div>
      )}
    </div>
  )
}
