const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const { body, validationResult, query: queryValidator } = require('express-validator');
const { query, transaction } = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { uploadVideo, uploadThumbnail } = require('../middleware/upload');
const { asyncHandler } = require('../middleware/errorHandler');
const videoProcessor = require('../services/videoProcessor');

// Get all categories (public)
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await query('SELECT id, name, slug, description, icon FROM categories ORDER BY name');
  res.json({ categories });
}));

// Get all videos (with filters)
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, category, sort = 'recent', channelId } = req.query;
  const offset = (page - 1) * limit;

  let orderBy = 'v.published_at DESC';
  if (sort === 'popular') orderBy = 'v.view_count DESC';
  if (sort === 'trending') orderBy = '(v.view_count / GREATEST(1, DATEDIFF(NOW(), v.published_at))) DESC';

  let whereClause = "v.status = 'published' AND v.visibility = 'public'";
  const params = [];

  if (category) {
    whereClause += ' AND c.slug = ?';
    params.push(category);
  }

  if (channelId) {
    whereClause += ' AND v.channel_id = ?';
    params.push(channelId);
  }

  const videos = await query(`
    SELECT v.id, v.title, v.description, v.thumbnail_url, v.duration, v.view_count,
           v.like_count, v.published_at, v.created_at,
           ch.id as channel_id, ch.name as channel_name, ch.handle as channel_handle,
           COALESCE(ch.avatar_url, u.avatar_url) as channel_avatar, ch.is_verified as channel_verified,
           cat.name as category_name, cat.slug as category_slug
    FROM videos v
    JOIN channels ch ON v.channel_id = ch.id
    JOIN users u ON ch.user_id = u.id
    LEFT JOIN categories cat ON v.category_id = cat.id
    LEFT JOIN categories c ON v.category_id = c.id
    WHERE ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `, [...params, parseInt(limit), parseInt(offset)]);

  const [{ total }] = await query(`
    SELECT COUNT(*) as total FROM videos v
    LEFT JOIN categories c ON v.category_id = c.id
    WHERE ${whereClause}
  `, params);

  res.json({
    videos,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Get single video
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const videos = await query(`
    SELECT v.*, 
           ch.id as channel_id, ch.name as channel_name, ch.handle as channel_handle,
           COALESCE(ch.avatar_url, u.avatar_url) as channel_avatar, ch.subscriber_count, ch.is_verified as channel_verified,
           ch.user_id as user_id,
           cat.name as category_name, cat.slug as category_slug
    FROM videos v
    JOIN channels ch ON v.channel_id = ch.id
    JOIN users u ON ch.user_id = u.id
    LEFT JOIN categories cat ON v.category_id = cat.id
    WHERE v.id = ?
  `, [id]);

  if (videos.length === 0) {
    return res.status(404).json({ error: 'Vidéo non trouvée' });
  }

  const video = videos[0];

  // Check visibility
  if (video.visibility === 'private') {
    if (!req.user) {
      return res.status(403).json({ error: 'Vidéo privée' });
    }
    const channels = await query('SELECT user_id FROM channels WHERE id = ?', [video.channel_id]);
    if (channels[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Vidéo privée' });
    }
  }

  // Get video qualities
  const qualities = await query('SELECT quality, video_url, width, height FROM video_qualities WHERE video_id = ?', [id]);

  // Get tags
  const tags = await query(`
    SELECT t.name, t.slug FROM tags t
    JOIN video_tags vt ON t.id = vt.tag_id
    WHERE vt.video_id = ?
  `, [id]);

  // Check if user liked/disliked
  let userReaction = null;
  if (req.user) {
    const reactions = await query('SELECT is_like FROM video_likes WHERE user_id = ? AND video_id = ?', [req.user.id, id]);
    if (reactions.length > 0) userReaction = reactions[0].is_like ? 'like' : 'dislike';
  }

  // Check if user is subscribed to channel
  let isSubscribed = false;
  if (req.user) {
    const subs = await query('SELECT 1 FROM subscriptions WHERE subscriber_id = ? AND channel_id = ?', [req.user.id, video.channel_id]);
    isSubscribed = subs.length > 0;
  }

  res.json({
    ...video,
    qualities,
    tags,
    userReaction,
    isSubscribed
  });
}));

