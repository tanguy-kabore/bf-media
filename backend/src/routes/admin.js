const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, isAdmin, isModerator } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Get dashboard stats
router.get('/dashboard', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const [users] = await query('SELECT COUNT(*) as total FROM users');
  const [videos] = await query('SELECT COUNT(*) as total FROM videos WHERE status = "published"');
  const [channels] = await query('SELECT COUNT(*) as total FROM channels');
  const [views] = await query('SELECT COUNT(*) as total FROM video_views WHERE viewed_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)');
  const [reports] = await query('SELECT COUNT(*) as total FROM reports WHERE status = "pending"');

  const recentUsers = await query(`
    SELECT id, username, email, role, created_at FROM users
    ORDER BY created_at DESC LIMIT 10
  `);

  const recentVideos = await query(`
    SELECT v.id, v.title, v.status, v.created_at, c.name as channel_name
    FROM videos v JOIN channels c ON v.channel_id = c.id
    ORDER BY v.created_at DESC LIMIT 10
  `);

  res.json({
    stats: { users: users.total, videos: videos.total, channels: channels.total, viewsToday: views.total, pendingReports: reports.total },
    recentUsers,
    recentVideos
  });
}));

// Get all users
router.get('/users', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search, role } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = '1=1';
  const params = [];

  if (search) {
    whereClause += ' AND (username LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (role) {
    whereClause += ' AND role = ?';
    params.push(role);
  }

  const users = await query(`
    SELECT id, email, username, display_name, avatar_url, role, is_verified, is_active, created_at, last_login
    FROM users WHERE ${whereClause}
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `, [...params, parseInt(limit), parseInt(offset)]);

  const [{ total }] = await query(`SELECT COUNT(*) as total FROM users WHERE ${whereClause}`, params);

  res.json({ users, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
}));

// Update user
router.patch('/users/:id', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role, isActive, isVerified } = req.body;

  const updates = [];
  const params = [];

  if (role) { updates.push('role = ?'); params.push(role); }
  if (isActive !== undefined) { updates.push('is_active = ?'); params.push(isActive); }
  if (isVerified !== undefined) { updates.push('is_verified = ?'); params.push(isVerified); }

  if (updates.length > 0) {
    params.push(id);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  res.json({ message: 'Utilisateur mis à jour' });
}));

// Get all videos (admin)
router.get('/videos', authenticate, isModerator, asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status, search } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = '1=1';
  const params = [];

  if (status) {
    whereClause += ' AND v.status = ?';
    params.push(status);
  }
  if (search) {
    whereClause += ' AND v.title LIKE ?';
    params.push(`%${search}%`);
  }

  const videos = await query(`
    SELECT v.id, v.title, v.status, v.visibility, v.view_count, v.created_at,
           c.name as channel_name, c.handle as channel_handle
    FROM videos v JOIN channels c ON v.channel_id = c.id
    WHERE ${whereClause}
    ORDER BY v.created_at DESC LIMIT ? OFFSET ?
  `, [...params, parseInt(limit), parseInt(offset)]);

  res.json({ videos });
}));

// Update video status
router.patch('/videos/:id', authenticate, isModerator, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  await query('UPDATE videos SET status = ? WHERE id = ?', [status, id]);
  res.json({ message: 'Vidéo mise à jour' });
}));

// Get reports
router.get('/reports', authenticate, isModerator, asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status = 'pending' } = req.query;
  const offset = (page - 1) * limit;

  const reports = await query(`
    SELECT r.*, u.username as reporter_username
    FROM reports r
    JOIN users u ON r.reporter_id = u.id
    WHERE r.status = ?
    ORDER BY r.created_at DESC LIMIT ? OFFSET ?
  `, [status, parseInt(limit), parseInt(offset)]);

  res.json({ reports });
}));

// Handle report
router.patch('/reports/:id', authenticate, isModerator, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, actionTaken } = req.body;

  await query(`
    UPDATE reports SET status = ?, action_taken = ?, reviewed_by = ?, reviewed_at = NOW()
    WHERE id = ?
  `, [status, actionTaken, req.user.id, id]);

  res.json({ message: 'Rapport traité' });
}));

// Get categories
router.get('/categories', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const categories = await query('SELECT * FROM categories ORDER BY name');
  res.json(categories);
}));

// Create category
router.post('/categories', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { name, slug, description, icon } = req.body;
  await query('INSERT INTO categories (name, slug, description, icon) VALUES (?, ?, ?, ?)', [name, slug, description, icon]);
  res.status(201).json({ message: 'Catégorie créée' });
}));

// Content ID management
router.get('/content-id', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const contentIds = await query(`
    SELECT ci.*, u.username as owner_username
    FROM content_id ci
    JOIN users u ON ci.owner_id = u.id
    ORDER BY ci.created_at DESC
  `);
  res.json(contentIds);
}));

// Get content claims
router.get('/claims', authenticate, isModerator, asyncHandler(async (req, res) => {
  const claims = await query(`
    SELECT cc.*, ci.title as content_title, v.title as video_title
    FROM content_claims cc
    JOIN content_id ci ON cc.content_id = ci.id
    JOIN videos v ON cc.video_id = v.id
    WHERE cc.status = 'pending'
    ORDER BY cc.created_at DESC
  `);
  res.json(claims);
}));

module.exports = router;
