import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { FiTrash2 } from 'react-icons/fi'
import api from '../services/api'
import useAuthStore from '../store/authStore'
import VideoCard from '../components/VideoCard'
import toast from 'react-hot-toast'

export default function History() {
  const { isAuthenticated } = useAuthStore()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated) fetchHistory()
  }, [isAuthenticated])

  const fetchHistory = async () => {
    try {
      const response = await api.get('/users/history/watch')
      setVideos(response.data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = async () => {
    if (!confirm('Effacer tout l\'historique ?')) return
    try {
      await api.delete('/users/history/watch')
      setVideos([])
      toast.success('Historique effacé')
    } catch (error) {
      toast.error('Erreur')
    }
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Historique</h1>
        {videos.length > 0 && (
          <button onClick={clearHistory} className="btn btn-ghost text-red-400">
            <FiTrash2 /> Effacer l'historique
          </button>
        )}
      </div>
      
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
          <p className="text-dark-400 text-lg">Aucun historique</p>
          <p className="text-dark-500 mt-2">Les vidéos que vous regardez apparaîtront ici</p>
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
