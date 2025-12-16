import { useState, useEffect } from 'react'
import api from '../services/api'
import VideoCard from '../components/VideoCard'

const categories = [
  { id: null, name: 'Tout' },
  { id: 'music', name: 'Musique' },
  { id: 'gaming', name: 'Jeux vidéo' },
  { id: 'entertainment', name: 'Divertissement' },
  { id: 'education', name: 'Éducation' },
  { id: 'sports', name: 'Sport' },
  { id: 'news', name: 'Actualités' },
]

export default function Home() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(null)
  const [sort, setSort] = useState('recent')

  useEffect(() => {
    fetchVideos()
  }, [activeCategory, sort])

  const fetchVideos = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ sort, limit: 24 })
      if (activeCategory) params.append('category', activeCategory)
      const response = await api.get(`/videos?${params}`)
      setVideos(response.data.videos)
    } catch (error) {
      console.error('Error fetching videos:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id || 'all'}
            onClick={() => setActiveCategory(cat.id)}
            className={`chip whitespace-nowrap ${activeCategory === cat.id ? 'active' : ''}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-dark-800 rounded-xl" />
              <div className="flex gap-3 mt-3">
                <div className="w-9 h-9 bg-dark-800 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-dark-800 rounded w-3/4" />
                  <div className="h-3 bg-dark-800 rounded w-1/2 mt-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-dark-400 text-lg">Aucune vidéo disponible</p>
          <p className="text-dark-500 mt-2">Soyez le premier à uploader une vidéo !</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  )
}
