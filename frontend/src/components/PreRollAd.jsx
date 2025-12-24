import { useState, useEffect, useRef, useCallback } from 'react'
import { FiVolume2, FiVolumeX, FiExternalLink } from 'react-icons/fi'
import api from '../services/api'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin

const getDeviceType = () => {
  const ua = navigator.userAgent
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet'
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile'
  return 'desktop'
}

// Get user's country from timezone or stored value
const getUserCountry = () => {
  // Check if we have a cached country
  const cached = sessionStorage.getItem('user_country')
  if (cached) return cached
  
  // Try to detect from timezone
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const tzCountryMap = {
    'Africa/Ouagadougou': 'BF',
    'Africa/Abidjan': 'CI',
    'Africa/Bamako': 'ML',
    'Africa/Dakar': 'SN',
    'Africa/Niamey': 'NE',
    'Africa/Lome': 'TG',
    'Africa/Porto-Novo': 'BJ',
    'Africa/Accra': 'GH',
    'Europe/Paris': 'FR',
    'America/New_York': 'US',
    'America/Toronto': 'CA',
    'Europe/Brussels': 'BE'
  }
  
  return tzCountryMap[tz] || ''
}

export default function PreRollAd({ onComplete, onSkip, category = '', position = 'pre_roll' }) {
  const [ad, setAd] = useState(null)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(5)
  const [canSkip, setCanSkip] = useState(false)
  const [muted, setMuted] = useState(true)
  const [progress, setProgress] = useState(0)
  const videoRef = useRef(null)
  const impressionRecorded = useRef(false)
  const countdownRef = useRef(null)
  const imageTimerRef = useRef(null)
  const hasCompleted = useRef(false)

  const handleComplete = useCallback(() => {
    if (hasCompleted.current) return
    hasCompleted.current = true
    if (countdownRef.current) clearInterval(countdownRef.current)
    if (imageTimerRef.current) clearTimeout(imageTimerRef.current)
    onComplete?.()
  }, [onComplete])

  const handleSkip = useCallback((forceSkip = false) => {
    if ((canSkip || forceSkip) && !hasCompleted.current) {
      hasCompleted.current = true
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
      if (imageTimerRef.current) {
        clearTimeout(imageTimerRef.current)
        imageTimerRef.current = null
      }
      onSkip?.()
    }
  }, [canSkip, onSkip])

  useEffect(() => {
    fetchPreRollAd()
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
      if (imageTimerRef.current) clearTimeout(imageTimerRef.current)
    }
  }, [])

  const fetchPreRollAd = async () => {
    try {
      const params = new URLSearchParams({
        position: position,
        limit: '1',
        device: getDeviceType()
      })
      
      // Add country for targeting
      const country = getUserCountry()
      if (country) params.append('country', country)
      if (category) params.append('category', category)
      
      const res = await api.get(`/ads?${params}`)
      
      if (res.data?.length > 0) {
        setAd(res.data[0])
        // Record impression
        if (!impressionRecorded.current) {
          impressionRecorded.current = true
          api.post(`/ads/${res.data[0].id}/impression`).catch(() => {})
        }
      } else {
        // No ad available, proceed to video
        handleComplete()
      }
    } catch (error) {
      console.error('Error fetching pre-roll ad:', error)
      handleComplete()
    } finally {
      setLoading(false)
    }
  }

  // Countdown timer - starts when ad is loaded
  useEffect(() => {
    if (!ad || hasCompleted.current) return
    
    // Use skip_duration from ad data, default to 5 seconds
    const skipDuration = ad.skip_duration || 5
    
    // Check if this is an image ad
    const mediaUrl = ad.media_url || ''
    const isImageAd = !mediaUrl.match(/\.(mp4|webm)$/i)
    
    // Reset countdown when ad loads
    setCountdown(skipDuration)
    setCanSkip(false)

    let count = skipDuration
    countdownRef.current = setInterval(() => {
      count -= 1
      setCountdown(count)
      if (count <= 0) {
        setCanSkip(true)
        if (countdownRef.current) {
          clearInterval(countdownRef.current)
          countdownRef.current = null
        }
        // For image ads, auto-complete after countdown ends
        if (isImageAd && !hasCompleted.current) {
          // Give a short delay then auto-skip
          imageTimerRef.current = setTimeout(() => {
            if (!hasCompleted.current) {
              handleComplete()
            }
          }, 500)
        }
      }
    }, 1000)

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
    }
  }, [ad, handleComplete])

  // Track video progress
  const handleTimeUpdate = () => {
    if (videoRef.current && !hasCompleted.current) {
      const percent = (videoRef.current.currentTime / videoRef.current.duration) * 100
      setProgress(percent)
    }
  }

  const handleVideoEnded = () => {
    handleComplete()
  }

  const handleClick = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!ad || !ad.target_url) return

    let targetUrl = ad.target_url
    if (targetUrl && !targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl
    }

    // Track click
    api.post(`/ads/${ad.id}/click`).catch(() => {})

    // Open URL immediately
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
    <div className="absolute inset-0 bg-black flex flex-col" style={{ zIndex: 9999 }}>
      {/* Ad content */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {isVideo ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            className="w-full h-full object-contain cursor-pointer"
            muted={muted}
            autoPlay
            playsInline
            onClick={handleClick}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
          />
        ) : (
          <img
            src={mediaUrl}
            alt={ad.title}
            className="max-w-full max-h-full object-contain cursor-pointer"
            onClick={handleClick}
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
