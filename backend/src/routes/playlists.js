const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Get playlist by ID
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [playlist] = await query(`
    SELECT p.*, c.name as channel_name, c.handle as channel_handle, COALESCE(c.avatar_url, u.avatar_url) as channel_avatar
    FROM playlists p
    JOIN channels c ON p.channel_id = c.id
    JOIN users u ON c.user_id = u.id
    WHERE p.id = ?
  `, [id]);

  if (!playlist) {
    return res.status(404).json({ error: 'Playlist non trouvée' });
  }

  if (playlist.visibility === 'private') {
    const [channel] = await query('SELECT user_id FROM channels WHERE id = ?', [playlist.channel_id]);
    if (!req.user || channel.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Playlist privée' });
    }
  }

  const videos = await query(`
    SELECT v.id, v.title, v.thumbnail_url, v.duration, v.view_count, v.published_at,
           pv.position,
           c.name as channel_name, c.handle as channel_handle
    FROM playlist_videos pv
    JOIN videos v ON pv.video_id = v.id
    JOIN channels c ON v.channel_id = c.id
    WHERE pv.playlist_id = ? AND v.status = 'published'
    ORDER BY pv.position ASC
  `, [id]);

  res.json({ ...playlist, videos });
}));

// Create playlist
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { title, description, visibility = 'public' } = req.body;

  const [channel] = await query('SELECT id FROM channels WHERE user_id = ?', [req.user.id]);
  if (!channel) {
    return res.status(400).json({ error: 'Chaîne non trouvée' });
  }

  const playlistId = uuidv4();
  await query(`
    INSERT INTO playlists (id, channel_id, title, description, visibility)
    VALUES (?, ?, ?, ?, ?)
  `, [playlistId, channel.id, title, description || '', visibility]);

  res.status(201).json({
    id: playlistId,
    title,
    description: description || '',
    visibility,
    videoCount: 0
  });
}));

// Update playlist
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, visibility } = req.body;

  const [playlist] = await query(`
    SELECT p.id, c.user_id FROM playlists p
    JOIN channels c ON p.channel_id = c.id
    WHERE p.id = ?
  `, [id]);

  if (!playlist || playlist.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  const updates = [];
  const params = [];
  if (title) { updates.push('title = ?'); params.push(title); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (visibility) { updates.push('visibility = ?'); params.push(visibility); }

  if (updates.length > 0) {
    params.push(id);
    await query(`UPDATE playlists SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  res.json({ message: 'Playlist mise à jour' });
}));

// Delete playlist
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [playlist] = await query(`
    SELECT p.id, c.user_id FROM playlists p
    JOIN channels c ON p.channel_id = c.id
    WHERE p.id = ?
  `, [id]);

  if (!playlist || playlist.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  await query('DELETE FROM playlists WHERE id = ?', [id]);
  res.json({ message: 'Playlist supprimée' });
}));

// Add video to playlist
router.post('/:id/videos', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { videoId } = req.body;

  const [playlist] = await query(`
    SELECT p.id, c.user_id FROM playlists p
    JOIN channels c ON p.channel_id = c.id
    WHERE p.id = ?
  `, [id]);

  if (!playlist || playlist.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  const [video] = await query('SELECT id, duration FROM videos WHERE id = ?', [videoId]);
  if (!video) {
    return res.status(404).json({ error: 'Vidéo non trouvée' });
  }

  const [maxPos] = await query('SELECT MAX(position) as max FROM playlist_videos WHERE playlist_id = ?', [id]);
  const position = (maxPos.max || 0) + 1;

  await query('INSERT IGNORE INTO playlist_videos (playlist_id, video_id, position) VALUES (?, ?, ?)', [id, videoId, position]);
  await query('UPDATE playlists SET video_count = video_count + 1, total_duration = total_duration + ? WHERE id = ?', [video.duration, id]);

  res.json({ message: 'Vidéo ajoutée' });
}));

// Remove video from playlist
router.delete('/:id/videos/:videoId', authenticate, asyncHandler(async (req, res) => {
  const { id, videoId } = req.params;

  const [playlist] = await query(`
    SELECT p.id, c.user_id FROM playlists p
    JOIN channels c ON p.channel_id = c.id
    WHERE p.id = ?
  `, [id]);

  if (!playlist || playlist.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  const [video] = await query('SELECT duration FROM videos WHERE id = ?', [videoId]);
  await query('DELETE FROM playlist_videos WHERE playlist_id = ? AND video_id = ?', [id, videoId]);
  await query('UPDATE playlists SET video_count = video_count - 1, total_duration = total_duration - ? WHERE id = ?', [video?.duration || 0, id]);

  res.json({ message: 'Vidéo retirée' });
}));

// Reorder videos in playlist
router.put('/:id/reorder', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { videoIds } = req.body;

  const [playlist] = await query(`
    SELECT p.id, c.user_id FROM playlists p
    JOIN channels c ON p.channel_id = c.id
    WHERE p.id = ?
  `, [id]);

  if (!playlist || playlist.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  for (let i = 0; i < videoIds.length; i++) {
    await query('UPDATE playlist_videos SET position = ? WHERE playlist_id = ? AND video_id = ?', [i + 1, id, videoIds[i]]);
  }

  res.json({ message: 'Ordre mis à jour' });
}));

// Get user's playlists
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const [channel] = await query('SELECT id FROM channels WHERE user_id = ?', [req.user.id]);
  
  const playlists = await query(`
    SELECT id, title, description, thumbnail_url, visibility, video_count, total_duration, created_at
    FROM playlists
    WHERE channel_id = ?
    ORDER BY created_at DESC
  `, [channel.id]);

  res.json(playlists);
}));

module.exports = router;
