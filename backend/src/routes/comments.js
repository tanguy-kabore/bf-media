const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Get comments for a video
router.get('/video/:videoId', optionalAuth, asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 20, sort = 'recent' } = req.query;
  const offset = (page - 1) * limit;

  let orderBy = 'c.created_at DESC';
  if (sort === 'top') orderBy = 'c.like_count DESC';
  if (sort === 'oldest') orderBy = 'c.created_at ASC';

  const comments = await query(`
    SELECT c.id, c.content, c.like_count, c.dislike_count, c.reply_count,
           c.is_pinned, c.is_hearted, c.is_edited, c.created_at,
           u.id as user_id, u.username, u.display_name, u.avatar_url
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.video_id = ? AND c.parent_id IS NULL AND c.is_deleted = FALSE
    ORDER BY c.is_pinned DESC, ${orderBy}
    LIMIT ? OFFSET ?
  `, [videoId, parseInt(limit), parseInt(offset)]);

  // Get user reactions if logged in
  if (req.user && comments.length > 0) {
    const commentIds = comments.map(c => c.id);
    const placeholders = commentIds.map(() => '?').join(',');
    const reactions = await query(`
      SELECT comment_id, is_like FROM comment_likes
      WHERE user_id = ? AND comment_id IN (${placeholders})
    `, [req.user.id, ...commentIds]);
    
    const reactionMap = {};
    reactions.forEach(r => reactionMap[r.comment_id] = r.is_like ? 'like' : 'dislike');
    comments.forEach(c => c.userReaction = reactionMap[c.id] || null);
  }

  const [{ total }] = await query(`
    SELECT COUNT(*) as total FROM comments
    WHERE video_id = ? AND parent_id IS NULL AND is_deleted = FALSE
  `, [videoId]);

  res.json({
    comments,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
  });
}));

// Get replies for a comment
router.get('/:commentId/replies', optionalAuth, asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  const replies = await query(`
    SELECT c.id, c.content, c.like_count, c.dislike_count, c.is_hearted,
           c.is_edited, c.created_at,
           u.id as user_id, u.username, u.display_name, u.avatar_url
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.parent_id = ? AND c.is_deleted = FALSE
    ORDER BY c.created_at ASC
    LIMIT ? OFFSET ?
  `, [commentId, parseInt(limit), parseInt(offset)]);

  res.json(replies);
}));

// Add comment
router.post('/video/:videoId', authenticate, asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content, parentId } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Contenu requis' });
  }

  // Check if video exists and comments are enabled
  const [video] = await query('SELECT id, channel_id, is_comments_enabled FROM videos WHERE id = ?', [videoId]);
  if (!video) {
    return res.status(404).json({ error: 'Vidéo non trouvée' });
  }

  if (!video.is_comments_enabled) {
    return res.status(403).json({ error: 'Commentaires désactivés' });
  }

  // If replying, verify parent exists
  if (parentId) {
    const [parent] = await query('SELECT id FROM comments WHERE id = ? AND video_id = ?', [parentId, videoId]);
    if (!parent) {
      return res.status(404).json({ error: 'Commentaire parent non trouvé' });
    }
  }

  const commentId = uuidv4();
  await query(`
    INSERT INTO comments (id, video_id, user_id, parent_id, content)
    VALUES (?, ?, ?, ?, ?)
  `, [commentId, videoId, req.user.id, parentId || null, content.trim()]);

  // Update counts
  await query('UPDATE videos SET comment_count = comment_count + 1 WHERE id = ?', [videoId]);
  if (parentId) {
    await query('UPDATE comments SET reply_count = reply_count + 1 WHERE id = ?', [parentId]);
  }

  // Send notification to video owner
  const [channel] = await query('SELECT user_id FROM channels WHERE id = ?', [video.channel_id]);
  if (channel.user_id !== req.user.id) {
    const notifId = uuidv4();
    await query(`
      INSERT INTO notifications (id, user_id, type, title, message, link)
      VALUES (?, ?, 'comment', 'Nouveau commentaire', ?, ?)
    `, [notifId, channel.user_id, `${req.user.display_name} a commenté votre vidéo`, `/watch/${videoId}`]);

    const io = req.app.get('io');
    io.to(`user:${channel.user_id}`).emit('notification', { type: 'comment' });
  }

  res.status(201).json({
    id: commentId,
    content: content.trim(),
    like_count: 0,
    dislike_count: 0,
    reply_count: 0,
    created_at: new Date().toISOString(),
    user_id: req.user.id,
    username: req.user.username,
    display_name: req.user.display_name,
    avatar_url: req.user.avatar_url
  });
}));

