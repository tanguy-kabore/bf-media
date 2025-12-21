const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');
const { asyncHandler } = require('../middleware/errorHandler');
const { logActivity, ACTIONS, ACTION_TYPES } = require('../middleware/activityLogger');

// Update user profile
router.put('/profile', authenticate, asyncHandler(async (req, res) => {
  const { displayName, bio } = req.body;

  const updates = [];
  const params = [];

  if (displayName !== undefined) { updates.push('display_name = ?'); params.push(displayName); }
  if (bio !== undefined) { updates.push('bio = ?'); params.push(bio); }

  if (updates.length > 0) {
    params.push(req.user.id);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    // Log profile update
    await logActivity({
      userId: req.user.id,
      action: ACTIONS.UPDATE_PROFILE,
      actionType: ACTION_TYPES.USER,
      targetType: 'user',
      targetId: req.user.id,
      details: { displayName, bio: bio ? 'updated' : undefined }
    }, req);
  }

  res.json({ message: 'Profil mis à jour' });
}));

// Upload avatar
router.post('/avatar', authenticate, uploadAvatar.single('avatar'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Image requise' });
  }

  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  await query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, req.user.id]);

  res.json({ avatarUrl });
}));

// Get watch history
router.get('/history/watch', authenticate, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const history = await query(`
    SELECT v.id, v.title, v.thumbnail_url, v.duration, v.view_count,
           wh.watch_time, wh.progress_percent, wh.watched_at,
           c.name as channel_name, c.handle as channel_handle,
           COALESCE(c.avatar_url, u.avatar_url) as channel_avatar,
           c.is_verified as channel_verified
    FROM watch_history wh
    JOIN videos v ON wh.video_id = v.id
    JOIN channels c ON v.channel_id = c.id
    JOIN users u ON c.user_id = u.id
    WHERE wh.user_id = ?
    ORDER BY wh.watched_at DESC
    LIMIT ? OFFSET ?
  `, [req.user.id, parseInt(limit), parseInt(offset)]);

  res.json(history);
}));

// Add to watch history
router.post('/history/watch', authenticate, asyncHandler(async (req, res) => {
  const { videoId, watchTime, progressPercent } = req.body;

  await query(`
    INSERT INTO watch_history (user_id, video_id, watch_time, progress_percent, completed)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE watch_time = ?, progress_percent = ?, watched_at = NOW(), completed = ?
  `, [req.user.id, videoId, watchTime, progressPercent, progressPercent >= 90, watchTime, progressPercent, progressPercent >= 90]);

  res.json({ success: true });
}));

// Clear watch history
router.delete('/history/watch', authenticate, asyncHandler(async (req, res) => {
  await query('DELETE FROM watch_history WHERE user_id = ?', [req.user.id]);
  res.json({ message: 'Historique effacé' });
}));

// Get saved videos (Watch Later)
router.get('/saved', authenticate, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const saved = await query(`
    SELECT v.id, v.title, v.thumbnail_url, v.duration, v.view_count, v.published_at,
           sv.created_at as saved_at,
           c.name as channel_name, c.handle as channel_handle,
           COALESCE(c.avatar_url, u.avatar_url) as channel_avatar,
           c.is_verified as channel_verified
    FROM saved_videos sv
    JOIN videos v ON sv.video_id = v.id
    JOIN channels c ON v.channel_id = c.id
    JOIN users u ON c.user_id = u.id
    WHERE sv.user_id = ? AND v.status = 'published'
    ORDER BY sv.created_at DESC
    LIMIT ? OFFSET ?
  `, [req.user.id, parseInt(limit), parseInt(offset)]);

  res.json(saved);
}));

// Save video
router.post('/saved/:videoId', authenticate, asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  await query('INSERT IGNORE INTO saved_videos (user_id, video_id) VALUES (?, ?)', [req.user.id, videoId]);
  res.json({ message: 'Vidéo sauvegardée' });
}));

// Remove saved video
router.delete('/saved/:videoId', authenticate, asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  await query('DELETE FROM saved_videos WHERE user_id = ? AND video_id = ?', [req.user.id, videoId]);
  res.json({ message: 'Vidéo retirée' });
}));

// Get liked videos
router.get('/liked', authenticate, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const liked = await query(`
    SELECT v.id, v.title, v.thumbnail_url, v.duration, v.view_count, v.published_at,
           vl.created_at as liked_at,
           c.name as channel_name, c.handle as channel_handle,
           COALESCE(c.avatar_url, u.avatar_url) as channel_avatar,
           c.is_verified as channel_verified
    FROM video_likes vl
    JOIN videos v ON vl.video_id = v.id
    JOIN channels c ON v.channel_id = c.id
    JOIN users u ON c.user_id = u.id
    WHERE vl.user_id = ? AND vl.is_like = TRUE AND v.status = 'published'
    ORDER BY vl.created_at DESC
    LIMIT ? OFFSET ?
  `, [req.user.id, parseInt(limit), parseInt(offset)]);

  res.json(liked);
}));

