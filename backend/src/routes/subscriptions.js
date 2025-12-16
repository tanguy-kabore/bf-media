const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Subscribe to a channel
router.post('/:channelId', authenticate, asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  const [channel] = await query('SELECT id, user_id, name FROM channels WHERE id = ?', [channelId]);
  if (!channel) {
    return res.status(404).json({ error: 'Chaîne non trouvée' });
  }

  if (channel.user_id === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas vous abonner à votre propre chaîne' });
  }

  const existing = await query(
    'SELECT 1 FROM subscriptions WHERE subscriber_id = ? AND channel_id = ?',
    [req.user.id, channelId]
  );

  if (existing.length > 0) {
    return res.status(400).json({ error: 'Déjà abonné' });
  }

  await query(
    'INSERT INTO subscriptions (subscriber_id, channel_id) VALUES (?, ?)',
    [req.user.id, channelId]
  );

  await query('UPDATE channels SET subscriber_count = subscriber_count + 1 WHERE id = ?', [channelId]);

  // Check if channel owner wants subscription notifications
  const [prefs] = await query(
    'SELECT notify_subscribers FROM user_preferences WHERE user_id = ?',
    [channel.user_id]
  );
  const wantsNotif = !prefs || prefs.notify_subscribers !== 0;

  if (wantsNotif) {
    const notifId = uuidv4();
    await query(`
      INSERT INTO notifications (id, user_id, type, title, message, link)
      VALUES (?, ?, 'subscription', 'Nouvel abonné', ?, ?)
    `, [notifId, channel.user_id, `${req.user.display_name} s'est abonné à votre chaîne`, `/channel/${channel.id}`]);

    const io = req.app.get('io');
    io.to(`user:${channel.user_id}`).emit('notification', { type: 'subscription' });
  }

  res.json({ message: 'Abonnement réussi' });
}));

// Unsubscribe from a channel
router.delete('/:channelId', authenticate, asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  const result = await query(
    'DELETE FROM subscriptions WHERE subscriber_id = ? AND channel_id = ?',
    [req.user.id, channelId]
  );

  if (result.affectedRows === 0) {
    return res.status(400).json({ error: 'Non abonné à cette chaîne' });
  }

  await query('UPDATE channels SET subscriber_count = subscriber_count - 1 WHERE id = ?', [channelId]);

  res.json({ message: 'Désabonnement réussi' });
}));

// Toggle notifications for subscription
router.patch('/:channelId/notifications', authenticate, asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const { enabled } = req.body;

  await query(
    'UPDATE subscriptions SET notifications_enabled = ? WHERE subscriber_id = ? AND channel_id = ?',
    [enabled, req.user.id, channelId]
  );

  res.json({ message: 'Notifications mises à jour' });
}));

// Get user's subscriptions
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  const subscriptions = await query(`
    SELECT c.id, c.name, c.handle, COALESCE(c.avatar_url, u.avatar_url) as avatar_url, 
           c.subscriber_count, c.is_verified,
           s.notifications_enabled, s.created_at as subscribed_at
    FROM subscriptions s
    JOIN channels c ON s.channel_id = c.id
    JOIN users u ON c.user_id = u.id
    WHERE s.subscriber_id = ?
    ORDER BY c.name ASC
    LIMIT ? OFFSET ?
  `, [req.user.id, parseInt(limit), parseInt(offset)]);

  const [{ total }] = await query(
    'SELECT COUNT(*) as total FROM subscriptions WHERE subscriber_id = ?',
    [req.user.id]
  );

  res.json({
    subscriptions,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
  });
}));

// Get subscription feed (videos from subscribed channels)
router.get('/feed', authenticate, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const videos = await query(`
    SELECT v.id, v.title, v.thumbnail_url, v.duration, v.view_count, v.published_at,
           c.id as channel_id, c.name as channel_name, c.handle as channel_handle,
           COALESCE(c.avatar_url, u.avatar_url) as channel_avatar, c.is_verified as channel_verified
    FROM videos v
    JOIN channels c ON v.channel_id = c.id
    JOIN users u ON c.user_id = u.id
    JOIN subscriptions s ON c.id = s.channel_id
    WHERE s.subscriber_id = ? AND v.status = 'published' AND v.visibility = 'public'
    ORDER BY v.published_at DESC
    LIMIT ? OFFSET ?
  `, [req.user.id, parseInt(limit), parseInt(offset)]);

  res.json(videos);
}));

module.exports = router;
