import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FiThumbsUp, FiThumbsDown, FiShare2, FiBookmark, FiFlag, FiMoreHorizontal, FiList, FiPlus, FiCheck, FiX, FiBell, FiUserPlus, FiCheckCircle } from 'react-icons/fi'
import AdBanner from '../components/AdBanner'
import PreRollAd from '../components/PreRollAd'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import api from '../services/api'
import useAuthStore from '../store/authStore'
import VideoCard from '../components/VideoCard'
import toast from 'react-hot-toast'

const formatViews = (views) => {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`
  return views?.toString() || '0'
}

export default function Watch() {
  const { id } = useParams()
  const { user, isAuthenticated } = useAuthStore()
  const videoRef = useRef(null)
  const [video, setVideo] = useState(null)
  const [relatedVideos, setRelatedVideos] = useState([])
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [userReaction, setUserReaction] = useState(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [showDescription, setShowDescription] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyContent, setReplyContent] = useState('')
  const [expandedReplies, setExpandedReplies] = useState({})
  const [replies, setReplies] = useState({})
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [userPlaylists, setUserPlaylists] = useState([])
  const [loadingPlaylists, setLoadingPlaylists] = useState(false)
  const [videoInPlaylists, setVideoInPlaylists] = useState([])
  const [showReportModal, setShowReportModal] = useState(false)
  const [showPreRollAd, setShowPreRollAd] = useState(true)
  const [adCompleted, setAdCompleted] = useState(false)
  const [showMidRollAd, setShowMidRollAd] = useState(false)
  const [midRollShown, setMidRollShown] = useState(false)
  const midRollTimeRef = useRef(null)
  
  // Watch session tracking
  const [watchSessionId, setWatchSessionId] = useState(null)
  const watchStartTimeRef = useRef(0)
  const lastProgressUpdateRef = useRef(0)
  const hasLikedRef = useRef(false)
  const hasCommentedRef = useRef(false)
  const hasSubscribedRef = useRef(false)

  useEffect(() => {
    if (id) {
      fetchVideo()
      fetchRelatedVideos()
      fetchComments()
      recordView()
      startWatchSession()
    }
    
    // Cleanup: end watch session when leaving
    return () => {
      if (watchSessionId) {
        endWatchSession()
      }
    }
  }, [id])

  const fetchVideo = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/videos/${id}`)
      setVideo(response.data)
      setUserReaction(response.data.userReaction)
      setIsSubscribed(response.data.isSubscribed)
    } catch (error) {
      toast.error('Erreur lors du chargement de la vidéo')
    } finally {
      setLoading(false)
    }
  }

  const fetchRelatedVideos = async () => {
    try {
      const response = await api.get(`/videos/${id}/related`)
      setRelatedVideos(response.data)
    } catch (error) {
      console.error('Error fetching related videos:', error)
    }
  }

  const fetchComments = async () => {
    try {
      const response = await api.get(`/comments/video/${id}`)
      setComments(response.data.comments)
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const recordView = async () => {
    try {
      await api.post(`/videos/${id}/view`, { watchDuration: 0 })
      // Add to watch history if authenticated
      if (isAuthenticated) {
        await api.post('/users/history/watch', { videoId: id, watchTime: 0, progressPercent: 0 })
      }
    } catch (error) {
      console.error('Error recording view:', error)
    }
  }

  // Start watch session when video loads
  const startWatchSession = async () => {
    try {
      const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const response = await api.post(`/videos/${id}/watch/start`, {
        sessionId,
        source: document.referrer?.includes('search') ? 'search' : 'browse',
        searchQuery: new URLSearchParams(window.location.search).get('q'),
        previousVideoId: sessionStorage.getItem('lastVideoId')
      })
      setWatchSessionId(response.data.watchSessionId || sessionId)
      watchStartTimeRef.current = Date.now()
      sessionStorage.setItem('lastVideoId', id)
    } catch (error) {
      console.error('Error starting watch session:', error)
    }
  }

  // Update watch progress periodically
  const updateWatchProgress = async () => {
    if (!watchSessionId || !videoRef.current) return
    
    const currentTime = videoRef.current.currentTime || 0
    const duration = videoRef.current.duration || 1
    const watchDuration = Math.floor(currentTime)
    const watchPercentage = Math.min(100, (currentTime / duration) * 100)
    
    // Only update if at least 5 seconds have passed since last update
    if (watchDuration - lastProgressUpdateRef.current < 5) return
    lastProgressUpdateRef.current = watchDuration
    
    try {
      await api.post(`/videos/${id}/watch/progress`, {
        sessionId: watchSessionId,
        watchDuration,
        watchPercentage
      })
      
      // Also update watch history
      if (isAuthenticated) {
        await api.post('/users/history/watch', { 
          videoId: id, 
          watchTime: watchDuration, 
          progressPercent: watchPercentage 
        })
      }
    } catch (error) {
      console.error('Error updating watch progress:', error)
    }
  }

  // End watch session when leaving
  const endWatchSession = async () => {
    if (!watchSessionId) return
    
    const currentTime = videoRef.current?.currentTime || 0
    const duration = videoRef.current?.duration || 1
    const watchDuration = Math.floor(currentTime)
    const watchPercentage = Math.min(100, (currentTime / duration) * 100)
    
    // Only send if user actually watched something
    if (watchDuration < 1) return
    
    try {
      const data = {
        sessionId: watchSessionId,
        watchDuration,
        watchPercentage,
        liked: hasLikedRef.current,
        commented: hasCommentedRef.current,
        subscribedAfter: hasSubscribedRef.current
      }
      
      // Use sendBeacon for reliability when page is closing
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
        navigator.sendBeacon(`/api/videos/${id}/watch/end`, blob)
      } else {
        await api.post(`/videos/${id}/watch/end`, data)
      }
    } catch (error) {
      console.error('Error ending watch session:', error)
    }
  }

  // Set up video time tracking
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      updateWatchProgress()
    }

    const handlePlay = () => {
      watchStartTimeRef.current = Date.now()
    }

    const handlePause = () => {
      updateWatchProgress()
    }

    const handleEnded = () => {
      updateWatchProgress()
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
    }
  }, [watchSessionId, id])

  // Handle page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateWatchProgress()
      }
    }

    const handleBeforeUnload = () => {
      endWatchSession()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [watchSessionId, id])

  const handleReaction = async (reaction) => {
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour réagir')
      return
    }
    try {
      const newReaction = userReaction === reaction ? 'none' : reaction
      const response = await api.post(`/videos/${id}/react`, { reaction: newReaction })
      setVideo(prev => ({ ...prev, like_count: response.data.likeCount, dislike_count: response.data.dislikeCount }))
      setUserReaction(newReaction === 'none' ? null : newReaction)
      // Track engagement for watch session
      if (newReaction === 'like') hasLikedRef.current = true
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour vous abonner')
      return
    }
    try {
      if (isSubscribed) {
        await api.delete(`/subscriptions/${video.channel_id}`)
        setIsSubscribed(false)
        toast.success('Désabonné')
      } else {
        await api.post(`/subscriptions/${video.channel_id}`)
        setIsSubscribed(true)
        toast.success('Abonné !')
        // Track engagement for watch session
        hasSubscribedRef.current = true
      }
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    try {
      const response = await api.post(`/comments/video/${id}`, { content: newComment })
      setComments(prev => [response.data, ...prev])
      setNewComment('')
      toast.success('Commentaire ajouté')
      // Track engagement for watch session
      hasCommentedRef.current = true
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const handleSave = async () => {
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour sauvegarder')
      return
    }
    try {
      await api.post(`/users/saved/${id}`)
      toast.success('Vidéo sauvegardée')
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    
    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: video?.title || 'Vidéo',
          text: `Regardez cette vidéo`,
          url: url
        })
        return
      } catch (error) {
        // User cancelled or error - fall through to clipboard
        if (error.name === 'AbortError') return
      }
    }
    
    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Lien copié !')
    } catch (error) {
      // Final fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = url
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      toast.success('Lien copié !')
    }
  }

  const handleCommentReaction = async (commentId, isLike) => {
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour réagir')
      return
    }
    try {
      const comment = comments.find(c => c.id === commentId)
      const wasLiked = comment?.userReaction === 'like'
      const wasDisliked = comment?.userReaction === 'dislike'
      
      let reaction = isLike ? 'like' : 'dislike'
      if ((isLike && wasLiked) || (!isLike && wasDisliked)) {
        reaction = 'none'
      }
      
      await api.post(`/comments/${commentId}/react`, { reaction })
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          const newReaction = reaction === 'none' ? null : reaction
          return {
            ...c,
            like_count: (c.like_count || 0) + (isLike ? (wasLiked ? -1 : 1) : (wasLiked ? -1 : 0)),
            dislike_count: (c.dislike_count || 0) + (!isLike ? (wasDisliked ? -1 : 1) : (wasDisliked ? -1 : 0)),
            userReaction: newReaction
          }
        }
        return c
      }))
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const handleReply = async (commentId) => {
    if (!replyContent.trim()) return
    try {
      const response = await api.post(`/comments/video/${id}`, { 
        content: replyContent, 
        parentId: commentId 
      })
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return { ...c, reply_count: (c.reply_count || 0) + 1 }
        }
        return c
      }))
      // Add reply to local state if replies are expanded
      if (expandedReplies[commentId]) {
        setReplies(prev => ({
          ...prev,
          [commentId]: [...(prev[commentId] || []), response.data]
        }))
      }
      setReplyingTo(null)
      setReplyContent('')
      toast.success('Réponse ajoutée')
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const fetchReplies = async (commentId) => {
    try {
      const response = await api.get(`/comments/${commentId}/replies`)
      setReplies(prev => ({ ...prev, [commentId]: response.data }))
      setExpandedReplies(prev => ({ ...prev, [commentId]: true }))
    } catch (error) {
      toast.error('Erreur lors du chargement des réponses')
    }
  }

  const toggleReplies = (commentId) => {
    if (expandedReplies[commentId]) {
      setExpandedReplies(prev => ({ ...prev, [commentId]: false }))
    } else {
      fetchReplies(commentId)
    }
  }

  const handleOpenPlaylistModal = async () => {
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour ajouter à une playlist')
      return
    }
    setShowPlaylistModal(true)
    setLoadingPlaylists(true)
    try {
      const response = await api.get('/playlists')
      setUserPlaylists(response.data || [])
      // Check which playlists already contain this video
      const inPlaylists = []
      for (const playlist of response.data || []) {
        try {
          const playlistData = await api.get(`/playlists/${playlist.id}`)
          if (playlistData.data.videos?.some(v => v.id === id)) {
            inPlaylists.push(playlist.id)
          }
        } catch (e) {}
      }
      setVideoInPlaylists(inPlaylists)
    } catch (error) {
      toast.error('Erreur lors du chargement des playlists')
    } finally {
      setLoadingPlaylists(false)
    }
  }

  const handleTogglePlaylist = async (playlistId) => {
    const isInPlaylist = videoInPlaylists.includes(playlistId)
    try {
      if (isInPlaylist) {
        await api.delete(`/playlists/${playlistId}/videos/${id}`)
        setVideoInPlaylists(prev => prev.filter(p => p !== playlistId))
        toast.success('Vidéo retirée de la playlist')
      } else {
        await api.post(`/playlists/${playlistId}/videos`, { videoId: id })
        setVideoInPlaylists(prev => [...prev, playlistId])
        toast.success('Vidéo ajoutée à la playlist')
      }
    } catch (error) {
      toast.error('Erreur')
    }
  }

  if (loading) {
    return (
      <div className="flex gap-6">
        <div className="flex-1">
          <div className="aspect-video bg-dark-800 rounded-xl animate-pulse" />
          <div className="mt-4 space-y-3">
            <div className="h-6 bg-dark-800 rounded w-3/4" />
            <div className="h-4 bg-dark-800 rounded w-1/2" />
          </div>
        </div>
        <div className="w-96 hidden xl:block space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-2">
              <div className="w-40 aspect-video bg-dark-800 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-dark-800 rounded" />
                <div className="h-3 bg-dark-800 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!video) {
    return <div className="text-center py-20 text-dark-400">Vidéo non trouvée</div>
  }

  const handleAdComplete = () => {
    setShowPreRollAd(false)
    setAdCompleted(true)
    // Start playing the actual video
    if (videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }

  const handleMidRollComplete = () => {
    setShowMidRollAd(false)
    // Resume video playback
    if (videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }

  // Check for mid-roll ad trigger (at 50% of video)
  const handleVideoTimeUpdate = () => {
    if (!videoRef.current || midRollShown || showMidRollAd) return
    
    const currentTime = videoRef.current.currentTime
    const duration = videoRef.current.duration
    
    // Show mid-roll at 50% of video (only for videos > 2 minutes)
    if (duration > 120 && currentTime >= duration * 0.5 && !midRollShown) {
      setMidRollShown(true)
      setShowMidRollAd(true)
      videoRef.current.pause()
    }
  }

  return (
    <>
      {/* Video player */}
      <div className="-mx-3 sm:mx-0 bg-black sm:bg-transparent">
        <div className="w-full sm:rounded-xl overflow-hidden relative">
          {/* Pre-roll Ad */}
          {showPreRollAd && !adCompleted && (
            <PreRollAd 
              onComplete={handleAdComplete}
              onSkip={handleAdComplete}
              category={video.category_name}
            />
          )}
          
          {/* Mid-roll Ad */}
          {showMidRollAd && (
            <PreRollAd 
              onComplete={handleMidRollComplete}
              onSkip={handleMidRollComplete}
              category={video.category_name}
              position="mid_roll"
            />
          )}
          
          <video
            ref={videoRef}
            src={video.video_url}
            poster={video.thumbnail_url}
            controls
            autoPlay={adCompleted}
            onTimeUpdate={handleVideoTimeUpdate}
            className="w-full aspect-video object-contain max-h-[70vh]"
          />
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold sm:mt-4">{video.title}</h1>

        <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
          <div className="flex items-center gap-4">
            <Link to={`/channel/${video.channel_handle}`} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-dark-700 overflow-hidden">
                {video.channel_avatar ? (
                  <img src={video.channel_avatar} alt={video.channel_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-medium">
                    {video.channel_name?.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium flex items-center gap-1">
                  {video.channel_name}
                  {!!video.channel_verified && <FiCheckCircle className="w-4 h-4 text-primary-500" title="Chaîne vérifiée" />}
                </p>
                <p className="text-sm text-dark-400">{formatViews(video.subscriber_count)} abonnés</p>
              </div>
            </Link>
            {user?.id !== video.user_id && (
              <button
                onClick={handleSubscribe}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all ${
                  isSubscribed 
                    ? 'bg-dark-800 text-white hover:bg-dark-700' 
                    : 'bg-primary-500 text-white hover:bg-primary-600'
                }`}
              >
                {isSubscribed ? (
                  <>
                    <FiBell className="w-4 h-4" />
                    <span>Abonné</span>
                  </>
                ) : (
                  <>
                    <FiUserPlus className="w-4 h-4" />
                    <span>S'abonner</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
            <div className="flex items-center bg-dark-800 rounded-full flex-shrink-0">
              <button
                onClick={() => handleReaction('like')}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-l-full hover:bg-dark-700 ${userReaction === 'like' ? 'text-primary-400' : ''}`}
              >
                <FiThumbsUp className={`w-4 h-4 ${userReaction === 'like' ? 'fill-current' : ''}`} />
                <span className="text-sm">{formatViews(video.like_count)}</span>
              </button>
              <div className="w-px h-6 bg-dark-600" />
              <button
                onClick={() => handleReaction('dislike')}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-r-full hover:bg-dark-700 ${userReaction === 'dislike' ? 'text-primary-400' : ''}`}
              >
                <FiThumbsDown className={`w-4 h-4 ${userReaction === 'dislike' ? 'fill-current' : ''}`} />
                {video.dislike_count > 0 && <span className="text-sm">{formatViews(video.dislike_count)}</span>}
              </button>
            </div>
            <button onClick={handleShare} className="btn btn-secondary flex-shrink-0 text-sm">
              <FiShare2 className="w-4 h-4" />
              <span className="hidden sm:inline">Partager</span>
            </button>
            <button onClick={handleSave} className="btn btn-secondary flex-shrink-0 text-sm">
              <FiBookmark className="w-4 h-4" />
              <span className="hidden sm:inline">Enregistrer</span>
            </button>
            <button onClick={handleOpenPlaylistModal} className="btn btn-secondary flex-shrink-0 text-sm">
              <FiList className="w-4 h-4" />
              <span className="hidden sm:inline">Playlist</span>
            </button>
            <button onClick={() => isAuthenticated ? setShowReportModal(true) : toast.error('Connectez-vous pour signaler')} className="btn btn-secondary flex-shrink-0 text-sm text-red-400 hover:text-red-300">
              <FiFlag className="w-4 h-4" />
              <span className="hidden sm:inline">Signaler</span>
            </button>
          </div>
        </div>

        <div className="bg-dark-900 rounded-xl p-4 mt-4">
          <div className="flex items-center gap-2 text-sm text-dark-300 mb-2">
            <span>{formatViews(video.view_count)} vues</span>
            <span>•</span>
            <span>{video.published_at && formatDistanceToNow(new Date(video.published_at), { addSuffix: true, locale: fr })}</span>
          </div>
          <p className={`whitespace-pre-wrap ${showDescription ? '' : 'line-clamp-3'}`}>
            {video.description || 'Aucune description'}
          </p>
          {video.description?.length > 200 && (
            <button onClick={() => setShowDescription(!showDescription)} className="text-dark-400 hover:text-white mt-2">
              {showDescription ? 'Afficher moins' : 'Afficher plus'}
            </button>
          )}
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-4">{video.comment_count || 0} commentaires</h2>
          
          {isAuthenticated && (
            <form onSubmit={handleComment} className="flex gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-dark-700 overflow-hidden flex-shrink-0">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">{user?.displayName?.charAt(0)}</div>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ajouter un commentaire..."
                  className="input"
                />
                {newComment && (
                  <div className="flex justify-end gap-2 mt-2">
                    <button type="button" onClick={() => setNewComment('')} className="btn btn-ghost">Annuler</button>
                    <button type="submit" className="btn btn-primary">Commenter</button>
                  </div>
                )}
              </div>
            </form>
          )}

          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Link to={`/channel/${comment.username}`} className="w-10 h-10 rounded-full bg-dark-700 overflow-hidden flex-shrink-0">
                  {comment.avatar_url ? (
                    <img src={comment.avatar_url} alt={comment.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">{comment.display_name?.charAt(0)}</div>
                  )}
                </Link>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm flex items-center gap-1">
                      {comment.display_name}
                      {!!comment.user_verified && <FiCheckCircle className="w-3.5 h-3.5 text-primary-500" />}
                    </span>
                    <span className="text-xs text-dark-400">
                      {comment.created_at ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr }) : 'à l\'instant'}
                    </span>
                  </div>
                  <p className="mt-1 text-dark-200">{comment.content}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <button 
                      onClick={() => handleCommentReaction(comment.id, true)}
                      className={`flex items-center gap-1 text-sm hover:text-white ${comment.userReaction === 'like' ? 'text-primary-400' : 'text-dark-400'}`}
                    >
                      <FiThumbsUp className="w-4 h-4" /> {comment.like_count || ''}
                    </button>
                    <button 
                      onClick={() => handleCommentReaction(comment.id, false)}
                      className={`flex items-center gap-1 text-sm hover:text-white ${comment.userReaction === 'dislike' ? 'text-primary-400' : 'text-dark-400'}`}
                    >
                      <FiThumbsDown className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      className="text-sm text-dark-400 hover:text-white"
                    >
                      Répondre
                    </button>
                  </div>
                  {replyingTo === comment.id && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Ajouter une réponse..."
                        className="input flex-1"
                        autoFocus
                      />
                      <button onClick={() => setReplyingTo(null)} className="btn btn-ghost">Annuler</button>
                      <button onClick={() => handleReply(comment.id)} className="btn btn-primary">Répondre</button>
                    </div>
                  )}
                  {comment.reply_count > 0 && (
                    <button 
                      onClick={() => toggleReplies(comment.id)}
                      className="text-sm text-primary-400 hover:text-primary-300 mt-2 flex items-center gap-1"
                    >
                      {expandedReplies[comment.id] ? '▼' : '▶'} {comment.reply_count} réponse{comment.reply_count > 1 ? 's' : ''}
                    </button>
                  )}
                  {expandedReplies[comment.id] && replies[comment.id] && (
                    <div className="mt-3 ml-6 space-y-3 border-l-2 border-dark-700 pl-4">
                      {replies[comment.id].map((reply) => (
                        <div key={reply.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-dark-700 overflow-hidden flex-shrink-0">
                            {reply.avatar_url ? (
                              <img src={reply.avatar_url} alt={reply.display_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm">{reply.display_name?.charAt(0)}</div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{reply.display_name}</span>
                              <span className="text-xs text-dark-400">
                                {reply.created_at ? formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: fr }) : 'à l\'instant'}
                              </span>
                            </div>
                            <p className="mt-1 text-dark-200 text-sm">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full xl:w-96 space-y-3 flex-shrink-0 mt-6 xl:pt-4">
        <h3 className="font-medium mb-4">Vidéos suggérées</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
          {relatedVideos.slice(0, 3).map((video) => (
            <VideoCard key={video.id} video={video} horizontal />
          ))}
          <AdBanner position="in_feed" />
          {relatedVideos.slice(3).map((video) => (
            <VideoCard key={video.id} video={video} horizontal />
          ))}
        </div>
      </div>
    </div>

      {/* Playlist Modal */}
      {showPlaylistModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-900 rounded-xl w-full max-w-sm border border-dark-700">
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <h3 className="font-semibold">Ajouter à une playlist</h3>
              <button
                onClick={() => setShowPlaylistModal(false)}
                className="p-1 hover:bg-dark-700 rounded"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              {loadingPlaylists ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-12 bg-dark-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : userPlaylists.length === 0 ? (
                <div className="text-center py-6">
                  <FiList className="w-10 h-10 mx-auto text-dark-600 mb-2" />
                  <p className="text-dark-400 text-sm">Aucune playlist</p>
                  <p className="text-dark-500 text-xs mt-1">Créez une playlist depuis votre chaîne</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {userPlaylists.map(playlist => {
                    const isInPlaylist = videoInPlaylists.includes(playlist.id)
                    return (
                      <button
                        key={playlist.id}
                        onClick={() => handleTogglePlaylist(playlist.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-dark-800 transition-colors text-left"
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isInPlaylist ? 'bg-primary-500 border-primary-500' : 'border-dark-500'}`}>
                          {isInPlaylist && <FiCheck className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{playlist.title}</p>
                          <p className="text-xs text-dark-400">{playlist.video_count || 0} vidéos</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal 
          videoId={id} 
          onClose={() => setShowReportModal(false)} 
        />
      )}
    </>
  )
}

// Report Modal Component
const ReportModal = ({ videoId, onClose }) => {
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const reasons = [
    { value: 'spam', label: 'Spam ou contenu trompeur' },
    { value: 'harassment', label: 'Harcèlement ou intimidation' },
    { value: 'hate_speech', label: 'Discours haineux' },
    { value: 'violence', label: 'Violence ou contenu choquant' },
    { value: 'nudity', label: 'Nudité ou contenu sexuel' },
    { value: 'copyright', label: 'Violation des droits d\'auteur' },
    { value: 'misinformation', label: 'Désinformation' },
    { value: 'other', label: 'Autre' }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!reason) {
      toast.error('Veuillez sélectionner une raison')
      return
    }
    setLoading(true)
    try {
      await api.post(`/videos/${videoId}/report`, { reason, description })
      toast.success('Signalement envoyé avec succès')
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors du signalement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-dark-900 rounded-xl w-full max-w-md border border-dark-700 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-dark-700 flex-shrink-0">
          <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
            <FiFlag className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
            Signaler cette vidéo
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-dark-700 rounded">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium mb-2">Raison du signalement *</label>
            <div className="space-y-2">
              {reasons.map(r => (
                <label key={r.value} className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-800 cursor-pointer">
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-4 h-4 text-primary-500"
                  />
                  <span className="text-sm">{r.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le problème..."
              rows={3}
              className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg resize-none"
            />
          </div>
          <div className="flex gap-3 flex-shrink-0 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors text-sm sm:text-base">
              Annuler
            </button>
            <button type="submit" disabled={loading || !reason} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base">
              {loading ? 'Envoi...' : 'Signaler'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
