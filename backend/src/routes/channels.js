const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { uploadAvatar, uploadBanner } = require('../middleware/upload');
const { asyncHandler } = require('../middleware/errorHandler');

// Get all user's channels
router.get('/my', authenticate, asyncHandler(async (req, res) => {
  const channels = await query(`
    SELECT c.id, c.name, c.handle, COALESCE(c.avatar_url, u.avatar_url) as avatar_url, 
           c.banner_url, c.subscriber_count, c.video_count, c.is_verified, c.created_at
    FROM channels c
    JOIN users u ON c.user_id = u.id
    WHERE c.user_id = ?
    ORDER BY c.created_at ASC
  `, [req.user.id]);

  res.json({ channels });
}));

// Create a new channel
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { name, handle, description } = req.body;

  if (!name || !handle) {
    return res.status(400).json({ error: 'Nom et identifiant requis' });
  }

  // Validate handle format (alphanumeric, lowercase, no spaces)
  const handleRegex = /^[a-z0-9_-]{3,30}$/;
  if (!handleRegex.test(handle)) {
    return res.status(400).json({ error: 'Identifiant invalide (3-30 caractères, lettres minuscules, chiffres, - et _ uniquement)' });
  }

  // Check if handle already exists
  const existing = await query('SELECT id FROM channels WHERE handle = ?', [handle]);
  if (existing.length > 0) {
    return res.status(400).json({ error: 'Cet identifiant est déjà utilisé' });
  }

  const channelId = uuidv4();
  await query(
    `INSERT INTO channels (id, user_id, name, handle, description) VALUES (?, ?, ?, ?, ?)`,
    [channelId, req.user.id, name, handle, description || `Chaîne de ${name}`]
  );

  const [newChannel] = await query('SELECT * FROM channels WHERE id = ?', [channelId]);

  res.status(201).json({ 
    message: 'Chaîne créée avec succès',
    channel: newChannel
  });
}));

// Delete a channel
router.delete('/:channelId', authenticate, asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  const [channel] = await query('SELECT id, user_id, handle FROM channels WHERE id = ?', [channelId]);
  if (!channel) {
    return res.status(404).json({ error: 'Chaîne non trouvée' });
  }

  if (channel.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  // Delete all videos associated with the channel
  await query('DELETE FROM videos WHERE channel_id = ?', [channelId]);
  
  // Delete all subscriptions to this channel
  await query('DELETE FROM subscriptions WHERE channel_id = ?', [channelId]);
  
  // Delete the channel
  await query('DELETE FROM channels WHERE id = ?', [channelId]);

  res.json({ message: 'Chaîne supprimée avec succès' });
}));

// Get channel by handle
router.get('/:handle', optionalAuth, asyncHandler(async (req, res) => {
  const { handle } = req.params;

  const channels = await query(`
    SELECT c.id, c.user_id, c.name, c.handle, COALESCE(c.avatar_url, u.avatar_url) as avatar_url,
           c.banner_url, c.description, c.subscriber_count, c.video_count, c.is_verified, 
           c.created_at, u.username, u.display_name as owner_name
    FROM channels c
    JOIN users u ON c.user_id = u.id
    WHERE c.handle = ?
  `, [handle]);

  if (channels.length === 0) {
    return res.status(404).json({ error: 'Chaîne non trouvée' });
  }

  const channel = channels[0];

  // Check subscription status
  let isSubscribed = false;
  if (req.user) {
    const subs = await query(
      'SELECT 1 FROM subscriptions WHERE subscriber_id = ? AND channel_id = ?',
      [req.user.id, channel.id]
    );
    isSubscribed = subs.length > 0;
  }

  // Get recent videos
  const videos = await query(`
    SELECT id, title, thumbnail_url, duration, view_count, published_at
    FROM videos
    WHERE channel_id = ? AND status = 'published' AND visibility = 'public'
    ORDER BY published_at DESC
    LIMIT 12
  `, [channel.id]);

  res.json({
    ...channel,
    isSubscribed,
    recentVideos: videos
  });
}));