// Upload video
router.post('/upload', authenticate, uploadVideo.single('video'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Fichier vidéo requis' });
  }

  const { title, description, categoryId, visibility = 'public', tags, channelId: requestedChannelId } = req.body;

  // Get user's channels and verify ownership
  let channelId;
  if (requestedChannelId) {
    // Verify user owns this channel
    const [channel] = await query('SELECT id FROM channels WHERE id = ? AND user_id = ?', [requestedChannelId, req.user.id]);
    if (!channel) {
      return res.status(403).json({ error: 'Vous ne pouvez pas uploader sur cette chaîne' });
    }
    channelId = requestedChannelId;
  } else {
    // Use first channel as default
    const channels = await query('SELECT id FROM channels WHERE user_id = ? ORDER BY created_at ASC LIMIT 1', [req.user.id]);
    if (channels.length === 0) {
      return res.status(400).json({ error: 'Chaîne non trouvée' });
    }
    channelId = channels[0].id;
  }
  const videoId = uuidv4();
  const videoPath = req.file.path;

  try {
    // Get video metadata with fallback
    let metadata = { duration: 0, fileSize: req.file.size, video: null, audio: null };
    try {
      metadata = await videoProcessor.getMetadata(videoPath);
    } catch (metaErr) {
      console.error('Could not get video metadata:', metaErr.message);
    }

    // Generate thumbnail with fallback to null (frontend will show placeholder)
    const thumbnailDir = path.join(__dirname, '../../uploads/thumbnails');
    let thumbnailUrl = null;
    try {
      const thumbnailPath = await videoProcessor.generateThumbnail(videoPath, thumbnailDir);
      thumbnailUrl = `/uploads/thumbnails/${path.basename(thumbnailPath)}`;
    } catch (thumbErr) {
      console.error('Could not generate thumbnail:', thumbErr.message);
      // Continue without thumbnail - video will still be uploaded
    }

    // Move video to permanent location
    const videoDir = path.join(__dirname, '../../uploads/videos');
    const finalVideoPath = path.join(videoDir, `${videoId}${path.extname(req.file.originalname)}`);
    await fs.rename(videoPath, finalVideoPath);
    const videoUrl = `/uploads/videos/${videoId}${path.extname(req.file.originalname)}`;

    // Generate content fingerprint with fallback
    let contentIdHash = null;
    try {
      contentIdHash = await videoProcessor.generateContentFingerprint(finalVideoPath);
    } catch (hashErr) {
      console.error('Could not generate content fingerprint:', hashErr.message);
    }

    // Insert video record
    await query(`
      INSERT INTO videos (id, channel_id, title, description, video_url, thumbnail_url, 
                         duration, file_size, resolution, fps, codec, status, visibility,
                         category_id, content_id_hash, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, NOW())
    `, [
      videoId, channelId, title || 'Sans titre', description || '',
      videoUrl, thumbnailUrl, metadata.duration, metadata.fileSize,
      metadata.video ? `${metadata.video.width}x${metadata.video.height}` : null,
      metadata.video?.fps, metadata.video?.codec, visibility,
      categoryId || null, contentIdHash
    ]);

    // Update channel video count
    await query('UPDATE channels SET video_count = video_count + 1 WHERE id = ?', [channelId]);

    // Handle tags
    if (tags) {
      const tagList = JSON.parse(tags);
      for (const tagName of tagList) {
        const slug = tagName.toLowerCase().replace(/\s+/g, '-');
        await query('INSERT IGNORE INTO tags (name, slug) VALUES (?, ?)', [tagName, slug]);
        const [tag] = await query('SELECT id FROM tags WHERE slug = ?', [slug]);
        await query('INSERT IGNORE INTO video_tags (video_id, tag_id) VALUES (?, ?)', [videoId, tag.id]);
        await query('UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?', [tag.id]);
      }
    }

    // Notify subscribers of new video (check preferences)
    if (visibility === 'public') {
      const [channelInfo] = await query('SELECT name FROM channels WHERE id = ?', [channelId]);
      const subscribers = await query(`
        SELECT s.subscriber_id, up.notify_new_videos
        FROM subscriptions s
        LEFT JOIN user_preferences up ON s.subscriber_id = up.user_id
        WHERE s.channel_id = ? AND s.notifications_enabled = TRUE
      `, [channelId]);

      const io = req.app.get('io');
      for (const sub of subscribers) {
        // Check if subscriber wants new video notifications (default true if no prefs)
        const wantsNotif = sub.notify_new_videos === null || sub.notify_new_videos !== 0;
        if (wantsNotif) {
          const notifId = uuidv4();
          await query(`
            INSERT INTO notifications (id, user_id, type, title, message, link, thumbnail_url)
            VALUES (?, ?, 'new_video', 'Nouvelle vidéo', ?, ?, ?)
          `, [notifId, sub.subscriber_id, `${channelInfo.name} a publié: ${title || 'Sans titre'}`, `/watch/${videoId}`, thumbnailUrl]);
          
          io.to(`user:${sub.subscriber_id}`).emit('notification', { type: 'new_video' });
        }
      }
    }

    res.status(201).json({
      message: 'Vidéo uploadée avec succès',
      video: {
        id: videoId,
        title: title || 'Sans titre',
        videoUrl,
        thumbnailUrl,
        duration: metadata.duration,
        status: 'published'
      }
    });
  } catch (error) {
    // Cleanup on error
    await fs.unlink(videoPath).catch(() => {});
    throw error;
  }
}));

