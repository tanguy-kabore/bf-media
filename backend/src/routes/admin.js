const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, isAdmin, isSuperAdmin, isModerator } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logActivity, ACTIONS, ACTION_TYPES } = require('../middleware/activityLogger');

// Get dashboard stats
router.get('/dashboard', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const [users] = await query('SELECT COUNT(*) as total FROM users');
  const [activeUsers] = await query('SELECT COUNT(*) as total FROM users WHERE is_active = TRUE');
  const [videos] = await query('SELECT COUNT(*) as total FROM videos WHERE status = "published"');
  const [channels] = await query('SELECT COUNT(*) as total FROM channels');
  const [views] = await query('SELECT COUNT(*) as total FROM video_views WHERE viewed_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)');
  const [viewsWeek] = await query('SELECT COUNT(*) as total FROM video_views WHERE viewed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
  const [viewsMonth] = await query('SELECT COUNT(*) as total FROM video_views WHERE viewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
  const [totalViews] = await query('SELECT COUNT(*) as total FROM video_views');
  const [reports] = await query('SELECT COUNT(*) as total FROM reports WHERE status = "pending"');
  const [totalStorage] = await query('SELECT COALESCE(SUM(file_size), 0) as total FROM videos');
  const [newUsersToday] = await query('SELECT COUNT(*) as total FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)');
  const [newUsersWeek] = await query('SELECT COUNT(*) as total FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)');

  // User growth over time (last 30 days)
  const userGrowth = await query(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM users
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY DATE(created_at)
    ORDER BY date
  `);

  // Views over time (last 30 days)
  const viewsOverTime = await query(`
    SELECT DATE(viewed_at) as date, COUNT(*) as count
    FROM video_views
    WHERE viewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY DATE(viewed_at)
    ORDER BY date
  `);

  // Top countries
  const topCountries = await query(`
    SELECT country, COUNT(*) as count
    FROM video_views
    WHERE country IS NOT NULL AND country != ''
    GROUP BY country
    ORDER BY count DESC
    LIMIT 10
  `);

  // Device distribution
  const deviceDistribution = await query(`
    SELECT device_type, COUNT(*) as count
    FROM video_views
    WHERE device_type IS NOT NULL
    GROUP BY device_type
  `);

  // Browser distribution
  const browserDistribution = await query(`
    SELECT browser, COUNT(*) as count
    FROM video_views
    WHERE browser IS NOT NULL AND browser != ''
    GROUP BY browser
    ORDER BY count DESC
    LIMIT 5
  `);

  const recentUsers = await query(`
    SELECT id, username, email, role, is_active, created_at FROM users
    ORDER BY created_at DESC LIMIT 10
  `);

  const recentVideos = await query(`
    SELECT v.id, v.title, v.status, v.view_count, v.created_at, c.name as channel_name
    FROM videos v JOIN channels c ON v.channel_id = c.id
    ORDER BY v.created_at DESC LIMIT 10
  `);

  // Top videos today
  const topVideosToday = await query(`
    SELECT v.id, v.title, v.thumbnail_url, COUNT(vv.id) as views_today, c.name as channel_name
    FROM videos v
    JOIN channels c ON v.channel_id = c.id
    LEFT JOIN video_views vv ON v.id = vv.video_id AND vv.viewed_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    WHERE v.status = 'published'
    GROUP BY v.id
    ORDER BY views_today DESC
    LIMIT 5
  `);

  res.json({
    stats: {
      users: users.total,
      activeUsers: activeUsers.total,
      videos: videos.total,
      channels: channels.total,
      viewsToday: views.total,
      viewsWeek: viewsWeek.total,
      viewsMonth: viewsMonth.total,
      totalViews: totalViews.total,
      pendingReports: reports.total,
      totalStorage: totalStorage.total,
      newUsersToday: newUsersToday.total,
      newUsersWeek: newUsersWeek.total
    },
    charts: {
      userGrowth,
      viewsOverTime,
      topCountries,
      deviceDistribution,
      browserDistribution
    },
    recentUsers,
    recentVideos,
    topVideosToday
  });
}));

// Get all channels (for filters)
router.get('/channels', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const channels = await query(`
    SELECT c.id, c.name, c.handle, c.subscriber_count, c.video_count, u.username as owner_username
    FROM channels c
    JOIN users u ON c.user_id = u.id
    ORDER BY c.name ASC
  `);
  res.json({ channels });
}));

// Get all users
router.get('/users', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search, role, status } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = '1=1';
  const params = [];

  if (search) {
    whereClause += ' AND (u.username LIKE ? OR u.email LIKE ? OR u.display_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (role) {
    whereClause += ' AND u.role = ?';
    params.push(role);
  }
  if (status === 'active') {
    whereClause += ' AND u.is_active = TRUE';
  } else if (status === 'inactive') {
    whereClause += ' AND u.is_active = FALSE';
  }

  try {
    // Query with storage calculation from videos
    const users = await query(`
      SELECT u.id, u.email, u.username, u.display_name, u.avatar_url, u.role, 
             u.is_verified, u.is_active, u.created_at, u.last_login, u.storage_limit,
             COALESCE((
               SELECT SUM(v.file_size) 
               FROM videos v 
               JOIN channels c ON v.channel_id = c.id 
               WHERE c.user_id = u.id
             ), 0) as storage_used,
             COALESCE((
               SELECT COUNT(*) 
               FROM videos v 
               JOIN channels c ON v.channel_id = c.id 
               WHERE c.user_id = u.id
             ), 0) as video_count
      FROM users u WHERE ${whereClause}
      ORDER BY u.created_at DESC LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    // Ensure numbers are properly converted
    const usersWithStorage = users.map(u => ({
      ...u,
      storage_used: Number(u.storage_used) || 0,
      video_count: Number(u.video_count) || 0,
      storage_limit: Number(u.storage_limit) || 5368709120
    }));

    const [countResult] = await query(`SELECT COUNT(*) as total FROM users u WHERE ${whereClause}`, params);
    const total = countResult?.total || 0;

    res.json({ users: usersWithStorage, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs', details: err.message });
  }
}));

// Get single user details
router.get('/users/:id', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [user] = await query(`
    SELECT u.*, 
           (SELECT COUNT(*) FROM channels WHERE user_id = u.id) as channel_count,
           (SELECT COUNT(*) FROM videos v JOIN channels c ON v.channel_id = c.id WHERE c.user_id = u.id) as video_count,
           (SELECT COALESCE(SUM(v.file_size), 0) FROM videos v JOIN channels c ON v.channel_id = c.id WHERE c.user_id = u.id) as storage_used_calc
    FROM users u WHERE u.id = ?
  `, [id]);

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }

  const channels = await query(`
    SELECT id, name, handle, subscriber_count, video_count, created_at
    FROM channels WHERE user_id = ?
  `, [id]);

  const recentVideos = await query(`
    SELECT v.id, v.title, v.status, v.view_count, v.created_at, c.name as channel_name
    FROM videos v
    JOIN channels c ON v.channel_id = c.id
    WHERE c.user_id = ?
    ORDER BY v.created_at DESC LIMIT 10
  `, [id]);

  res.json({ user, channels, recentVideos });
}));

