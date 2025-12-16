import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { FiFilter } from 'react-icons/fi'
import api from '../services/api'
import VideoCard from '../components/VideoCard'

export default function Search() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [results, setResults] = useState({ videos: [], channels: [], playlists: [] })
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ type: 'all', sort: 'relevance', duration: '', uploadDate: '' })

  useEffect(() => {
    if (query) searchContent()
  }, [query, filters])

  const searchContent = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ q: query, ...filters })
      const response = await api.get(`/search?${params}`)
      setResults(response.data)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="input w-auto"
        >
          <option value="all">Tout</option>
          <option value="video">Vidéos</option>
          <option value="channel">Chaînes</option>
          <option value="playlist">Playlists</option>
        </select>
        <select
          value={filters.sort}
          onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
          className="input w-auto"
        >
          <option value="relevance">Pertinence</option>
          <option value="date">Date</option>
          <option value="views">Vues</option>
          <option value="rating">Note</option>
        </select>
        <select
          value={filters.duration}
          onChange={(e) => setFilters({ ...filters, duration: e.target.value })}
          className="input w-auto"
        >
          <option value="">Durée</option>
          <option value="short">Courte (&lt; 4 min)</option>
          <option value="medium">Moyenne (4-20 min)</option>
          <option value="long">Longue (&gt; 20 min)</option>
        </select>
        <select
          value={filters.uploadDate}
          onChange={(e) => setFilters({ ...filters, uploadDate: e.target.value })}
          className="input w-auto"
        >
          <option value="">Date d'upload</option>
          <option value="hour">Dernière heure</option>
          <option value="today">Aujourd'hui</option>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
          <option value="year">Cette année</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-64 aspect-video bg-dark-800 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-dark-800 rounded w-3/4" />
                <div className="h-4 bg-dark-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {results.channels?.length > 0 && (filters.type === 'all' || filters.type === 'channel') && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Chaînes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.channels.map((channel) => (
                  <Link
                    key={channel.id}
                    to={`/channel/${channel.handle}`}
                    className="card p-4 flex items-center gap-4 hover:bg-dark-800 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-full bg-dark-700 overflow-hidden">
                      {channel.avatar_url ? (
                        <img src={channel.avatar_url} alt={channel.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-bold">
                          {channel.name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{channel.name}</p>
                      <p className="text-sm text-dark-400">@{channel.handle}</p>
                      <p className="text-sm text-dark-400">{channel.subscriber_count} abonnés</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.videos?.length > 0 && (filters.type === 'all' || filters.type === 'video') && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Vidéos</h2>
              <div className="space-y-4">
                {results.videos.map((video) => (
                  <VideoCard key={video.id} video={video} horizontal />
                ))}
              </div>
            </div>
          )}

          {results.videos?.length === 0 && results.channels?.length === 0 && (
            <div className="text-center py-20">
              <p className="text-dark-400 text-lg">Aucun résultat pour "{query}"</p>
              <p className="text-dark-500 mt-2">Essayez avec d'autres termes</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
