const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');
const { asyncHandler } = require('../middleware/errorHandler');

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
           c.name as channel_name, c.handle as channel_handle
    FROM watch_history wh
    JOIN videos v ON wh.video_id = v.id
    JOIN channels c ON v.channel_id = c.id
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
           c.name as channel_name, c.handle as channel_handle
    FROM saved_videos sv
    JOIN videos v ON sv.video_id = v.id
    JOIN channels c ON v.channel_id = c.id
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
           c.name as channel_name, c.handle as channel_handle
    FROM video_likes vl
    JOIN videos v ON vl.video_id = v.id
    JOIN channels c ON v.channel_id = c.id
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

// Get user profile - MUST BE LAST (catches all /:username patterns)
router.get('/:username', optionalAuth, asyncHandler(async (req, res) => {
  const { username } = req.params;

  const [user] = await query(`
    SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, u.is_verified, u.created_at,
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