// Update user
router.patch('/users/:id', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { username, email, displayName, role, isActive, storageLimit, avatarUrl } = req.body;
  
  console.log('Update user request:', { id, username, email, displayName, role, isActive, storageLimit, avatarUrl });

  // Superadmin can modify their own account, but regular admins cannot
  if (id === req.user.id && req.user.role !== 'superadmin') {
    return res.status(400).json({ error: 'Vous ne pouvez pas modifier votre propre compte ici' });
  }

  // Check target user role
  const [targetUser] = await query('SELECT role, username FROM users WHERE id = ?', [id]);
  if (!targetUser) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }

  // Only superadmin can modify admin/superadmin users
  if (['admin', 'superadmin'].includes(targetUser.role) && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Seul un superadmin peut modifier un administrateur' });
  }

  // Cannot modify another superadmin (but can modify yourself)
  if (targetUser.role === 'superadmin' && req.user.id !== id) {
    return res.status(403).json({ error: 'Impossible de modifier un autre superadmin' });
  }

  // Only superadmin can assign admin role
  if (role && role === 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Seul un superadmin peut promouvoir en admin' });
  }

  // Cannot change superadmin role (even yourself)
  if (role && role === 'superadmin' && targetUser.role !== 'superadmin') {
    return res.status(403).json({ error: 'Impossible d\'assigner le rôle superadmin' });
  }
  
  // Superadmin cannot demote themselves
  if (targetUser.role === 'superadmin' && req.user.id === id && role && role !== 'superadmin') {
    return res.status(403).json({ error: 'Vous ne pouvez pas changer votre propre rôle de superadmin' });
  }

  const updates = [];
  const params = [];

  if (username) { updates.push('username = ?'); params.push(username); }
  if (email) { updates.push('email = ?'); params.push(email); }
  if (displayName !== undefined) { updates.push('display_name = ?'); params.push(displayName || null); }
  if (role) { updates.push('role = ?'); params.push(role); }
  if (isActive !== undefined) { updates.push('is_active = ?'); params.push(isActive ? 1 : 0); }
  if (avatarUrl !== undefined) { updates.push('avatar_url = ?'); params.push(avatarUrl || null); }
  if (storageLimit !== undefined) { updates.push('storage_limit = ?'); params.push(parseInt(storageLimit)); }

  if (updates.length > 0) {
    params.push(id);
    const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    console.log('Executing update query:', updateQuery, 'with params:', params);
    await query(updateQuery, params);
  }

  // Log the action
  await logActivity({
    userId: req.user.id,
    action: ACTIONS.ADMIN_UPDATE_USER,
    actionType: ACTION_TYPES.ADMIN,
    targetType: 'user',
    targetId: id,
    details: { username, email, role, isActive, avatarUrl, previousRole: targetUser.role, targetUsername: targetUser.username }
  }, req);

  res.json({ message: 'Utilisateur mis à jour' });
}));