// Update comment
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  const [comment] = await query('SELECT user_id FROM comments WHERE id = ?', [id]);
  if (!comment) {
    return res.status(404).json({ error: 'Commentaire non trouvé' });
  }

  if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  await query('UPDATE comments SET content = ?, is_edited = TRUE WHERE id = ?', [content.trim(), id]);
  res.json({ message: 'Commentaire modifié' });
}));

// Delete comment
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [comment] = await query('SELECT user_id, video_id, parent_id FROM comments WHERE id = ?', [id]);
  if (!comment) {
    return res.status(404).json({ error: 'Commentaire non trouvé' });
  }

  if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  await query('UPDATE comments SET is_deleted = TRUE WHERE id = ?', [id]);
  await query('UPDATE videos SET comment_count = comment_count - 1 WHERE id = ?', [comment.video_id]);
  if (comment.parent_id) {
    await query('UPDATE comments SET reply_count = reply_count - 1 WHERE id = ?', [comment.parent_id]);
  }

  res.json({ message: 'Commentaire supprimé' });
}));

// Like/Dislike comment
router.post('/:id/react', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reaction } = req.body;

  const [comment] = await query('SELECT id FROM comments WHERE id = ?', [id]);
  if (!comment) {
    return res.status(404).json({ error: 'Commentaire non trouvé' });
  }

  const existing = await query('SELECT is_like FROM comment_likes WHERE user_id = ? AND comment_id = ?', [req.user.id, id]);

  if (reaction === 'none') {
    if (existing.length > 0) {
      const wasLike = existing[0].is_like;
      await query('DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?', [req.user.id, id]);
      if (wasLike) {
        await query('UPDATE comments SET like_count = like_count - 1 WHERE id = ?', [id]);
      } else {
        await query('UPDATE comments SET dislike_count = dislike_count - 1 WHERE id = ?', [id]);
      }
    }
  } else {
    const isLike = reaction === 'like';
    if (existing.length > 0) {
      if (existing[0].is_like !== isLike) {
        await query('UPDATE comment_likes SET is_like = ? WHERE user_id = ? AND comment_id = ?', [isLike, req.user.id, id]);
        if (isLike) {
          await query('UPDATE comments SET like_count = like_count + 1, dislike_count = dislike_count - 1 WHERE id = ?', [id]);
        } else {
          await query('UPDATE comments SET like_count = like_count - 1, dislike_count = dislike_count + 1 WHERE id = ?', [id]);
        }
      }
    } else {
      await query('INSERT INTO comment_likes (user_id, comment_id, is_like) VALUES (?, ?, ?)', [req.user.id, id, isLike]);
      if (isLike) {
        await query('UPDATE comments SET like_count = like_count + 1 WHERE id = ?', [id]);
      } else {
        await query('UPDATE comments SET dislike_count = dislike_count + 1 WHERE id = ?', [id]);
      }
    }
  }

  const [updated] = await query('SELECT like_count, dislike_count FROM comments WHERE id = ?', [id]);
  res.json({ likeCount: updated.like_count, dislikeCount: updated.dislike_count });
}));

// Pin comment (channel owner only)
router.post('/:id/pin', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [comment] = await query(`
    SELECT c.id, c.video_id, v.channel_id, ch.user_id
    FROM comments c
    JOIN videos v ON c.video_id = v.id
    JOIN channels ch ON v.channel_id = ch.id
    WHERE c.id = ?
  `, [id]);

  if (!comment || comment.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  await query('UPDATE comments SET is_pinned = FALSE WHERE video_id = ?', [comment.video_id]);
  await query('UPDATE comments SET is_pinned = TRUE WHERE id = ?', [id]);

  res.json({ message: 'Commentaire épinglé' });
}));

// Heart comment (channel owner only)
router.post('/:id/heart', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [comment] = await query(`
    SELECT c.id, v.channel_id, ch.user_id
    FROM comments c
    JOIN videos v ON c.video_id = v.id
    JOIN channels ch ON v.channel_id = ch.id
    WHERE c.id = ?
  `, [id]);

  if (!comment || comment.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  await query('UPDATE comments SET is_hearted = NOT is_hearted WHERE id = ?', [id]);
  res.json({ message: 'Coeur mis à jour' });
}));

module.exports = router;
