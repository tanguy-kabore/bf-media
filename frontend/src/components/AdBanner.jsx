import { useState, useEffect } from 'react'
import { FiExternalLink } from 'react-icons/fi'
import api from '../services/api'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

export default function AdBanner({ position = 'sidebar', className = '' }) {
  const [ads, setAds] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    fetchAds()
  }, [position])

  const fetchAds = async () => {
    try {
      const res = await api.get(`/ads?position=${position}&limit=5`)
      setAds(res.data || [])
      
      // Record impression for first ad
      if (res.data?.length > 0) {
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
  
  // Get full media URL (handle both uploaded and external URLs)
  const getMediaUrl = (url) => {
    if (!url) return null
    if (url.startsWith('http')) return url
    return `${API_BASE}${url}`
  }
  
  const mediaUrl = getMediaUrl(ad.media_url)
  const isVideo = mediaUrl?.match(/\.(mp4|webm)$/i)

  // Render media (image or video)
  const renderMedia = (customClass = '') => {
    if (!mediaUrl) {
      return (
        <div className={`bg-gradient-to-br from-primary-600/20 to-primary-800/20 flex items-center justify-center ${customClass}`}>
          <div className="text-center p-4">
            <p className="font-medium">{ad.title}</p>
            {ad.description && <p className="text-xs text-dark-400 mt-1">{ad.description}</p>}
          </div>
        </div>
      )
    }
    
    if (isVideo) {
      return <video src={mediaUrl} className={customClass} muted autoPlay loop playsInline />
    }
    return <img src={mediaUrl} alt={ad.title} className={customClass} />
  }

  // Different layouts based on position
  if (position === 'sidebar') {
    return (
      <div className={`bg-dark-800 rounded-xl border border-dark-700 overflow-hidden ${className}`}>
        <div className="px-3 py-2 border-b border-dark-700 flex items-center justify-between">
          <span className="text-xs text-dark-400">Publicité</span>
          {ads.length > 1 && (
            <div className="flex gap-1">
              {ads.map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentIndex ? 'bg-primary-500' : 'bg-dark-600'}`} />
              ))}
            </div>
          )}
        </div>
        <div className="cursor-pointer hover:opacity-90 transition-opacity" onClick={() => handleClick(ad)}>
          {renderMedia('w-full h-auto object-cover')}
        </div>
        <div className="px-3 py-2 border-t border-dark-700 flex items-center justify-between">
          <p className="text-xs font-medium truncate flex-1">{ad.title}</p>
          <FiExternalLink className="w-3 h-3 text-dark-500 flex-shrink-0 ml-2" />
        </div>
      </div>
    )
  }

  if (position === 'header' || position === 'footer') {
    return (
      <div className={`bg-dark-800 rounded-lg border border-dark-700 overflow-hidden ${className}`}>
        <div className="flex items-center gap-4 p-3 cursor-pointer hover:bg-dark-700/50 transition-colors" onClick={() => handleClick(ad)}>
          {mediaUrl && (
            isVideo ? 
              <video src={mediaUrl} className="w-24 h-14 object-cover rounded" muted autoPlay loop playsInline /> :
              <img src={mediaUrl} alt={ad.title} className="w-24 h-14 object-cover rounded" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{ad.title}</p>
            {ad.description && <p className="text-xs text-dark-400 truncate">{ad.description}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-dark-500 px-2 py-0.5 bg-dark-700 rounded">Pub</span>
            <FiExternalLink className="w-4 h-4 text-dark-400" />
          </div>
        </div>
      </div>
    )
  }

  if (position === 'in_feed') {
    return (
      <div className={`bg-dark-800 rounded-xl border border-dark-700 overflow-hidden ${className}`}>
        <div className="cursor-pointer hover:opacity-90 transition-opacity" onClick={() => handleClick(ad)}>
          {renderMedia('w-full aspect-video object-cover')}
        </div>
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{ad.title}</p>
              {ad.description && <p className="text-sm text-dark-400 line-clamp-2 mt-1">{ad.description}</p>}
            </div>
            <span className="text-xs text-dark-500 px-2 py-0.5 bg-dark-700 rounded flex-shrink-0">Sponsorisé</span>
          </div>
        </div>
      </div>
    )
  }

  // Default fallback for any position
  return (
    <div className={`bg-dark-800 rounded-xl border border-dark-700 overflow-hidden ${className}`}>
      <div className="cursor-pointer hover:opacity-90 transition-opacity" onClick={() => handleClick(ad)}>
        {renderMedia('w-full h-auto object-cover')}
      </div>
      <div className="p-3 flex items-center justify-between">
        <p className="text-sm font-medium truncate flex-1">{ad.title}</p>
        <span className="text-xs text-dark-500 px-2 py-0.5 bg-dark-700 rounded ml-2">Pub</span>
      </div>
    </div>
  )
}
