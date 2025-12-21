import { useState, useEffect, useRef } from 'react'
import { FiVolume2, FiVolumeX, FiExternalLink } from 'react-icons/fi'
import api from '../services/api'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin

const getDeviceType = () => {
  const ua = navigator.userAgent
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet'
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile'
  return 'desktop'
}

export default function PreRollAd({ onComplete, onSkip, category = '' }) {
  const [ad, setAd] = useState(null)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(5)
  const [canSkip, setCanSkip] = useState(false)
  const [muted, setMuted] = useState(true)
  const [progress, setProgress] = useState(0)
  const videoRef = useRef(null)
  const impressionRecorded = useRef(false)

  useEffect(() => {
    fetchPreRollAd()
  }, [])

  const fetchPreRollAd = async () => {
    try {
      const params = new URLSearchParams({
        position: 'pre_roll',
        limit: '1',
        device: getDeviceType()
      })
      if (category) params.append('category', category)
      
      const res = await api.get(`/ads?${params}`)
      
      if (res.data?.length > 0) {
        setAd(res.data[0])
        // Record impression
        if (!impressionRecorded.current) {
          impressionRecorded.current = true
          await api.post(`/ads/${res.data[0].id}/impression`)
        }
      } else {
        // No ad available, proceed to video
        onComplete?.()
      }
    } catch (error) {
      console.error('Error fetching pre-roll ad:', error)
      onComplete?.()
    } finally {
      setLoading(false)
    }
  }

  // Countdown timer
  useEffect(() => {
    if (!ad || canSkip) return

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCanSkip(true)
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [ad, canSkip])

  // Track video progress
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const percent = (videoRef.current.currentTime / videoRef.current.duration) * 100
      setProgress(percent)
      
      // Auto-complete when video ends
      if (videoRef.current.currentTime >= videoRef.current.duration - 0.5) {
        handleComplete()
      }
    }
  }

  const handleSkip = () => {
    if (canSkip) {
      onSkip?.()
    }
  }

  const handleComplete = () => {
    onComplete?.()
  }

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

  if (loading) {
    return (
      <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!ad) return null

  const mediaUrl = getMediaUrl(ad.media_url)
  const isVideo = mediaUrl?.match(/\.(mp4|webm)$/i)

  return (
    <div className="absolute inset-0 bg-black z-50 flex flex-col">
      {/* Ad content */}
      <div className="flex-1 relative flex items-center justify-center cursor-pointer" onClick={handleClick}>
        {isVideo ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            className="w-full h-full object-contain"
            muted={muted}
            autoPlay
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleComplete}
          />
        ) : (
          <img
            src={mediaUrl}
            alt={ad.title}
            className="max-w-full max-h-full object-contain"
          />
        )}

        {/* Overlay gradient at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
        
        {/* Ad info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-end justify-between gap-4">
            {/* Left side - Ad info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-yellow-500/90 text-black text-xs font-bold rounded">
                  PUBLICITÉ
                </span>
                {ad.title && (
                  <span className="text-sm text-white/90 truncate max-w-[200px]">
                    {ad.title}
                  </span>
                )}
              </div>
              
              {/* Progress bar */}
              {isVideo && (
                <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Right side - Controls */}
            <div className="flex items-center gap-2">
              {/* Mute button */}
              {isVideo && (
                <button
                  onClick={(e) => { e.stopPropagation(); setMuted(!muted) }}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                >
                  {muted ? <FiVolumeX className="w-5 h-5" /> : <FiVolume2 className="w-5 h-5" />}
                </button>
              )}

              {/* Visit advertiser */}
              <button
                onClick={handleClick}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
              >
                <FiExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Visiter</span>
              </button>

              {/* Skip button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleSkip() }}
                disabled={!canSkip}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  canSkip
                    ? 'bg-white text-black hover:bg-gray-200'
                    : 'bg-white/20 text-white/60 cursor-not-allowed'
                }`}
              >
                {canSkip ? (
                  'Passer la pub ▸'
                ) : (
                  `Passer dans ${countdown}s`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
