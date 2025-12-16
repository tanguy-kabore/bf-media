import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { FiTrendingUp, FiMusic, FiMonitor, FiFilm } from 'react-icons/fi'
import api from '../services/api'
import VideoCard from '../components/VideoCard'
import { useIsMobile } from '../hooks/useMediaQuery'

const categoryConfig = {
  trending: {
    name: 'Tendances',
    icon: FiTrendingUp,
    description: 'Les vidéos les plus populaires du moment',
    sort: 'trending'
  },
  music: {
    name: 'Musique',
    icon: FiMusic,
    description: 'Clips, concerts et contenus musicaux',
    slug: 'music'
  },
  gaming: {
    name: 'Jeux vidéo',
    icon: FiMonitor,
    description: 'Gaming, esport et walkthroughs',
    slug: 'gaming'
  },
  films: {
    name: 'Films',
    icon: FiFilm,
    description: 'Courts-métrages, trailers et cinéma',
    slug: 'films'
  }
}

export default function Category() {
  const { slug } = useParams()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()

  const config = categoryConfig[slug] || { name: slug, description: '' }
  const Icon = config.icon || FiFilm

  useEffect(() => {
    fetchVideos()
  }, [slug])

  const fetchVideos = async () => {
    setLoading(true)
    try {
      let url = '/videos?'
      
      if (slug === 'trending') {
        url += 'sort=trending&limit=40'
      } else {
        url += `category=${config.slug || slug}&limit=40`
      }
      
      const response = await api.get(url)
      setVideos(response.data.videos || [])
    } catch (error) {
      console.error('Error fetching videos:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{config.name}</h1>
            {config.description && (
              <p className="text-dark-400 text-sm sm:text-base">{config.description}</p>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className={`${isMobile ? 'space-y-3' : 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'}`}>
          {[...Array(isMobile ? 6 : 8)].map((_, i) => (
            isMobile ? (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-36 h-20 bg-dark-800 rounded-lg flex-shrink-0" />
                <div className="flex-1 py-1">
                  <div className="h-4 bg-dark-800 rounded w-full mb-2" />
                  <div className="h-3 bg-dark-800 rounded w-2/3" />
                </div>
              </div>
            ) : (
              <div key={i} className="animate-pulse">
                <div className="aspect-video bg-dark-800 rounded-xl" />
                <div className="mt-3 flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-dark-800" />
                  <div className="flex-1">
                    <div className="h-4 bg-dark-800 rounded w-3/4" />
                    <div className="h-3 bg-dark-800 rounded w-1/2 mt-2" />
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      ) : videos.length > 0 ? (
        <div className={`${
          isMobile 
            ? 'space-y-3' 
            : 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
        }`}>
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} compact />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Icon className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-dark-600" />
          <h2 className="text-lg sm:text-xl font-semibold mt-4">Aucune vidéo</h2>
          <p className="text-dark-400 mt-2 text-sm sm:text-base">
            Aucune vidéo dans cette catégorie pour le moment
          </p>
        </div>
      )}
    </div>
  )
}
