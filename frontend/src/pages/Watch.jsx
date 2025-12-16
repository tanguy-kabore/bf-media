import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FiThumbsUp, FiThumbsDown, FiShare2, FiBookmark, FiFlag, FiMoreHorizontal } from 'react-icons/fi'
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

  useEffect(() => {
    if (id) {
      fetchVideo()
      fetchRelatedVideos()
      fetchComments()
      recordView()
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
    try {
      if (navigator.share) {
        await navigator.share({
          title: video.title,
          text: `Regardez "${video.title}" sur BF Media`,
          url: url
        })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success('Lien copié dans le presse-papier')
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        await navigator.clipboard.writeText(url)
        toast.success('Lien copié dans le presse-papier')
      }
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

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <div className="aspect-video bg-black rounded-xl overflow-hidden">
          <video
            ref={videoRef}
            src={video.video_url}
            poster={video.thumbnail_url}
            controls
            autoPlay
            className="w-full h-full"
          />
        </div>

        <h1 className="text-xl font-semibold mt-4">{video.title}</h1>

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
                <p className="font-medium">{video.channel_name}</p>
                <p className="text-sm text-dark-400">{formatViews(video.subscriber_count)} abonnés</p>
              </div>
            </Link>
            {user?.id !== video.user_id && (
              <button
                onClick={handleSubscribe}
                className={`btn ${isSubscribed ? 'btn-secondary' : 'btn-primary'}`}
              >
                {isSubscribed ? 'Abonné' : "S'abonner"}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-dark-800 rounded-full">
              <button
                onClick={() => handleReaction('like')}
                className={`flex items-center gap-2 px-4 py-2 rounded-l-full hover:bg-dark-700 ${userReaction === 'like' ? 'text-primary-400' : ''}`}
              >
                <FiThumbsUp className={userReaction === 'like' ? 'fill-current' : ''} />
                <span>{formatViews(video.like_count)}</span>
              </button>
              <div className="w-px h-6 bg-dark-600" />
              <button
                onClick={() => handleReaction('dislike')}
                className={`px-4 py-2 rounded-r-full hover:bg-dark-700 ${userReaction === 'dislike' ? 'text-primary-400' : ''}`}
              >
                <FiThumbsDown className={userReaction === 'dislike' ? 'fill-current' : ''} />
              </button>
            </div>
            <button onClick={handleShare} className="btn btn-secondary">
              <FiShare2 /> Partager
            </button>
            <button onClick={handleSave} className="btn btn-secondary">
              <FiBookmark /> Enregistrer
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
                    <span className="font-medium text-sm">{comment.display_name}</span>
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

      <div className="w-full xl:w-96 space-y-3 flex-shrink-0">
        <h3 className="font-medium mb-4">Vidéos suggérées</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
          {relatedVideos.map((video) => (
            <VideoCard key={video.id} video={video} horizontal />
          ))}
        </div>
      </div>
    </div>
  )
}