// Delete user
router.delete('/users/:id', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Don't allow deleting yourself
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  }

  // Check target user role
  const [targetUser] = await query('SELECT role, username FROM users WHERE id = ?', [id]);
  if (!targetUser) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }

  // Cannot delete superadmin
  if (targetUser.role === 'superadmin') {
    return res.status(403).json({ error: 'Impossible de supprimer un superadmin' });
  }

  // Only superadmin can delete admin users
  if (targetUser.role === 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Seul un superadmin peut supprimer un administrateur' });
  }

  await query('DELETE FROM users WHERE id = ?', [id]);

  // Log the action
  await logActivity({
    userId: req.user.id,
    action: ACTIONS.ADMIN_DELETE_USER,
    actionType: ACTION_TYPES.ADMIN,
    targetType: 'user',
    targetId: id,
    details: { deletedUsername: targetUser.username, deletedRole: targetUser.role }
  }, req);

  res.json({ message: 'Utilisateur supprimé' });
}));

// Get all videos (admin)
router.get('/videos', authenticate, isModerator, asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status, search, channelId } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = '1=1';
  const params = [];

  if (status) {
    whereClause += ' AND v.status = ?';
    params.push(status);
  }
  if (search) {
    whereClause += ' AND (v.title LIKE ? OR c.name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (channelId) {
    whereClause += ' AND v.channel_id = ?';
    params.push(channelId);
  }

  const videos = await query(`
    SELECT v.id, v.title, v.thumbnail_url, v.status, v.visibility, v.view_count, 
           v.like_count, v.file_size, v.duration, v.created_at, v.published_at,
           c.name as channel_name, c.handle as channel_handle, u.username as owner_username
    FROM videos v 
    JOIN channels c ON v.channel_id = c.id
    JOIN users u ON c.user_id = u.id
    WHERE ${whereClause}
    ORDER BY v.created_at DESC LIMIT ? OFFSET ?
  `, [...params, parseInt(limit), parseInt(offset)]);

  const [{ total }] = await query(`
    SELECT COUNT(*) as total FROM videos v 
    JOIN channels c ON v.channel_id = c.id
    WHERE ${whereClause}
  `, params);

  res.json({ videos, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
}));

// Get single video details
router.get('/videos/:id', authenticate, isModerator, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [video] = await query(`
    SELECT v.*, c.name as channel_name, c.handle as channel_handle, u.username as owner_username, u.email as owner_email
    FROM videos v 
    JOIN channels c ON v.channel_id = c.id
    JOIN users u ON c.user_id = u.id
    WHERE v.id = ?
  `, [id]);

  if (!video) {
    return res.status(404).json({ error: 'Vidéo non trouvée' });
  }

  res.json({ video });
}));

