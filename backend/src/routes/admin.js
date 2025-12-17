const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, isAdmin, isModerator } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

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
    // Basic query without optional columns
    const users = await query(`
      SELECT u.id, u.email, u.username, u.display_name, u.avatar_url, u.role, 
             u.is_verified, u.is_active, u.created_at, u.last_login
      FROM users u WHERE ${whereClause}
      ORDER BY u.created_at DESC LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    // Add default storage values
    const usersWithStorage = users.map(u => ({
      ...u,
      storage_limit: 5368709120,
      storage_used: 0
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
  const { role, isActive, isVerified, storageLimit } = req.body;

  const updates = [];
  const params = [];

  if (role) { updates.push('role = ?'); params.push(role); }
  if (isActive !== undefined) { updates.push('is_active = ?'); params.push(isActive ? 1 : 0); }
  if (isVerified !== undefined) { updates.push('is_verified = ?'); params.push(isVerified ? 1 : 0); }
  
  // Handle storage_limit separately (column may not exist)
  if (storageLimit !== undefined) {
    try {
      await query('UPDATE users SET storage_limit = ? WHERE id = ?', [storageLimit, id]);
    } catch (e) {
      // Column doesn't exist, try to add it
      try {
        await query('ALTER TABLE users ADD COLUMN storage_limit BIGINT DEFAULT 5368709120');
        await query('UPDATE users SET storage_limit = ? WHERE id = ?', [storageLimit, id]);
      } catch (e2) {
        console.log('Could not update storage_limit:', e2.message);
      }
    }
  }

  if (updates.length > 0) {
    params.push(id);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  res.json({ message: 'Utilisateur mis à jour' });
}));

// Delete user
router.delete('/users/:id', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Don't allow deleting yourself
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  }

  await query('DELETE FROM users WHERE id = ?', [id]);
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
  await query('DELETE FROM videos WHERE id = ?', [id]);
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
  const { title, description, ad_type, media_url, target_url, duration, position, priority, start_date, end_date, budget, cpm, status, targeting_mode, target_countries, target_devices, target_categories } = req.body;

  const id = require('uuid').v4();
  await query(`
    INSERT INTO ads (id, title, description, ad_type, media_url, target_url, duration, position, priority, start_date, end_date, budget, cpm, status, target_countries, target_devices, target_categories)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, title, description || '', ad_type, media_url || '', target_url, duration || 0, position || '', priority || 1, start_date || null, end_date || null, budget || 0, cpm || 0, status || 'draft', target_countries || '[]', target_devices || '[]', target_categories || '[]']);

  res.status(201).json({ message: 'Publicité créée', id });
}));

// Update ad
router.patch('/ads/:id', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, media_url, target_url, duration, position, priority, start_date, end_date, budget, cpm, status, target_countries, target_devices, target_categories } = req.body;

  const updates = [];
  const params = [];

  if (title) { updates.push('title = ?'); params.push(title); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (media_url !== undefined) { updates.push('media_url = ?'); params.push(media_url); }
  if (target_url) { updates.push('target_url = ?'); params.push(target_url); }
  if (duration !== undefined) { updates.push('duration = ?'); params.push(duration); }
  if (position !== undefined) { updates.push('position = ?'); params.push(position); }
  if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
  if (start_date !== undefined) { updates.push('start_date = ?'); params.push(start_date || null); }
  if (end_date !== undefined) { updates.push('end_date = ?'); params.push(end_date || null); }
  if (budget !== undefined) { updates.push('budget = ?'); params.push(budget); }
  if (cpm !== undefined) { updates.push('cpm = ?'); params.push(cpm); }
  if (status) { updates.push('status = ?'); params.push(status); }
  if (target_countries !== undefined) { updates.push('target_countries = ?'); params.push(target_countries); }
  if (target_devices !== undefined) { updates.push('target_devices = ?'); params.push(target_devices); }
  if (target_categories !== undefined) { updates.push('target_categories = ?'); params.push(target_categories); }

  if (updates.length > 0) {
    params.push(id);
    await query(`UPDATE ads SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  res.json({ message: 'Publicité mise à jour' });
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

// Get platform settings (admin)
router.get('/settings', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const settings = await query('SELECT * FROM platform_settings');
  const settingsObj = {};
  settings.forEach(s => { 
    // Convert values based on type
    if (s.setting_type === 'boolean') {
      settingsObj[s.setting_key] = s.setting_value === 'true';
    } else if (s.setting_type === 'number') {
      settingsObj[s.setting_key] = Number(s.setting_value);
    } else {
      settingsObj[s.setting_key] = s.setting_value;
    }
  });
  res.json(settingsObj);
}));

// Update single platform setting
router.patch('/settings/:key', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  await query(`
    INSERT INTO platform_settings (setting_key, setting_value) VALUES (?, ?)
    ON DUPLICATE KEY UPDATE setting_value = ?
  `, [key, String(value), String(value)]);

  res.json({ message: 'Paramètre mis à jour' });
}));

// Update multiple settings at once
router.put('/settings', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const settings = req.body;
  
  for (const [key, value] of Object.entries(settings)) {
    await query(`
      INSERT INTO platform_settings (setting_key, setting_value) VALUES (?, ?)
      ON DUPLICATE KEY UPDATE setting_value = ?
    `, [key, String(value), String(value)]);
  }

  res.json({ message: 'Paramètres mis à jour' });
}));

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

  // If approved, update user's verification status
  if (status === 'approved') {
    try {
      await query(`UPDATE users SET is_verified = 1 WHERE id = ?`, [request.user_id]);
      // Try to update additional columns if they exist
      await query(`UPDATE users SET verification_badge = 1, verified_at = NOW() WHERE id = ?`, [request.user_id]).catch(() => {});
    } catch (e) {
      console.error('Error updating user verification:', e);
    }
  }

  res.json({ message: status === 'approved' ? 'Compte vérifié avec succès' : 'Demande rejetée' });
}));

// Revoke verification badge
router.delete('/verifications/badge/:userId', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  await query(`UPDATE users SET is_verified = 0 WHERE id = ?`, [userId]);
  await query(`UPDATE users SET verification_badge = 0, verified_at = NULL WHERE id = ?`, [userId]).catch(() => {});

  res.json({ message: 'Badge de vérification retiré' });
}));

module.exports = router;