// Update video
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, categoryId, visibility, tags, isCommentsEnabled } = req.body;

  // Verify ownership
  const videos = await query(`
    SELECT v.*, c.user_id FROM videos v
    JOIN channels c ON v.channel_id = c.id
    WHERE v.id = ?
  `, [id]);

  if (videos.length === 0) {
    return res.status(404).json({ error: 'Vidéo non trouvée' });
  }

  if (videos[0].user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  // Update video
  const updates = [];
  const params = [];

  if (title !== undefined) { updates.push('title = ?'); params.push(title); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (categoryId !== undefined) { updates.push('category_id = ?'); params.push(categoryId); }
  if (visibility !== undefined) { updates.push('visibility = ?'); params.push(visibility); }
  if (isCommentsEnabled !== undefined) { updates.push('is_comments_enabled = ?'); params.push(isCommentsEnabled); }

  if (updates.length > 0) {
    params.push(id);
    await query(`UPDATE videos SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  // Update tags if provided
  if (tags !== undefined) {
    await query('DELETE FROM video_tags WHERE video_id = ?', [id]);
    for (const tagName of tags) {
      const slug = tagName.toLowerCase().replace(/\s+/g, '-');
      await query('INSERT IGNORE INTO tags (name, slug) VALUES (?, ?)', [tagName, slug]);
      const [tag] = await query('SELECT id FROM tags WHERE slug = ?', [slug]);
      await query('INSERT INTO video_tags (video_id, tag_id) VALUES (?, ?)', [id, tag.id]);
    }
  }

  res.json({ message: 'Vidéo mise à jour' });
}));

// Upload custom thumbnail
router.post('/:id/thumbnail', authenticate, uploadThumbnail.single('thumbnail'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: 'Image requise' });
  }

  // Verify ownership
  const videos = await query(`
    SELECT v.*, c.user_id FROM videos v
    JOIN channels c ON v.channel_id = c.id
    WHERE v.id = ?
  `, [id]);

  if (videos.length === 0) {
    return res.status(404).json({ error: 'Vidéo non trouvée' });
  }

  if (videos[0].user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  // Move thumbnail to permanent location
  const thumbnailDir = path.join(__dirname, '../../uploads/thumbnails');
  const thumbnailFilename = `${id}-custom-${Date.now()}${path.extname(req.file.originalname)}`;
  const finalPath = path.join(thumbnailDir, thumbnailFilename);
  
  await fs.rename(req.file.path, finalPath);
  const thumbnailUrl = `/uploads/thumbnails/${thumbnailFilename}`;

  // Update video thumbnail
  await query('UPDATE videos SET thumbnail_url = ? WHERE id = ?', [thumbnailUrl, id]);

  res.json({ message: 'Miniature mise à jour', thumbnailUrl });
}));

// Delete video
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const videos = await query(`
    SELECT v.*, c.user_id, c.id as channel_id FROM videos v
    JOIN channels c ON v.channel_id = c.id
    WHERE v.id = ?
  `, [id]);

  if (videos.length === 0) {
    return res.status(404).json({ error: 'Vidéo non trouvée' });
  }

  if (videos[0].user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  await query('UPDATE videos SET status = ? WHERE id = ?', ['deleted', id]);
  await query('UPDATE channels SET video_count = video_count - 1 WHERE id = ?', [videos[0].channel_id]);

  res.json({ message: 'Vidéo supprimée' });
}));

// Like/Dislike video
router.post('/:id/react', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reaction } = req.body; // 'like', 'dislike', or 'none'

  const videos = await query('SELECT id FROM videos WHERE id = ?', [id]);
  if (videos.length === 0) {
    return res.status(404).json({ error: 'Vidéo non trouvée' });
  }

  // Get existing reaction
  const existing = await query('SELECT is_like FROM video_likes WHERE user_id = ? AND video_id = ?', [req.user.id, id]);

  if (reaction === 'none') {
    if (existing.length > 0) {
      const wasLike = existing[0].is_like;
      await query('DELETE FROM video_likes WHERE user_id = ? AND video_id = ?', [req.user.id, id]);
      if (wasLike) {
        await query('UPDATE videos SET like_count = like_count - 1 WHERE id = ?', [id]);
      } else {
        await query('UPDATE videos SET dislike_count = dislike_count - 1 WHERE id = ?', [id]);
      }
    }
  } else {
    const isLike = reaction === 'like';
    
    if (existing.length > 0) {
      if (existing[0].is_like !== isLike) {
        await query('UPDATE video_likes SET is_like = ? WHERE user_id = ? AND video_id = ?', [isLike, req.user.id, id]);
        if (isLike) {
          await query('UPDATE videos SET like_count = like_count + 1, dislike_count = dislike_count - 1 WHERE id = ?', [id]);
        } else {
          await query('UPDATE videos SET like_count = like_count - 1, dislike_count = dislike_count + 1 WHERE id = ?', [id]);
        }
      }
    } else {
      await query('INSERT INTO video_likes (user_id, video_id, is_like) VALUES (?, ?, ?)', [req.user.id, id, isLike]);
      if (isLike) {
        await query('UPDATE videos SET like_count = like_count + 1 WHERE id = ?', [id]);
      } else {
        await query('UPDATE videos SET dislike_count = dislike_count + 1 WHERE id = ?', [id]);
      }
    }
  }

  const [video] = await query('SELECT like_count, dislike_count FROM videos WHERE id = ?', [id]);
  res.json({ likeCount: video.like_count, dislikeCount: video.dislike_count });
}));

// Helper function to parse user agent
const parseUserAgent = (ua) => {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', deviceType: 'other' };
  
  // Detect browser
  let browser = 'Other';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
  
  // Detect OS
  let os = 'Other';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  
  // Detect device type
  let deviceType = 'desktop';
  if (ua.includes('Mobile') || ua.includes('Android')) deviceType = 'mobile';
  else if (ua.includes('iPad') || ua.includes('Tablet')) deviceType = 'tablet';
  else if (ua.includes('TV') || ua.includes('SmartTV')) deviceType = 'tv';
  
  return { browser, os, deviceType };
};

// Get country from IP (using free API)
const getCountryFromIP = async (ip) => {
  try {
    // Skip for localhost/private IPs
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return null;
    }
    // Clean IP (remove ::ffff: prefix)
    const cleanIP = ip.replace('::ffff:', '');
    const response = await fetch(`http://ip-api.com/json/${cleanIP}?fields=country`);
    if (response.ok) {
      const data = await response.json();
      return data.country || null;
    }
  } catch (err) {
    console.error('IP geolocation error:', err.message);
  }
  return null;
};

// Record view
router.post('/:id/view', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { watchDuration, quality } = req.body;
  const userAgent = req.headers['user-agent'] || '';
  const sessionId = req.headers['x-session-id'] || req.ip;
  
  // Parse user agent for browser, OS, and device type
  const { browser, os, deviceType } = parseUserAgent(userAgent);
  
  // Get country from IP (non-blocking)
  const country = await getCountryFromIP(req.ip);
  
  // Check if returning viewer (has viewed any video before)
  let isReturning = false;
  if (req.user?.id) {
    const [prev] = await query('SELECT 1 FROM video_views WHERE user_id = ? LIMIT 1', [req.user.id]);
    isReturning = !!prev;
  } else {
    const [prev] = await query('SELECT 1 FROM video_views WHERE session_id = ? OR ip_address = ? LIMIT 1', [sessionId, req.ip]);
    isReturning = !!prev;
  }

  await query('UPDATE videos SET view_count = view_count + 1 WHERE id = ?', [id]);

  // Record detailed view analytics with all data
  await query(`
    INSERT INTO video_views (video_id, user_id, session_id, ip_address, user_agent, device_type, browser, os, is_returning, referrer, watch_duration, quality_watched, country)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, 
    req.user?.id || null, 
    sessionId,
    req.ip, 
    userAgent, 
    deviceType,
    browser,
    os,
    isReturning,
    req.headers['referer'] || null,
    watchDuration || 0, 
    quality || 'auto',
    country
  ]);

  // Update channel total views
  await query(`
    UPDATE channels c
    JOIN videos v ON c.id = v.channel_id
    SET c.total_views = c.total_views + 1
    WHERE v.id = ?
  `, [id]);

  res.json({ success: true });
}));

// Report a video
router.post('/:id/report', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, description } = req.body;

  // Validate reason
  const validReasons = ['spam', 'harassment', 'hate_speech', 'violence', 'nudity', 'copyright', 'misinformation', 'other'];
  if (!reason || !validReasons.includes(reason)) {
    return res.status(400).json({ error: 'Raison de signalement invalide' });
  }

  // Check if video exists and get owner info
  const [video] = await query(`
    SELECT v.id, v.title, c.user_id as owner_id 
    FROM videos v 
    JOIN channels c ON v.channel_id = c.id 
    WHERE v.id = ?
  `, [id]);
  if (!video) {
    return res.status(404).json({ error: 'Vidéo non trouvée' });
  }

  // Check if user already reported this video
  const [existingReport] = await query(
    'SELECT id FROM reports WHERE reporter_id = ? AND content_type = ? AND content_id = ? AND status = ?',
    [req.user.id, 'video', id, 'pending']
  );
  if (existingReport) {
    return res.status(400).json({ error: 'Vous avez déjà signalé cette vidéo' });
  }

  const reportId = uuidv4();
  await query(
    'INSERT INTO reports (id, reporter_id, content_type, content_id, reason, description) VALUES (?, ?, ?, ?, ?, ?)',
    [reportId, req.user.id, 'video', id, reason, description || null]
  );

  // Notify video owner about the report
  const reasonLabels = {
    spam: 'Spam', harassment: 'Harcèlement', hate_speech: 'Discours haineux',
    violence: 'Violence', nudity: 'Nudité', copyright: 'Droits d\'auteur',
    misinformation: 'Désinformation', other: 'Autre'
  };
  
  try {
    const notificationId = uuidv4();
    await query(
      `INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        notificationId,
        video.owner_id,
        'report',
        'Vidéo signalée',
        `Votre vidéo "${video.title}" a été signalée pour: ${reasonLabels[reason] || reason}`,
        JSON.stringify({ videoId: id, reason, reportId })
      ]
    );
  } catch (e) {
    console.error('Error creating notification:', e.message);
  }

  res.status(201).json({ message: 'Signalement envoyé avec succès' });
}));

// Get related videos
router.get('/:id/related', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit) || 10;

  const [video] = await query('SELECT channel_id, category_id FROM videos WHERE id = ?', [id]);
  if (!video) {
    return res.status(404).json({ error: 'Vidéo non trouvée' });
  }

  const related = await query(`
    SELECT v.id, v.title, v.thumbnail_url, v.duration, v.view_count, v.published_at,
           ch.name as channel_name, ch.handle as channel_handle, COALESCE(ch.avatar_url, u.avatar_url) as channel_avatar
    FROM videos v
    JOIN channels ch ON v.channel_id = ch.id
    JOIN users u ON ch.user_id = u.id
    WHERE v.id != ? AND v.status = 'published' AND v.visibility = 'public'
      AND (v.channel_id = ? OR v.category_id = ?)
    ORDER BY v.view_count DESC
    LIMIT ?
  `, [id, video.channel_id, video.category_id, limit]);

  res.json(related);
}));

module.exports = router;