// Update video status
router.patch('/videos/:id', authenticate, isModerator, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, visibility } = req.body;

  const updates = [];
  const params = [];

  if (status) { updates.push('status = ?'); params.push(status); }
  if (visibility) { updates.push('visibility = ?'); params.push(visibility); }

  if (updates.length > 0) {
    params.push(id);
    await query(`UPDATE videos SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  res.json({ message: 'Vidéo mise à jour' });
}));

// Delete video
router.delete('/videos/:id', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Get video info for logging
  const [video] = await query('SELECT title, channel_id FROM videos WHERE id = ?', [id]);
  
  await query('DELETE FROM videos WHERE id = ?', [id]);

  // Log the action
  await logActivity({
    userId: req.user.id,
    action: ACTIONS.ADMIN_DELETE_VIDEO,
    actionType: ACTION_TYPES.ADMIN,
    targetType: 'video',
    targetId: id,
    details: { videoTitle: video?.title }
  }, req);

  res.json({ message: 'Vidéo supprimée' });
}));

// Get reports statistics
router.get('/reports/stats', authenticate, isModerator, asyncHandler(async (req, res) => {
  const [pending] = await query('SELECT COUNT(*) as count FROM reports WHERE status = "pending"');
  const [reviewing] = await query('SELECT COUNT(*) as count FROM reports WHERE status = "reviewing"');
  const [resolved] = await query('SELECT COUNT(*) as count FROM reports WHERE status = "resolved"');
  const [dismissed] = await query('SELECT COUNT(*) as count FROM reports WHERE status = "dismissed"');
  const [total] = await query('SELECT COUNT(*) as count FROM reports');
  const [todayCount] = await query('SELECT COUNT(*) as count FROM reports WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)');
  const [weekCount] = await query('SELECT COUNT(*) as count FROM reports WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)');

  // Top reported reasons
  const topReasons = await query(`
    SELECT reason, COUNT(*) as count FROM reports 
    GROUP BY reason ORDER BY count DESC LIMIT 5
  `);

  res.json({
    pending: pending.count,
    reviewing: reviewing.count,
    resolved: resolved.count,
    dismissed: dismissed.count,
    total: total.count,
    todayCount: todayCount.count,
    weekCount: weekCount.count,
    topReasons
  });
}));

// Get reports
router.get('/reports', authenticate, isModerator, asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status = 'pending' } = req.query;
  const offset = (page - 1) * limit;

  const reports = await query(`
    SELECT r.*, u.username as reporter_username,
           v.title as video_title, v.thumbnail_url as video_thumbnail, v.status as video_status,
           v.view_count as video_views, v.channel_id,
           ch.name as channel_name, ch.handle as channel_handle
    FROM reports r
    JOIN users u ON r.reporter_id = u.id
    LEFT JOIN videos v ON r.content_type = 'video' AND r.content_id = v.id
    LEFT JOIN channels ch ON v.channel_id = ch.id
    WHERE r.status = ?
    ORDER BY r.created_at DESC LIMIT ? OFFSET ?
  `, [status, parseInt(limit), parseInt(offset)]);

  const [{ total }] = await query('SELECT COUNT(*) as total FROM reports WHERE status = ?', [status]);

  res.json({ 
    reports, 
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
  });
}));

// Get single report details
router.get('/reports/:id', authenticate, isModerator, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [report] = await query(`
    SELECT r.*, u.username as reporter_username, u.email as reporter_email,
           v.id as video_id, v.title as video_title, v.description as video_description,
           v.thumbnail_url as video_thumbnail, v.status as video_status,
           v.view_count as video_views, v.like_count as video_likes, v.duration as video_duration,
           v.channel_id, v.published_at as video_published_at,
           ch.name as channel_name, ch.handle as channel_handle,
           owner.username as owner_username, owner.email as owner_email,
           reviewer.username as reviewer_username
    FROM reports r
    JOIN users u ON r.reporter_id = u.id
    LEFT JOIN videos v ON r.content_type = 'video' AND r.content_id = v.id
    LEFT JOIN channels ch ON v.channel_id = ch.id
    LEFT JOIN users owner ON ch.user_id = owner.id
    LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
    WHERE r.id = ?
  `, [id]);

  if (!report) {
    return res.status(404).json({ error: 'Signalement non trouvé' });
  }

  // Get other reports for same content
  const otherReports = await query(`
    SELECT r.id, r.reason, r.description, r.created_at, u.username as reporter_username
    FROM reports r
    JOIN users u ON r.reporter_id = u.id
    WHERE r.content_type = ? AND r.content_id = ? AND r.id != ?
    ORDER BY r.created_at DESC LIMIT 10
  `, [report.content_type, report.content_id, id]);

  res.json({ report, otherReports });
}));

// Handle report with action on video
router.patch('/reports/:id', authenticate, isModerator, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, actionTaken, videoAction } = req.body;

  // Get report to find the video
  const [report] = await query('SELECT content_type, content_id FROM reports WHERE id = ?', [id]);
  
  if (!report) {
    return res.status(404).json({ error: 'Signalement non trouvé' });
  }

  // Apply video action if specified
  if (report.content_type === 'video' && videoAction) {
    if (videoAction === 'block') {
      await query('UPDATE videos SET status = "blocked" WHERE id = ?', [report.content_id]);
    } else if (videoAction === 'delete') {
      await query('DELETE FROM videos WHERE id = ?', [report.content_id]);
    }
  }

  await query(`
    UPDATE reports SET status = ?, action_taken = ?, reviewed_by = ?, reviewed_at = NOW()
    WHERE id = ?
  `, [status, actionTaken, req.user.id, id]);

  // Log the action
  await logActivity({
    userId: req.user.id,
    action: ACTIONS.ADMIN_HANDLE_REPORT,
    actionType: ACTION_TYPES.ADMIN,
    targetType: 'report',
    targetId: id,
    details: { status, videoAction, contentType: report.content_type, contentId: report.content_id }
  }, req);

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

// ==================== ADS MANAGEMENT ====================

// Get all ads
router.get('/ads', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status, type } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = '1=1';
  const params = [];

  if (status) {
    whereClause += ' AND status = ?';
    params.push(status);
  }
  if (type) {
    whereClause += ' AND ad_type = ?';
    params.push(type);
  }

  const ads = await query(`
    SELECT * FROM ads WHERE ${whereClause}
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `, [...params, parseInt(limit), parseInt(offset)]);

  const [{ total }] = await query(`SELECT COUNT(*) as total FROM ads WHERE ${whereClause}`, params);

  res.json({ ads, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
}));

// Create ad
router.post('/ads', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { title, description, ad_type, media_url, target_url, duration, position, priority, start_date, end_date, budget, cpm, status, targeting_mode, target_countries, target_devices, target_categories, skip_duration, company_name } = req.body;

  // Validate required fields
  if (!title || !target_url) {
    return res.status(400).json({ error: 'Titre et URL cible requis' });
  }

  // Validate position is a valid ENUM value
  const validPositions = ['sidebar', 'header', 'footer', 'pre_roll', 'mid_roll', 'post_roll', 'in_feed'];
  const adPosition = validPositions.includes(position) ? position : 'sidebar';
  
  // Validate ad_type is a valid ENUM value
  const validAdTypes = ['banner', 'video', 'overlay', 'sponsored'];
  const adType = validAdTypes.includes(ad_type) ? ad_type : 'banner';

  const id = require('uuid').v4();
  await query(`
    INSERT INTO ads (id, title, description, ad_type, media_url, target_url, duration, position, priority, start_date, end_date, budget, cpm, status, target_countries, target_devices, target_categories, skip_duration, company_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, title, description || '', adType, media_url || '', target_url, duration || 0, adPosition, priority || 1, start_date || null, end_date || null, budget || 0, cpm || 0, status || 'draft', target_countries || '[]', target_devices || '[]', target_categories || '[]', parseInt(skip_duration) || 5, company_name || '']);

  res.status(201).json({ message: 'Publicité créée', id });
}));

