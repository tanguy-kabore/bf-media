import { useState, useEffect } from 'react'
import api from '../services/api'

export default function AdBanner({ position = 'sidebar', className = '' }) {
  const [ads, setAds] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    fetchAds()
  }, [position])

  const fetchAds = async () => {
    try {
      const res = await api.get(`/ads?position=${position}&limit=5`)
      setAds(res.data)
      
      // Record impression for first ad
      if (res.data.length > 0) {
        recordImpression(res.data[0].id)
      }
    } catch (error) {
      console.error('Error fetching ads:', error)
    }
  }

  const recordImpression = async (adId) => {
    try {
      await api.post(`/ads/${adId}/impression`)
    } catch (error) {
      // Silent fail for impressions
    }
  }

  const handleClick = async (ad) => {
    try {
      await api.post(`/ads/${ad.id}/click`)
      window.open(ad.target_url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      // Still open the link even if tracking fails
      window.open(ad.target_url, '_blank', 'noopener,noreferrer')
    }
  }

  // Rotate ads every 10 seconds if multiple
  useEffect(() => {
    if (ads.length <= 1) return
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const next = (prev + 1) % ads.length
        recordImpression(ads[next].id)
        return next
      })
    }, 10000)
    
    return () => clearInterval(interval)
  }, [ads])

  if (ads.length === 0) return null

  const ad = ads[currentIndex]

  // Different layouts based on position
  if (position === 'sidebar') {
    return (
      <div className={`bg-dark-800 rounded-xl border border-dark-700 overflow-hidden ${className}`}>
        <div className="px-3 py-2 border-b border-dark-700 flex items-center justify-between">
          <span className="text-xs text-dark-400">Publicité</span>
          {ads.length > 1 && (
            <div className="flex gap-1">
              {ads.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1.5 h-1.5 rounded-full ${i === currentIndex ? 'bg-primary-500' : 'bg-dark-600'}`}
                />
              ))}
            </div>
          )}
        </div>
        <div 
          className="cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => handleClick(ad)}
        >
          {ad.media_url ? (
            <img 
              src={ad.media_url} 
              alt={ad.title}
              className="w-full h-auto object-cover"
            />
          ) : (
            <div className="p-4 bg-gradient-to-br from-primary-600/20 to-primary-800/20">
              <p className="font-medium text-sm">{ad.title}</p>
              {ad.description && (
                <p className="text-xs text-dark-400 mt-1 line-clamp-2">{ad.description}</p>
              )}
            </div>
          )}
        </div>
        <div className="px-3 py-2 border-t border-dark-700">
          <p className="text-xs font-medium truncate">{ad.title}</p>
        </div>
      </div>
    )
  }

  if (position === 'header' || position === 'footer') {
    return (
      <div className={`bg-dark-800 border border-dark-700 overflow-hidden ${className}`}>
        <div 
          className="flex items-center gap-4 p-3 cursor-pointer hover:bg-dark-700/50 transition-colors"
          onClick={() => handleClick(ad)}
        >
          {ad.media_url && (
            <img 
              src={ad.media_url} 
              alt={ad.title}
              className="w-20 h-12 object-cover rounded"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{ad.title}</p>
            {ad.description && (
              <p className="text-xs text-dark-400 truncate">{ad.description}</p>
            )}
          </div>
          <span className="text-xs text-dark-500 px-2 py-0.5 bg-dark-700 rounded">Pub</span>
        </div>
      </div>
    )
  }

  if (position === 'in_feed') {
    return (
      <div className={`bg-dark-800 rounded-xl border border-dark-700 overflow-hidden ${className}`}>
        <div 
          className="cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => handleClick(ad)}
        >
          {ad.media_url ? (
            <img 
              src={ad.media_url} 
              alt={ad.title}
              className="w-full aspect-video object-cover"
            />
          ) : (
            <div className="aspect-video bg-gradient-to-br from-primary-600/30 to-primary-800/30 flex items-center justify-center">
              <p className="text-lg font-medium">{ad.title}</p>
            </div>
          )}
        </div>
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{ad.title}</p>
              {ad.description && (
                <p className="text-sm text-dark-400 line-clamp-2 mt-1">{ad.description}</p>
              )}
            </div>
            <span className="text-xs text-dark-500 px-2 py-0.5 bg-dark-700 rounded flex-shrink-0">Sponsorisé</span>
          </div>
        </div>
      </div>
    )
  }

  return null
}