// Get channel videos
router.get('/:handle/videos', optionalAuth, asyncHandler(async (req, res) => {
  const { handle } = req.params;
  const { page = 1, limit = 20, sort = 'recent' } = req.query;
  const offset = (page - 1) * limit;

  const [channel] = await query('SELECT id, user_id FROM channels WHERE handle = ?', [handle]);
  if (!channel) {
    return res.status(404).json({ error: 'Chaîne non trouvée' });
  }

  let visibilityClause = "AND visibility = 'public'";
  if (req.user && req.user.id === channel.user_id) {
    visibilityClause = '';
  }

  let orderBy = 'published_at DESC';
  if (sort === 'popular') orderBy = 'view_count DESC';
  if (sort === 'oldest') orderBy = 'published_at ASC';

  const videos = await query(`
    SELECT id, title, description, thumbnail_url, duration, view_count, 
           like_count, visibility, status, published_at
    FROM videos
    WHERE channel_id = ? AND status = 'published' ${visibilityClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `, [channel.id, parseInt(limit), parseInt(offset)]);

  const [{ total }] = await query(`
    SELECT COUNT(*) as total FROM videos
    WHERE channel_id = ? AND status = 'published' ${visibilityClause}
  `, [channel.id]);

  res.json({
    videos,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
  });
}));

// Update channel
router.put('/:handle', authenticate, asyncHandler(async (req, res) => {
  const { handle } = req.params;
  const { name, description, country } = req.body;

  const [channel] = await query('SELECT id, user_id FROM channels WHERE handle = ?', [handle]);
  if (!channel) {
    return res.status(404).json({ error: 'Chaîne non trouvée' });
  }

  if (channel.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  const updates = [];
  const params = [];

  if (name) { updates.push('name = ?'); params.push(name); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (country) { updates.push('country = ?'); params.push(country); }

  if (updates.length > 0) {
    params.push(channel.id);
    await query(`UPDATE channels SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  res.json({ message: 'Chaîne mise à jour' });
}));

// Upload channel avatar
router.post('/:handle/avatar', authenticate, uploadAvatar.single('avatar'), asyncHandler(async (req, res) => {
  const { handle } = req.params;

  const [channel] = await query('SELECT id, user_id FROM channels WHERE handle = ?', [handle]);
  if (!channel || channel.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Image requise' });
  }

  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  await query('UPDATE channels SET avatar_url = ? WHERE id = ?', [avatarUrl, channel.id]);

  res.json({ avatarUrl });
}));

// Upload channel banner
router.post('/:handle/banner', authenticate, uploadBanner.single('banner'), asyncHandler(async (req, res) => {
  const { handle } = req.params;

  const [channel] = await query('SELECT id, user_id FROM channels WHERE handle = ?', [handle]);
  if (!channel || channel.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Image requise' });
  }

  const bannerUrl = `/uploads/banners/${req.file.filename}`;
  await query('UPDATE channels SET banner_url = ? WHERE id = ?', [bannerUrl, channel.id]);

  res.json({ bannerUrl });
}));

// Get channel playlists
router.get('/:handle/playlists', asyncHandler(async (req, res) => {
  const { handle } = req.params;

  const [channel] = await query('SELECT id FROM channels WHERE handle = ?', [handle]);
  if (!channel) {
    return res.status(404).json({ error: 'Chaîne non trouvée' });
  }

  const playlists = await query(`
    SELECT id, title, description, thumbnail_url, video_count, visibility, created_at
    FROM playlists
    WHERE channel_id = ? AND visibility = 'public'
    ORDER BY created_at DESC
  `, [channel.id]);

  res.json(playlists);
}));

// Get channel subscribers
router.get('/:handle/subscribers', authenticate, asyncHandler(async (req, res) => {
  const { handle } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  const [channel] = await query('SELECT id, user_id FROM channels WHERE handle = ?', [handle]);
  if (!channel || channel.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  const subscribers = await query(`
    SELECT u.id, u.username, u.display_name, u.avatar_url, s.created_at as subscribed_at
    FROM subscriptions s
    JOIN users u ON s.subscriber_id = u.id
    WHERE s.channel_id = ?
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `, [channel.id, parseInt(limit), parseInt(offset)]);

  res.json(subscribers);
}));

module.exports = router;