// Report content
router.post('/report', authenticate, asyncHandler(async (req, res) => {
  const { contentType, contentId, reason, description } = req.body;
  const { v4: uuidv4 } = require('uuid');

  const reportId = uuidv4();
  await query(`
    INSERT INTO reports (id, reporter_id, content_type, content_id, reason, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [reportId, req.user.id, contentType, contentId, reason, description]);

  res.status(201).json({ message: 'Signalement envoyé' });
}));

// Get user preferences
router.get('/preferences', authenticate, asyncHandler(async (req, res) => {
  let [prefs] = await query('SELECT * FROM user_preferences WHERE user_id = ?', [req.user.id]);
  
  // Create default preferences if none exist
  if (!prefs) {
    await query(`
      INSERT INTO user_preferences (user_id) VALUES (?)
    `, [req.user.id]);
    [prefs] = await query('SELECT * FROM user_preferences WHERE user_id = ?', [req.user.id]);
  }

  res.json({
    notifications: {
      newVideos: !!prefs.notify_new_videos,
      comments: !!prefs.notify_comments,
      subscribers: !!prefs.notify_subscribers
    },
    privacy: {
      privateSubscriptions: !!prefs.privacy_subscriptions,
      privatePlaylists: !!prefs.privacy_playlists
    }
  });
}));

// Update user preferences
router.put('/preferences', authenticate, asyncHandler(async (req, res) => {
  const { notifications, privacy } = req.body;

  // Ensure preferences row exists
  await query(`
    INSERT INTO user_preferences (user_id) VALUES (?)
    ON DUPLICATE KEY UPDATE updated_at = NOW()
  `, [req.user.id]);

  const updates = [];
  const params = [];

  if (notifications) {
    if (notifications.newVideos !== undefined) {
      updates.push('notify_new_videos = ?');
      params.push(notifications.newVideos);
    }
    if (notifications.comments !== undefined) {
      updates.push('notify_comments = ?');
      params.push(notifications.comments);
    }
    if (notifications.subscribers !== undefined) {
      updates.push('notify_subscribers = ?');
      params.push(notifications.subscribers);
    }
  }

  if (privacy) {
    if (privacy.privateSubscriptions !== undefined) {
      updates.push('privacy_subscriptions = ?');
      params.push(privacy.privateSubscriptions);
    }
    if (privacy.privatePlaylists !== undefined) {
      updates.push('privacy_playlists = ?');
      params.push(privacy.privatePlaylists);
    }
  }

  if (updates.length > 0) {
    params.push(req.user.id);
    await query(`UPDATE user_preferences SET ${updates.join(', ')} WHERE user_id = ?`, params);
  }

  res.json({ message: 'Préférences mises à jour' });
}));

// ==================== VERIFICATION REQUESTS ====================

// Get user's verification status and history
router.get('/verification/status', authenticate, asyncHandler(async (req, res) => {
  const [user] = await query(`
    SELECT is_verified, verification_badge, verified_at FROM users WHERE id = ?
  `, [req.user.id]);

  const requests = await query(`
    SELECT id, document_type, status, rejection_reason, created_at, reviewed_at
    FROM verification_requests WHERE user_id = ?
    ORDER BY created_at DESC
  `, [req.user.id]);

  res.json({
    isVerified: user?.is_verified || false,
    hasBadge: user?.verification_badge || false,
    verifiedAt: user?.verified_at,
    requests
  });
}));

// Submit verification request
router.post('/verification/request', authenticate, asyncHandler(async (req, res) => {
  const { documentType, documentFrontUrl, documentBackUrl, fullName, dateOfBirth } = req.body;

  if (!documentType || !documentFrontUrl || !fullName) {
    return res.status(400).json({ error: 'Document type, front image, and full name are required' });
  }

  if (documentType === 'national_id' && !documentBackUrl) {
    return res.status(400).json({ error: 'Both sides of national ID are required' });
  }

  // Check if user already has a pending request
  const [pending] = await query(`
    SELECT id FROM verification_requests WHERE user_id = ? AND status = 'pending'
  `, [req.user.id]);

  if (pending) {
    return res.status(400).json({ error: 'Vous avez déjà une demande en cours' });
  }

  // Check if user is already verified
  const [user] = await query('SELECT is_verified FROM users WHERE id = ?', [req.user.id]);
  if (user?.is_verified) {
    return res.status(400).json({ error: 'Votre compte est déjà vérifié' });
  }

  const id = require('uuid').v4();
  await query(`
    INSERT INTO verification_requests (id, user_id, document_type, document_front_url, document_back_url, full_name, date_of_birth)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [id, req.user.id, documentType, documentFrontUrl, documentBackUrl || null, fullName, dateOfBirth || null]);

  res.status(201).json({ message: 'Demande soumise avec succès', id });
}));

// Get user profile - MUST BE LAST (catches all /:username patterns)
router.get('/:username', optionalAuth, asyncHandler(async (req, res) => {
  const { username } = req.params;

  const [user] = await query(`
    SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, u.is_verified, u.verification_badge, u.created_at,
           c.id as channel_id, c.name as channel_name, c.handle as channel_handle,
           COALESCE(c.avatar_url, u.avatar_url) as channel_avatar, c.subscriber_count, c.video_count
    FROM users u
    LEFT JOIN channels c ON u.id = c.user_id
    WHERE u.username = ? AND u.is_active = TRUE
  `, [username]);

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }

  res.json(user);
}));

module.exports = router;
