import { useState, useEffect } from 'react'
import { useIsMobile } from '../hooks/useMediaQuery'
import api from '../services/api'
import VideoCard from '../components/VideoCard'
import AdBanner from '../components/AdBanner'
import SponsoredVideoCard from '../components/SponsoredVideoCard'

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
  const isMobile = useIsMobile()
  const [videos, setVideos] = useState([])
  const [sponsoredAds, setSponsoredAds] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(null)
  const [sort, setSort] = useState('recent')

  useEffect(() => {
    fetchVideos()
    fetchSponsoredAds()
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

  const fetchSponsoredAds = async () => {
    try {
      const params = new URLSearchParams({
        position: 'in_feed',
        limit: '2'
      })
      if (activeCategory) params.append('category', activeCategory)
      const response = await api.get(`/ads?${params}`)
      setSponsoredAds(response.data || [])
    } catch (error) {
      console.error('Error fetching sponsored ads:', error)
    }
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Header Ad */}
      <AdBanner position="header" className="mb-4 -mx-3 sm:mx-0 sm:rounded-lg" />

      {/* Categories - horizontal scroll on mobile */}
      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-4 hide-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
        {categories.map((cat) => (
          <button
            key={cat.id || 'all'}
            onClick={() => setActiveCategory(cat.id)}
            className={`chip whitespace-nowrap flex-shrink-0 ${activeCategory === cat.id ? 'active' : ''}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {loading ? (
        isMobile ? (
          // Mobile loading skeleton - compact horizontal
          <div className="space-y-3 mt-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-36 aspect-video bg-dark-800 rounded-lg flex-shrink-0" />
                <div className="flex-1 py-1">
                  <div className="h-4 bg-dark-800 rounded w-full" />
                  <div className="h-3 bg-dark-800 rounded w-2/3 mt-2" />
                  <div className="h-3 bg-dark-800 rounded w-1/2 mt-1" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Desktop loading skeleton - grid
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-video bg-dark-800 rounded-xl" />
                <div className="flex gap-3 mt-3">
                  <div className="w-9 h-9 bg-dark-800 rounded-full flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="h-4 bg-dark-800 rounded w-3/4" />
                    <div className="h-3 bg-dark-800 rounded w-1/2 mt-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : videos.length === 0 ? (
        <div className="text-center py-12 sm:py-20">
          <p className="text-dark-400 text-base sm:text-lg">Aucune vidéo disponible</p>
          <p className="text-dark-500 mt-2 text-sm sm:text-base">Soyez le premier à uploader une vidéo !</p>
        </div>
      ) : (
        // Responsive grid - compact on mobile, full cards on desktop
        <div className={`mt-4 ${
          isMobile 
            ? 'space-y-3' 
            : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-5'
        }`}>
          {/* Sponsored ads first */}
          {sponsoredAds.map((ad) => (
            <SponsoredVideoCard key={`ad-${ad.id}`} ad={ad} variant={isMobile ? 'compact' : 'grid'} />
          ))}
          {/* Regular videos */}
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} compact={isMobile} />
          ))}
        </div>
      )}
    </div>
  )
}