// Update ad
router.patch('/ads/:id', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, ad_type, media_url, target_url, duration, position, priority, start_date, end_date, budget, cpm, status, target_countries, target_devices, target_categories, skip_duration, company_name } = req.body;

  // Validate ENUM values - must match database ENUM definitions
  const validPositions = ['sidebar', 'header', 'footer', 'pre_roll', 'mid_roll', 'post_roll', 'in_feed'];
  const validAdTypes = ['banner', 'video', 'overlay', 'sponsored'];
  const validStatuses = ['draft', 'active', 'paused', 'expired'];

  const updates = [];
  const params = [];

  try {
    if (title) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description || ''); }
    
    // Handle ad_type - validate or skip if invalid
    if (ad_type !== undefined) {
      if (validAdTypes.includes(ad_type)) {
        updates.push('ad_type = ?'); 
        params.push(ad_type);
      }
    }
    
    if (media_url !== undefined) { updates.push('media_url = ?'); params.push(media_url || ''); }
    if (target_url !== undefined) { updates.push('target_url = ?'); params.push(target_url || ''); }
    if (duration !== undefined) { updates.push('duration = ?'); params.push(parseFloat(duration) || 0); }
    
    // Handle position - validate or skip if invalid
    if (position !== undefined) {
      if (validPositions.includes(position)) {
        updates.push('position = ?'); 
        params.push(position);
      }
    }
    
    if (priority !== undefined) { updates.push('priority = ?'); params.push(parseInt(priority) || 1); }
    if (start_date !== undefined) { updates.push('start_date = ?'); params.push(start_date || null); }
    if (end_date !== undefined) { updates.push('end_date = ?'); params.push(end_date || null); }
    if (budget !== undefined) { updates.push('budget = ?'); params.push(parseFloat(budget) || 0); }
    if (cpm !== undefined) { updates.push('cpm = ?'); params.push(parseFloat(cpm) || 0); }
    
    // Handle status - validate or skip if invalid
    if (status !== undefined) {
      if (validStatuses.includes(status)) {
        updates.push('status = ?'); 
        params.push(status);
      }
    }
    
    if (target_countries !== undefined) { 
      const countriesStr = typeof target_countries === 'string' ? target_countries : JSON.stringify(target_countries || []);
      updates.push('target_countries = ?'); 
      params.push(countriesStr); 
    }
    if (target_devices !== undefined) { 
      const devicesStr = typeof target_devices === 'string' ? target_devices : JSON.stringify(target_devices || []);
      updates.push('target_devices = ?'); 
      params.push(devicesStr); 
    }
    if (target_categories !== undefined) { 
      const categoriesStr = typeof target_categories === 'string' ? target_categories : JSON.stringify(target_categories || []);
      updates.push('target_categories = ?'); 
      params.push(categoriesStr); 
    }
    
    // Handle skip_duration and company_name
    if (skip_duration !== undefined) { 
      updates.push('skip_duration = ?'); 
      params.push(parseInt(skip_duration) || 5); 
    }
    if (company_name !== undefined) { 
      updates.push('company_name = ?'); 
      params.push(company_name || ''); 
    }

    if (updates.length > 0) {
      params.push(id);
      await query(`UPDATE ads SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    res.json({ message: 'Publicité mise à jour' });
  } catch (error) {
    console.error('Error updating ad:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour', error: error.message });
  }
}));

// Delete ad
router.delete('/ads/:id', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  await query('DELETE FROM ads WHERE id = ?', [id]);
  res.json({ message: 'Publicité supprimée' });
}));

// Get ads analytics
router.get('/ads/analytics', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const [totalAds] = await query('SELECT COUNT(*) as total FROM ads');
  const [activeAds] = await query('SELECT COUNT(*) as total FROM ads WHERE status = "active"');
  const [totalImpressions] = await query('SELECT COALESCE(SUM(impressions), 0) as total FROM ads');
  const [totalClicks] = await query('SELECT COALESCE(SUM(clicks), 0) as total FROM ads');
  const [totalRevenue] = await query('SELECT COALESCE(SUM(revenue), 0) as total FROM ads');

  const topAds = await query(`
    SELECT id, title, ad_type, impressions, clicks, 
           CASE WHEN impressions > 0 THEN (clicks / impressions * 100) ELSE 0 END as ctr,
           revenue
    FROM ads
    ORDER BY impressions DESC
    LIMIT 10
  `);

  res.json({
    stats: {
      totalAds: totalAds.total,
      activeAds: activeAds.total,
      totalImpressions: totalImpressions.total,
      totalClicks: totalClicks.total,
      totalRevenue: totalRevenue.total,
      avgCtr: totalImpressions.total > 0 ? (totalClicks.total / totalImpressions.total * 100).toFixed(2) : 0
    },
    topAds
  });
}));

// ==================== STORAGE MANAGEMENT ====================

// Get storage overview
router.get('/storage', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const [totalStorage] = await query('SELECT COALESCE(SUM(file_size), 0) as total FROM videos');
  const [videoCount] = await query('SELECT COUNT(*) as total FROM videos');

  const storageByUser = await query(`
    SELECT u.id, u.username, u.storage_limit, 
           COALESCE(SUM(v.file_size), 0) as storage_used,
           COUNT(v.id) as video_count
    FROM users u
    LEFT JOIN channels c ON u.id = c.user_id
    LEFT JOIN videos v ON c.id = v.channel_id
    GROUP BY u.id
    ORDER BY storage_used DESC
    LIMIT 20
  `);

  const storageByMonth = await query(`
    SELECT DATE_FORMAT(created_at, '%Y-%m') as month, 
           COALESCE(SUM(file_size), 0) as storage,
           COUNT(*) as videos
    FROM videos
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
    GROUP BY month
    ORDER BY month
  `);

  res.json({
    stats: {
      totalStorage: totalStorage.total,
      videoCount: videoCount.total,
      avgFileSize: videoCount.total > 0 ? Math.round(totalStorage.total / videoCount.total) : 0
    },
    storageByUser,
    storageByMonth
  });
}));

// Update user storage limit
router.patch('/storage/user/:userId', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { storageLimit } = req.body;

  await query('UPDATE users SET storage_limit = ? WHERE id = ?', [storageLimit, userId]);
  res.json({ message: 'Limite de stockage mise à jour' });
}));

// ==================== SETTINGS ====================
// Old platform_settings routes removed - using new settings table below

// ==================== VERIFICATION REQUESTS ====================

// Get all verification requests
router.get('/verifications', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = '1=1';
  const params = [];

  if (status) {
    whereClause += ' AND vr.status = ?';
    params.push(status);
  }

  const requests = await query(`
    SELECT vr.*, u.username, u.email, u.avatar_url, u.display_name
    FROM verification_requests vr
    JOIN users u ON vr.user_id = u.id
    WHERE ${whereClause}
    ORDER BY vr.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, parseInt(limit), parseInt(offset)]);

  const [{ total }] = await query(`
    SELECT COUNT(*) as total FROM verification_requests vr WHERE ${whereClause}
  `, params);

  res.json({ requests, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
}));

