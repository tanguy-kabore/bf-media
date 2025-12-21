import { useState, useEffect, useRef } from 'react'
import { FiExternalLink, FiVolume2, FiVolumeX } from 'react-icons/fi'
import api from '../services/api'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin

export default function SponsoredVideoCard({ ad, variant = 'grid', className = '' }) {
  const [muted, setMuted] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const videoRef = useRef(null)
  const impressionRecorded = useRef(false)

  useEffect(() => {
    // Record impression when card becomes visible
    if (!impressionRecorded.current && ad?.id) {
      impressionRecorded.current = true
      api.post(`/ads/${ad.id}/impression`).catch(() => {})
    }
  }, [ad?.id])

  // Auto-play video on hover
  useEffect(() => {
    if (videoRef.current) {
      if (isHovered) {
        videoRef.current.play().catch(() => {})
      } else {
        videoRef.current.pause()
        videoRef.current.currentTime = 0
      }
    }
  }, [isHovered])

  const handleClick = async (e) => {
    e.preventDefault()
    if (!ad) return

    let targetUrl = ad.target_url
    if (targetUrl && !targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl
    }

    try {
      const res = await api.post(`/ads/${ad.id}/click`)
      if (res.data?.target_url) {
        targetUrl = res.data.target_url
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
          targetUrl = 'https://' + targetUrl
        }
      }
    } catch (error) {
      console.error('Click tracking error:', error)
    }

    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const getMediaUrl = (url) => {
    if (!url) return null
    if (url.startsWith('http')) return url
    return `${API_BASE}${url}`
  }

  if (!ad) return null

  const mediaUrl = getMediaUrl(ad.media_url)
  const isVideo = mediaUrl?.match(/\.(mp4|webm)$/i)

  // Compact horizontal layout for mobile
  if (variant === 'compact') {
    return (
      <div 
        className={`flex gap-3 cursor-pointer group ${className}`}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative w-40 flex-shrink-0">
          <div className="aspect-video rounded-lg overflow-hidden bg-dark-800">
            {isVideo ? (
              <video
                ref={videoRef}
                src={mediaUrl}
                muted={muted}
                loop
                playsInline
                poster={mediaUrl.replace(/\.(mp4|webm)$/i, '.jpg')}
                className="w-full h-full object-cover"
              />
            ) : mediaUrl ? (
              <img src={mediaUrl} alt={ad.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary-600/30 to-primary-800/30" />
            )}
          </div>
          {/* Sponsored badge */}
          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-yellow-500/90 text-black text-[10px] font-bold rounded">
            Sponsorisé
          </div>
        </div>
        
        <div className="flex-1 min-w-0 py-0.5">
          <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary-400 transition-colors">
            {ad.title}
          </h3>
          {ad.description && (
            <p className="text-xs text-dark-400 mt-1 line-clamp-1">{ad.description}</p>
          )}
          <div className="flex items-center gap-1 mt-1.5 text-xs text-primary-400">
            <FiExternalLink className="w-3 h-3" />
            <span>En savoir plus</span>
          </div>
        </div>
      </div>
    )
  }

  // Grid layout (default)
  return (
    <div 
      className={`cursor-pointer group ${className}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        <div className="aspect-video rounded-xl overflow-hidden bg-dark-800">
          {isVideo ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              muted={muted}
              loop
              playsInline
              poster={mediaUrl.replace(/\.(mp4|webm)$/i, '.jpg')}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : mediaUrl ? (
            <img 
              src={mediaUrl} 
              alt={ad.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-600/30 to-primary-800/30 flex items-center justify-center">
              <span className="text-sm text-dark-400">{ad.title}</span>
            </div>
          )}
          
          {/* Video controls on hover */}
          {isVideo && isHovered && (
            <button
              onClick={(e) => { e.stopPropagation(); setMuted(!muted) }}
              className="absolute bottom-2 left-2 p-1.5 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
            >
              {muted ? <FiVolumeX className="w-4 h-4" /> : <FiVolume2 className="w-4 h-4" />}
            </button>
          )}
        </div>
        
        {/* Sponsored badge */}
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-yellow-500/90 text-black text-xs font-bold rounded">
          Sponsorisé
        </div>
      </div>
      
      <div className="mt-3">
        <h3 className="font-medium line-clamp-2 group-hover:text-primary-400 transition-colors">
          {ad.title}
        </h3>
        {ad.description && (
          <p className="text-sm text-dark-400 mt-1 line-clamp-2">{ad.description}</p>
        )}
        <div className="flex items-center gap-1.5 mt-2 text-sm text-primary-400">
          <FiExternalLink className="w-4 h-4" />
          <span>En savoir plus</span>
        </div>
      </div>
    </div>
  )
}
