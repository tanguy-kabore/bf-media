import { Link } from 'react-router-dom'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { FiClock, FiMoreVertical, FiCheck } from 'react-icons/fi'
import api from '../services/api'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

const VerifiedBadge = ({ size = 'sm' }) => {
  const sizes = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4' }
  const iconSizes = { sm: 'w-2 h-2', md: 'w-2.5 h-2.5' }
  return (
    <span className={`inline-flex items-center justify-center ${sizes[size]} bg-blue-500 rounded-full flex-shrink-0`} title="Compte vérifié">
      <FiCheck className={`${iconSizes[size]} text-white`} />
    </span>
  )
}

const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

const formatViews = (views) => {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`
  return views.toString()
}

export default function VideoCard({ video, horizontal = false, compact = false }) {
  const { isAuthenticated } = useAuthStore()
  const [showMenu, setShowMenu] = useState(false)
  const timeAgo = video.published_at 
    ? formatDistanceToNow(new Date(video.published_at), { addSuffix: true, locale: fr })
    : ''

  const handleSaveVideo = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour sauvegarder')
      return
    }
    try {
      await api.post(`/users/saved/${video.id}`)
      toast.success('Ajouté à "À regarder plus tard"')
      setShowMenu(false)
    } catch (error) {
      toast.error('Erreur')
    }
  }

  if (horizontal) {
    return (
      <div className="flex gap-4 group relative">
        <Link to={`/watch/${video.id}`} className="relative w-40 flex-shrink-0 aspect-video rounded-xl overflow-hidden bg-dark-800">
          <img
            src={video.thumbnail_url || '/placeholder.jpg'}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {video.duration > 0 && (
            <span className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 text-white text-xs font-medium rounded">
              {formatDuration(video.duration)}
            </span>
          )}
          <button
            onClick={handleSaveVideo}
            className="absolute top-1 right-1 p-1.5 bg-black/70 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
            title="À regarder plus tard"
          >
            <FiClock className="w-4 h-4" />
          </button>
        </Link>
        <Link to={`/watch/${video.id}`} className="flex-1 min-w-0">
          <h3 className="font-medium line-clamp-2 group-hover:text-primary-400 transition-colors">
            {video.title}
          </h3>
          <p className="text-sm text-dark-400 mt-1 flex items-center gap-1">
            <span>{video.channel_name}</span>
            {!!video.channel_verified && <VerifiedBadge size="sm" />}
          </p>
          <p className="text-sm text-dark-400">
            {formatViews(video.view_count)} vues • {timeAgo}
          </p>
        </Link>
      </div>
    )
  }

  // Compact horizontal layout for mobile
  if (compact) {
    return (
      <div className="flex gap-3 group">
        <Link to={`/watch/${video.id}`} className="relative w-36 xs:w-40 flex-shrink-0 aspect-video rounded-lg overflow-hidden bg-dark-800">
          <img
            src={video.thumbnail_url || '/placeholder.jpg'}
            alt={video.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {video.duration > 0 && (
            <span className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 text-white text-xs font-medium rounded">
              {formatDuration(video.duration)}
            </span>
          )}
        </Link>
        <div className="flex-1 min-w-0 py-0.5">
          <Link to={`/watch/${video.id}`}>
            <h3 className="font-medium text-sm line-clamp-2 leading-snug group-hover:text-primary-400">
              {video.title}
            </h3>
          </Link>
          <Link 
            to={`/channel/${video.channel_handle}`}
            className="text-xs text-dark-400 hover:text-white mt-1 flex items-center gap-1 truncate"
          >
            <span className="truncate">{video.channel_name}</span>
            {!!video.channel_verified && <VerifiedBadge size="sm" />}
          </Link>
          <p className="text-xs text-dark-400 mt-0.5">
            {formatViews(video.view_count)} vues • {timeAgo}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="video-card group">
      <Link to={`/watch/${video.id}`} className="thumbnail relative block aspect-video rounded-xl overflow-hidden bg-dark-800">
        <img
          src={video.thumbnail_url || '/placeholder.jpg'}
          alt={video.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {video.duration > 0 && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-xs font-medium rounded">
            {formatDuration(video.duration)}
          </span>
        )}
        <button
          onClick={handleSaveVideo}
          className="absolute top-2 right-2 p-1.5 bg-black/70 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
          title="À regarder plus tard"
        >
          <FiClock className="w-4 h-4" />
        </button>
      </Link>
      <div className="flex gap-3 mt-3">
        <Link to={`/channel/${video.channel_handle}`} className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-dark-700 overflow-hidden">
            {video.channel_avatar ? (
              <img src={video.channel_avatar} alt={video.channel_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-medium">
                {video.channel_name?.charAt(0)}
              </div>
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0 overflow-hidden">
          <Link to={`/watch/${video.id}`}>
            <h3 className="font-medium text-sm leading-snug line-clamp-2 group-hover:text-primary-400 transition-colors">
              {video.title}
            </h3>
          </Link>
          <Link 
            to={`/channel/${video.channel_handle}`}
            className="text-sm text-dark-400 hover:text-white mt-1 flex items-center gap-1"
          >
            <span className="truncate">{video.channel_name}</span>
            {!!video.channel_verified && <VerifiedBadge size="sm" />}
          </Link>
          <p className="text-sm text-dark-400 truncate">
            {formatViews(video.view_count)} vues • {timeAgo}
          </p>
        </div>
      </div>
    </div>
  )
}