// Review verification request (approve/reject)
router.patch('/verifications/:id', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, rejection_reason } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }

  // Get the request
  const [request] = await query('SELECT * FROM verification_requests WHERE id = ?', [id]);
  if (!request) {
    return res.status(404).json({ error: 'Demande non trouvée' });
  }

  // Update request
  await query(`
    UPDATE verification_requests 
    SET status = ?, rejection_reason = ?, reviewed_by = ?, reviewed_at = NOW()
    WHERE id = ?
  `, [status, status === 'rejected' ? rejection_reason : null, req.user.id, id]);

  // If approved, update user's verification status AND channel verification
  if (status === 'approved') {
    try {
      await query(`UPDATE users SET is_verified = 1 WHERE id = ?`, [request.user_id]);
      // Also update the channel's is_verified field
      await query(`UPDATE channels SET is_verified = 1 WHERE user_id = ?`, [request.user_id]);
      // Try to update additional columns if they exist
      await query(`UPDATE users SET verification_badge = 1, verified_at = NOW() WHERE id = ?`, [request.user_id]).catch(() => {});
    } catch (e) {
      console.error('Error updating user verification:', e);
    }
  }

  // Log the action
  await logActivity({
    userId: req.user.id,
    action: ACTIONS.ADMIN_VERIFY_USER,
    actionType: ACTION_TYPES.ADMIN,
    targetType: 'user',
    targetId: request.user_id,
    details: { status, requestId: id }
  }, req);

  res.json({ message: status === 'approved' ? 'Compte vérifié avec succès' : 'Demande rejetée' });
}));

// Revoke verification badge (keeps request, allows re-approval)
router.delete('/verifications/badge/:userId', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Remove badge from user
  await query(`UPDATE users SET is_verified = 0 WHERE id = ?`, [userId]);
  await query(`UPDATE channels SET is_verified = 0 WHERE user_id = ?`, [userId]);
  await query(`UPDATE users SET verification_badge = 0, verified_at = NULL WHERE id = ?`, [userId]).catch(() => {});
  
  // Set the approved request back to pending so it can be re-approved
  await query(`UPDATE verification_requests SET status = 'pending', reviewed_at = NULL, reviewed_by = NULL WHERE user_id = ? AND status = 'approved'`, [userId]);

  await logActivity({
    userId: req.user.id,
    action: ACTIONS.ADMIN_VERIFY_USER,
    actionType: ACTION_TYPES.ADMIN,
    targetType: 'user',
    targetId: userId,
    details: { action: 'revoke_badge' }
  }, req);

  res.json({ message: 'Badge de vérification retiré' });
}));

