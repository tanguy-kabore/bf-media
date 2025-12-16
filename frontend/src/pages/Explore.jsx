import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiTrendingUp, FiMusic, FiMonitor, FiFilm, FiCompass } from 'react-icons/fi'
import api from '../services/api'
import VideoCard from '../components/VideoCard'
import { useIsMobile } from '../hooks/useMediaQuery'

const categories = [
  { slug: 'trending', name: 'Tendances', icon: FiTrendingUp, color: 'bg-red-500' },
  { slug: 'music', name: 'Musique', icon: FiMusic, color: 'bg-purple-500' },
  { slug: 'gaming', name: 'Jeux vidéo', icon: FiMonitor, color: 'bg-green-500' },
  { slug: 'films', name: 'Films', icon: FiFilm, color: 'bg-blue-500' },
]

export default function Explore() {
  const [trendingVideos, setTrendingVideos] = useState([])
  const [recentVideos, setRecentVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()

  useEffect(() => {
    fetchVideos()
  }, [])

  const fetchVideos = async () => {
    try {
      const [trendingRes, recentRes] = await Promise.all([
        api.get('/videos?sort=trending&limit=8'),
        api.get('/videos?sort=recent&limit=8')
      ])
      setTrendingVideos(trendingRes.data.videos || [])
      setRecentVideos(recentRes.data.videos || [])
    } catch (error) {
      console.error('Error fetching videos:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
          <FiCompass className="w-5 h-5 sm:w-6 sm:h-6 text-primary-400" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Explorer</h1>
          <p className="text-dark-400 text-sm sm:text-base">Découvrez de nouveaux contenus</p>
        </div>
      </div>

      {/* Categories */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Catégories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              to={`/category/${cat.slug}`}
              className="flex items-center gap-3 p-4 bg-dark-900 rounded-xl hover:bg-dark-800 transition-colors"
            >
              <div className={`w-10 h-10 ${cat.color} rounded-lg flex items-center justify-center`}>
                <cat.icon className="w-5 h-5 text-white" />
              </div>
              <span className="font-medium">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending Videos */}
      <section className="mb-8 sm:mb-12">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold">Tendances</h2>
          <Link to="/category/trending" className="text-primary-400 hover:text-primary-300 text-sm">
            Voir tout →
          </Link>
        </div>
        {loading ? (
          isMobile ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-36 h-20 bg-dark-800 rounded-lg flex-shrink-0" />
                  <div className="flex-1 py-1">
                    <div className="h-4 bg-dark-800 rounded w-full mb-2" />
                    <div className="h-3 bg-dark-800 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
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
              ))}
            </div>
          )
        ) : (
          <div className={`${
            isMobile 
              ? 'space-y-3' 
              : 'grid grid-cols-2 lg:grid-cols-4 gap-4'
          }`}>
            {trendingVideos.slice(0, 4).map((video) => (
              <VideoCard key={video.id} video={video} compact />
            ))}
          </div>
        )}
      </section>

      {/* Recent Videos */}
      <section>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold">Récemment ajoutées</h2>
        </div>
        {loading ? (
          <div className={`${isMobile ? 'space-y-3' : 'grid grid-cols-2 lg:grid-cols-4 gap-4'}`}>
            {[...Array(4)].map((_, i) => (
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
        ) : (
          <div className={`${
            isMobile 
              ? 'space-y-3' 
              : 'grid grid-cols-2 lg:grid-cols-4 gap-4'
          }`}>
            {recentVideos.map((video) => (
              <VideoCard key={video.id} video={video} compact />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
