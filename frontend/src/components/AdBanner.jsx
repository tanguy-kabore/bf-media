import { useState, useEffect, useRef } from 'react'
import { FiExternalLink, FiX, FiVolume2, FiVolumeX } from 'react-icons/fi'
import api from '../services/api'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin

export default function AdBanner({ position = 'sidebar', className = '' }) {
  const [ads, setAds] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [videoCountdown, setVideoCountdown] = useState(5)
  const [canSkip, setCanSkip] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [muted, setMuted] = useState(true)
  const videoRef = useRef(null)

  useEffect(() => {
    fetchAds()
  }, [position])

  const fetchAds = async () => {
    try {
      const res = await api.get(`/ads?position=${position}&limit=5`)
      setAds(res.data || [])
      
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
    } catch (error) {}
  }

  const handleClick = async (e, ad) => {
    e.stopPropagation()
    try {
      await api.post(`/ads/${ad.id}/click`)
    } catch (error) {}
    // Open link
    if (ad.target_url) {
      window.open(ad.target_url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleDismiss = (e) => {
    e.stopPropagation()
    if (canSkip) {
      setDismissed(true)
    }
  }

  // Video countdown for skip
  useEffect(() => {
    const ad = ads[currentIndex]
    if (!ad) return
    
    const mediaUrl = getMediaUrl(ad.media_url)
    const isVideo = mediaUrl?.match(/\.(mp4|webm)$/i)
    
    if (isVideo && !canSkip) {
      setVideoCountdown(5)
      const timer = setInterval(() => {
        setVideoCountdown(prev => {
          if (prev <= 1) {
            setCanSkip(true)
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    } else if (!isVideo) {
      setCanSkip(true)
    }
  }, [ads, currentIndex])

  // Rotate ads every 15 seconds if multiple
  useEffect(() => {
    if (ads.length <= 1 || dismissed) return
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const next = (prev + 1) % ads.length
        recordImpression(ads[next].id)
        setCanSkip(false)
        setDismissed(false)
        return next
      })
    }, 15000)
    
    return () => clearInterval(interval)
  }, [ads, dismissed])

  const getMediaUrl = (url) => {
    if (!url) return null
    if (url.startsWith('http')) return url
    return `${API_BASE}${url}`
  }

  if (ads.length === 0 || dismissed) return null

  const ad = ads[currentIndex]
  const mediaUrl = getMediaUrl(ad.media_url)
  const isVideo = mediaUrl?.match(/\.(mp4|webm)$/i)

  // Render media
  const renderMedia = (customClass = '', showControls = false) => {
    if (!mediaUrl) {
      return (
        <div className={`bg-gradient-to-br from-primary-600/20 to-primary-800/20 flex items-center justify-center min-h-[100px] ${customClass}`}>
          <div className="text-center p-4">
            <p className="font-medium text-sm">{ad.title}</p>
            {ad.description && <p className="text-xs text-dark-400 mt-1">{ad.description}</p>}
          </div>
        </div>
      )
    }
    
    if (isVideo) {
      return (
        <div className="relative">
          <video 
            ref={videoRef}
            src={mediaUrl} 
            className={customClass} 
            muted={muted}
            autoPlay 
            loop 
            playsInline
            onClick={(e) => e.stopPropagation()}
          />
          {/* Video controls overlay */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <button 
              onClick={(e) => { e.stopPropagation(); setMuted(!muted) }}
              className="p-1.5 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
            >
              {muted ? <FiVolumeX className="w-3.5 h-3.5" /> : <FiVolume2 className="w-3.5 h-3.5" />}
            </button>
            {!canSkip && (
              <span className="px-2 py-1 bg-black/60 rounded text-xs">
                Passer dans {videoCountdown}s
              </span>
            )}
          </div>
        </div>
      )
    }
    return <img src={mediaUrl} alt={ad.title} className={customClass} loading="lazy" />
  }

  // Sidebar layout
  if (position === 'sidebar') {
    return (
      <div className={`bg-dark-800 rounded-xl border border-dark-700 overflow-hidden ${className}`}>
        <div className="px-3 py-2 border-b border-dark-700 flex items-center justify-between">
          <span className="text-xs text-dark-400">Publicité</span>
          <div className="flex items-center gap-2">
            {ads.length > 1 && (
              <div className="flex gap-1">
                {ads.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentIndex ? 'bg-primary-500' : 'bg-dark-600'}`} />
                ))}
              </div>
            )}
            {canSkip && (
              <button onClick={handleDismiss} className="p-0.5 hover:bg-dark-600 rounded">
                <FiX className="w-3.5 h-3.5 text-dark-400" />
              </button>
            )}
          </div>
        </div>
        <div className="cursor-pointer" onClick={(e) => handleClick(e, ad)}>
          {renderMedia('w-full h-auto max-h-48 object-cover')}
        </div>
        <div className="px-3 py-2 border-t border-dark-700">
          <button 
            onClick={(e) => handleClick(e, ad)}
            className="w-full flex items-center justify-between gap-2 hover:text-primary-400 transition-colors"
          >
            <span className="text-xs font-medium truncate">{ad.title}</span>
            <FiExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
          </button>
        </div>
      </div>
    )
  }

  // Header/Footer layout
  if (position === 'header' || position === 'footer') {
    return (
      <div className={`bg-dark-800 rounded-lg border border-dark-700 overflow-hidden ${className}`}>
        <div className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3">
          <div className="w-20 sm:w-24 h-12 sm:h-14 flex-shrink-0 rounded overflow-hidden bg-dark-700 cursor-pointer" onClick={(e) => handleClick(e, ad)}>
            {mediaUrl && (
              isVideo ? 
                <video src={mediaUrl} className="w-full h-full object-cover" muted autoPlay loop playsInline /> :
                <img src={mediaUrl} alt={ad.title} className="w-full h-full object-cover" />
            )}
          </div>
          <div className="flex-1 min-w-0 cursor-pointer" onClick={(e) => handleClick(e, ad)}>
            <p className="font-medium text-sm truncate">{ad.title}</p>
            {ad.description && <p className="text-xs text-dark-400 truncate hidden sm:block">{ad.description}</p>}
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <span className="text-xs text-dark-500 px-1.5 sm:px-2 py-0.5 bg-dark-700 rounded">Pub</span>
            <button onClick={(e) => handleClick(e, ad)} className="p-1.5 hover:bg-dark-600 rounded">
              <FiExternalLink className="w-4 h-4" />
            </button>
            {canSkip && (
              <button onClick={handleDismiss} className="p-1.5 hover:bg-dark-600 rounded">
                <FiX className="w-4 h-4 text-dark-400" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // In-feed layout
  if (position === 'in_feed') {
    return (
      <div className={`bg-dark-800 rounded-xl border border-dark-700 overflow-hidden ${className}`}>
        <div className="cursor-pointer" onClick={(e) => handleClick(e, ad)}>
          {renderMedia('w-full aspect-video object-cover')}
        </div>
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 cursor-pointer" onClick={(e) => handleClick(e, ad)}>
              <p className="font-medium text-sm sm:text-base truncate">{ad.title}</p>
              {ad.description && <p className="text-xs sm:text-sm text-dark-400 line-clamp-2 mt-1">{ad.description}</p>}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-xs text-dark-500 px-2 py-0.5 bg-dark-700 rounded">Sponsorisé</span>
              {canSkip && (
                <button onClick={handleDismiss} className="p-1 hover:bg-dark-600 rounded">
                  <FiX className="w-3.5 h-3.5 text-dark-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Default fallback
  return (
    <div className={`bg-dark-800 rounded-xl border border-dark-700 overflow-hidden ${className}`}>
      <div className="cursor-pointer" onClick={(e) => handleClick(e, ad)}>
        {renderMedia('w-full h-auto object-cover')}
      </div>
      <div className="p-3 flex items-center justify-between">
        <button onClick={(e) => handleClick(e, ad)} className="flex-1 min-w-0 text-left hover:text-primary-400">
          <span className="text-sm font-medium truncate block">{ad.title}</span>
        </button>
        <div className="flex items-center gap-1 ml-2">
          <span className="text-xs text-dark-500 px-2 py-0.5 bg-dark-700 rounded">Pub</span>
          {canSkip && (
            <button onClick={handleDismiss} className="p-1 hover:bg-dark-600 rounded">
              <FiX className="w-3.5 h-3.5 text-dark-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