// Delete verification request (and remove badge if approved)
router.delete('/verifications/:id', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get the request first
  const [request] = await query('SELECT * FROM verification_requests WHERE id = ?', [id]);
  if (!request) {
    return res.status(404).json({ error: 'Demande non trouvée' });
  }

  // If was approved, remove badge
  if (request.status === 'approved') {
    await query(`UPDATE users SET is_verified = 0 WHERE id = ?`, [request.user_id]);
    await query(`UPDATE channels SET is_verified = 0 WHERE user_id = ?`, [request.user_id]);
    await query(`UPDATE users SET verification_badge = 0, verified_at = NULL WHERE id = ?`, [request.user_id]).catch(() => {});
  }

  // Delete the request
  await query('DELETE FROM verification_requests WHERE id = ?', [id]);

  await logActivity({
    userId: req.user.id,
    action: ACTIONS.ADMIN_VERIFY_USER,
    actionType: ACTION_TYPES.ADMIN,
    targetType: 'user',
    targetId: request.user_id,
    details: { action: 'delete_request', requestId: id }
  }, req);

  res.json({ message: 'Demande supprimée' });
}));

// ==================== ACTIVITY LOGS ====================

// Get activity logs with filters
router.get('/logs', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 50, 
    action_type, 
    action, 
    user_id, 
    target_type,
    date_from,
    date_to,
    search 
  } = req.query;
  
  const offset = (page - 1) * limit;
  let whereClause = '1=1';
  const params = [];

  if (action_type) {
    whereClause += ' AND l.action_type = ?';
    params.push(action_type);
  }

  if (action) {
    whereClause += ' AND l.action LIKE ?';
    params.push(`%${action}%`);
  }

  if (user_id) {
    whereClause += ' AND l.user_id = ?';
    params.push(user_id);
  }

  if (target_type) {
    whereClause += ' AND l.target_type = ?';
    params.push(target_type);
  }

  if (date_from) {
    whereClause += ' AND l.created_at >= ?';
    params.push(date_from);
  }

  if (date_to) {
    whereClause += ' AND l.created_at <= ?';
    params.push(date_to + ' 23:59:59');
  }

  if (search) {
    whereClause += ' AND (u.username LIKE ? OR u.email LIKE ? OR l.action LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const logs = await query(`
    SELECT l.*, 
           u.username, u.display_name, u.email, u.avatar_url, u.role as user_role
    FROM activity_logs l
    LEFT JOIN users u ON l.user_id = u.id
    WHERE ${whereClause}
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, parseInt(limit), parseInt(offset)]);

  const [{ total }] = await query(`
    SELECT COUNT(*) as total 
    FROM activity_logs l
    LEFT JOIN users u ON l.user_id = u.id
    WHERE ${whereClause}
  `, params);

  // Get stats
  const [todayCount] = await query(`
    SELECT COUNT(*) as count FROM activity_logs 
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
  `);

  const [weekCount] = await query(`
    SELECT COUNT(*) as count FROM activity_logs 
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  `);

  const actionTypeStats = await query(`
    SELECT action_type, COUNT(*) as count 
    FROM activity_logs 
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY action_type
  `);

  res.json({
    logs,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    stats: {
      todayCount: todayCount.count,
      weekCount: weekCount.count,
      actionTypes: actionTypeStats
    }
  });
}));

// Get log details
router.get('/logs/:id', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [log] = await query(`
    SELECT l.*, 
           u.username, u.display_name, u.email, u.avatar_url, u.role as user_role
    FROM activity_logs l
    LEFT JOIN users u ON l.user_id = u.id
    WHERE l.id = ?
  `, [id]);

  if (!log) {
    return res.status(404).json({ error: 'Log non trouvé' });
  }

  res.json(log);
}));

// Export logs (superadmin only)
router.get('/logs/export', authenticate, isSuperAdmin, asyncHandler(async (req, res) => {
  const { date_from, date_to, action_type } = req.query;
  
  let whereClause = '1=1';
  const params = [];

  if (action_type) {
    whereClause += ' AND l.action_type = ?';
    params.push(action_type);
  }

  if (date_from) {
    whereClause += ' AND l.created_at >= ?';
    params.push(date_from);
  }

  if (date_to) {
    whereClause += ' AND l.created_at <= ?';
    params.push(date_to + ' 23:59:59');
  }

  const logs = await query(`
    SELECT l.created_at, u.username, u.email, l.action, l.action_type, 
           l.target_type, l.target_id, l.ip_address, l.details
    FROM activity_logs l
    LEFT JOIN users u ON l.user_id = u.id
    WHERE ${whereClause}
    ORDER BY l.created_at DESC
    LIMIT 10000
  `, params);

  res.json(logs);
}));

// ==================== SUPERADMIN: ADMIN MANAGEMENT ====================

// Get all admins (superadmin only)
router.get('/admins', authenticate, isSuperAdmin, asyncHandler(async (req, res) => {
  const admins = await query(`
    SELECT id, email, username, display_name, avatar_url, role, 
           is_verified, is_active, created_at, last_login
    FROM users 
    WHERE role IN ('admin', 'superadmin')
    ORDER BY role DESC, created_at DESC
  `);

  res.json(admins);
}));

// Update admin (superadmin only)
router.patch('/admins/:id', authenticate, isSuperAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role, isActive } = req.body;

  // Cannot modify yourself
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas modifier votre propre compte' });
  }

  // Get target user
  const [targetUser] = await query('SELECT role FROM users WHERE id = ?', [id]);
  if (!targetUser) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }

  // Cannot demote another superadmin unless you're also superadmin (already checked)
  const updates = [];
  const params = [];

  if (role && ['user', 'creator', 'moderator', 'admin'].includes(role)) {
    updates.push('role = ?');
    params.push(role);
  }

  if (isActive !== undefined) {
    updates.push('is_active = ?');
    params.push(isActive ? 1 : 0);
  }

  if (updates.length > 0) {
    params.push(id);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  await logActivity({
    userId: req.user.id,
    action: ACTIONS.ADMIN_UPDATE_USER,
    actionType: ACTION_TYPES.ADMIN,
    targetType: 'user',
    targetId: id,
    details: { role, isActive, previousRole: targetUser.role }
  }, req);

  res.json({ message: 'Administrateur mis à jour' });
}));

// Delete admin (superadmin only)
router.delete('/admins/:id', authenticate, isSuperAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Cannot delete yourself
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  }

  // Get target user info for logging
  const [targetUser] = await query('SELECT username, role FROM users WHERE id = ?', [id]);
  if (!targetUser) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }

  // Cannot delete another superadmin
  if (targetUser.role === 'superadmin') {
    return res.status(403).json({ error: 'Impossible de supprimer un superadmin' });
  }

  await query('DELETE FROM users WHERE id = ?', [id]);

  await logActivity({
    userId: req.user.id,
    action: ACTIONS.ADMIN_DELETE_USER,
    actionType: ACTION_TYPES.ADMIN,
    targetType: 'user',
    targetId: id,
    details: { deletedUsername: targetUser.username, deletedRole: targetUser.role }
  }, req);

  res.json({ message: 'Administrateur supprimé' });
}));

// Promote user to admin (superadmin only)
router.post('/admins/promote/:userId', authenticate, isSuperAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const [user] = await query('SELECT username, role FROM users WHERE id = ?', [userId]);
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }

  if (user.role === 'admin' || user.role === 'superadmin') {
    return res.status(400).json({ error: 'Cet utilisateur est déjà admin' });
  }

  await query('UPDATE users SET role = ? WHERE id = ?', ['admin', userId]);

  await logActivity({
    userId: req.user.id,
    action: ACTIONS.ADMIN_UPDATE_USER,
    actionType: ACTION_TYPES.ADMIN,
    targetType: 'user',
    targetId: userId,
    details: { action: 'promote_to_admin', previousRole: user.role }
  }, req);

  res.json({ message: 'Utilisateur promu administrateur' });
}));

// Get all settings
router.get('/settings', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const settings = await query('SELECT * FROM settings ORDER BY setting_key');
  
  console.log('Raw settings from DB:', settings);
  
  // Convert to key-value object
  const settingsObj = {};
  settings.forEach(s => {
    let value = s.setting_value;
    if (s.setting_type === 'boolean') {
      value = value === 'true';
    } else if (s.setting_type === 'number') {
      value = parseInt(value);
    }
    settingsObj[s.setting_key] = {
      value,
      type: s.setting_type,
      description: s.description
    };
  });
  
  console.log('Sending settings:', settingsObj);
  
  res.json({ settings: settingsObj });
}));

// Update settings
router.put('/settings', authenticate, isSuperAdmin, asyncHandler(async (req, res) => {
  const updates = req.body;
  
  console.log('Updating settings:', updates);
  
  for (const [key, value] of Object.entries(updates)) {
    let stringValue = String(value);
    
    const result = await query(
      'UPDATE settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?',
      [stringValue, key]
    );
    
    console.log(`Updated ${key} to ${stringValue}, affected rows:`, result.affectedRows);
  }
  
  // Log the action
  await logActivity({
    userId: req.user.id,
    action: ACTIONS.ADMIN_UPDATE_SETTINGS,
    actionType: ACTION_TYPES.ADMIN,
    targetType: 'settings',
    details: { updatedKeys: Object.keys(updates) }
  }, req);
  
  res.json({ message: 'Paramètres mis à jour avec succès' });
}));

module.exports = router;
