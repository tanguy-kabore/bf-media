const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Get channel analytics overview
router.get('/channel', authenticate, asyncHandler(async (req, res) => {
  const { period = '28' } = req.query;
  const days = parseInt(period);

  const [channel] = await query('SELECT id FROM channels WHERE user_id = ?', [req.user.id]);
  if (!channel) {
    return res.status(404).json({ error: 'Chaîne non trouvée' });
  }

  // Total stats
  const [totals] = await query(`
    SELECT 
      SUM(view_count) as total_views,
      SUM(like_count) as total_likes,
      SUM(comment_count) as total_comments,
      COUNT(*) as total_videos
    FROM videos
    WHERE channel_id = ? AND status = 'published'
  `, [channel.id]);

  // Views over time
  const viewsOverTime = await query(`
    SELECT DATE(viewed_at) as date, COUNT(*) as views
    FROM video_views vv
    JOIN videos v ON vv.video_id = v.id
    WHERE v.channel_id = ? AND vv.viewed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY DATE(viewed_at)
    ORDER BY date ASC
  `, [channel.id, days]);

  // Watch time
  const [watchTime] = await query(`
    SELECT SUM(watch_duration) as total_watch_time
    FROM video_views vv
    JOIN videos v ON vv.video_id = v.id
    WHERE v.channel_id = ? AND vv.viewed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
  `, [channel.id, days]);

  // Subscriber growth
  const subscriberGrowth = await query(`
    SELECT DATE(created_at) as date, COUNT(*) as new_subscribers
    FROM subscriptions
    WHERE channel_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `, [channel.id, days]);

  // Top videos
  const topVideos = await query(`
    SELECT v.id, v.title, v.thumbnail_url, v.view_count, v.like_count, v.published_at,
           COUNT(vv.id) as recent_views
    FROM videos v
    LEFT JOIN video_views vv ON v.id = vv.video_id AND vv.viewed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    WHERE v.channel_id = ? AND v.status = 'published'
    GROUP BY v.id
    ORDER BY recent_views DESC
    LIMIT 10
  `, [days, channel.id]);

  // Demographics
  const countries = await query(`
    SELECT country, COUNT(*) as views
    FROM video_views vv
    JOIN videos v ON vv.video_id = v.id
    WHERE v.channel_id = ? AND vv.viewed_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND country IS NOT NULL
    GROUP BY country
    ORDER BY views DESC
    LIMIT 10
  `, [channel.id, days]);

  const devices = await query(`
    SELECT device_type, COUNT(*) as views
    FROM video_views vv
    JOIN videos v ON vv.video_id = v.id
    WHERE v.channel_id = ? AND vv.viewed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY device_type
  `, [channel.id, days]);

  // Browser stats
  const browsers = await query(`
    SELECT browser, COUNT(*) as views
    FROM video_views vv
    JOIN videos v ON vv.video_id = v.id
    WHERE v.channel_id = ? AND vv.viewed_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND browser IS NOT NULL
    GROUP BY browser
    ORDER BY views DESC
    LIMIT 5
  `, [channel.id, days]);

  // Operating system stats
  const operatingSystems = await query(`
    SELECT os, COUNT(*) as views
    FROM video_views vv
    JOIN videos v ON vv.video_id = v.id
    WHERE v.channel_id = ? AND vv.viewed_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND os IS NOT NULL
    GROUP BY os
    ORDER BY views DESC
    LIMIT 5
  `, [channel.id, days]);

  // Unique viewers
  const [uniqueViewers] = await query(`
    SELECT COUNT(DISTINCT COALESCE(user_id, session_id)) as unique_viewers
    FROM video_views vv
    JOIN videos v ON vv.video_id = v.id
    WHERE v.channel_id = ? AND vv.viewed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
  `, [channel.id, days]);

  // New vs returning viewers
  const [viewerTypes] = await query(`
    SELECT 
      SUM(CASE WHEN is_returning = 0 THEN 1 ELSE 0 END) as new_viewers,
      SUM(CASE WHEN is_returning = 1 THEN 1 ELSE 0 END) as returning_viewers
    FROM video_views vv
    JOIN videos v ON vv.video_id = v.id
    WHERE v.channel_id = ? AND vv.viewed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
  `, [channel.id, days]);

  // Watch time by hour of day
  const viewsByHour = await query(`
    SELECT HOUR(viewed_at) as hour, COUNT(*) as views
    FROM video_views vv
    JOIN videos v ON vv.video_id = v.id
    WHERE v.channel_id = ? AND vv.viewed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY HOUR(viewed_at)
    ORDER BY hour
  `, [channel.id, days]);

  // Average watch duration
  const [avgWatchDuration] = await query(`
    SELECT AVG(watch_duration) as avg_duration
    FROM video_views vv
    JOIN videos v ON vv.video_id = v.id
    WHERE v.channel_id = ? AND vv.viewed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
  `, [channel.id, days]);

  // Subscriber count
  const [subscriberCount] = await query(`
    SELECT COUNT(*) as total_subscribers
    FROM subscriptions
    WHERE channel_id = ?
  `, [channel.id]);

  res.json({
    totals,
    viewsOverTime,
    watchTime: watchTime.total_watch_time || 0,
    subscriberGrowth,
    topVideos,
    demographics: { 
      countries, 
      devices, 
      browsers,
      operatingSystems 
    },
    audience: {
      uniqueViewers: uniqueViewers?.unique_viewers || 0,
      newViewers: viewerTypes?.new_viewers || 0,
      returningViewers: viewerTypes?.returning_viewers || 0,
      viewsByHour,
      avgWatchDuration: avgWatchDuration?.avg_duration || 0,
      totalSubscribers: subscriberCount?.total_subscribers || 0
    }
  });
}));

// Get video analytics
router.get('/video/:videoId', authenticate, asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { period = '28' } = req.query;
  const days = parseInt(period);

  // Verify ownership
  const [video] = await query(`
    SELECT v.*, c.user_id FROM videos v
    JOIN channels c ON v.channel_id = c.id
    WHERE v.id = ?
  `, [videoId]);

  if (!video || video.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  // Views over time
  const viewsOverTime = await query(`
    SELECT DATE(viewed_at) as date, COUNT(*) as views
    FROM video_views
    WHERE video_id = ? AND viewed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY DATE(viewed_at)
    ORDER BY date ASC
  `, [videoId, days]);

  // Watch time distribution
  const watchTimeDistribution = await query(`
    SELECT 
      CASE 
        WHEN watch_duration < 30 THEN '0-30s'
        WHEN watch_duration < 60 THEN '30s-1m'
        WHEN watch_duration < 180 THEN '1-3m'
        WHEN watch_duration < 600 THEN '3-10m'
        ELSE '10m+'
      END as duration_range,
      COUNT(*) as count
    FROM video_views
    WHERE video_id = ? AND viewed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY duration_range
  `, [videoId, days]);

  // Traffic sources
  const trafficSources = await query(`
    SELECT 
      CASE 
        WHEN referrer LIKE '%google%' THEN 'Google'
        WHEN referrer LIKE '%youtube%' THEN 'YouTube'
        WHEN referrer LIKE '%facebook%' THEN 'Facebook'
        WHEN referrer LIKE '%twitter%' THEN 'Twitter'
        WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
        ELSE 'Other'
      END as source,
      COUNT(*) as views
    FROM video_views
    WHERE video_id = ? AND viewed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY source
  `, [videoId, days]);

  // Average view duration
  const [avgDuration] = await query(`
    SELECT AVG(watch_duration) as avg_watch_time
    FROM video_views
    WHERE video_id = ? AND viewed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
  `, [videoId, days]);

  // Engagement
  const engagement = {
    views: video.view_count,
    likes: video.like_count,
    dislikes: video.dislike_count,
    comments: video.comment_count,
    shares: video.share_count,
    likeRatio: video.view_count > 0 ? ((video.like_count / video.view_count) * 100).toFixed(2) : 0
  };

  res.json({
    video: { id: video.id, title: video.title, publishedAt: video.published_at, duration: video.duration },
    viewsOverTime,
    watchTimeDistribution,
    trafficSources,
    avgWatchTime: avgDuration.avg_watch_time || 0,
    engagement
  });
}));

// Get revenue analytics
router.get('/revenue', authenticate, asyncHandler(async (req, res) => {
  const { period = '28' } = req.query;
  const days = parseInt(period);

  const [channel] = await query('SELECT id, is_monetized FROM channels WHERE user_id = ?', [req.user.id]);
  if (!channel) {
    return res.status(404).json({ error: 'Chaîne non trouvée' });
  }

  if (!channel.is_monetized) {
    return res.json({ message: 'Monétisation non activée', revenue: [] });
  }

  const revenue = await query(`
    SELECT DATE(created_at) as date, type, SUM(amount) as amount
    FROM revenue
    WHERE channel_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY DATE(created_at), type
    ORDER BY date ASC
  `, [channel.id, days]);

  const [totals] = await query(`
    SELECT 
      SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_paid,
      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as total_pending
    FROM revenue
    WHERE channel_id = ?
  `, [channel.id]);

  res.json({ revenue, totals });
}));

// Get real-time analytics
router.get('/realtime', authenticate, asyncHandler(async (req, res) => {
  const [channel] = await query('SELECT id FROM channels WHERE user_id = ?', [req.user.id]);
  if (!channel) {
    return res.status(404).json({ error: 'Chaîne non trouvée' });
  }

  // Views in last hour
  const [lastHour] = await query(`
    SELECT COUNT(*) as views
    FROM video_views vv
    JOIN videos v ON vv.video_id = v.id
    WHERE v.channel_id = ? AND vv.viewed_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
  `, [channel.id]);

  // Views per minute for last 30 minutes
  const viewsPerMinute = await query(`
    SELECT 
      DATE_FORMAT(viewed_at, '%H:%i') as minute,
      COUNT(*) as views
    FROM video_views vv
    JOIN videos v ON vv.video_id = v.id
    WHERE v.channel_id = ? AND vv.viewed_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
    GROUP BY minute
    ORDER BY minute ASC
  `, [channel.id]);

  // Currently watching (approximation)
  const [currentlyWatching] = await query(`
    SELECT COUNT(DISTINCT session_id) as count
    FROM video_views vv
    JOIN videos v ON vv.video_id = v.id
    WHERE v.channel_id = ? AND vv.viewed_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
  `, [channel.id]);

  res.json({
    viewsLastHour: lastHour.views,
    viewsPerMinute,
    currentlyWatching: currentlyWatching.count
  });
}));

// Get user dashboard data (storage, reports, etc.)
router.get('/dashboard', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get user storage info (with fallback for missing column)
  let storageLimit = 5368709120; // Default 5GB
  try {
    const [userStorage] = await query(`SELECT storage_limit FROM users WHERE id = ?`, [userId]);
    if (userStorage?.storage_limit) storageLimit = userStorage.storage_limit;
  } catch (e) {
    // Column doesn't exist, use default
  }

  // Get channel info
  const [channel] = await query('SELECT id FROM channels WHERE user_id = ?', [userId]);
  
  // Calculate actual storage used from videos
  let actualStorageUsed = 0;
  let videoCount = 0;
  if (channel) {
    const [storageCalc] = await query(`
      SELECT COALESCE(SUM(file_size), 0) as total_size, COUNT(*) as count
      FROM videos WHERE channel_id = ?
    `, [channel.id]);
    actualStorageUsed = storageCalc.total_size || 0;
    videoCount = storageCalc.count || 0;
  }

  // Get reported videos for this user's channel
  let reportedVideos = [];
  if (channel) {
    reportedVideos = await query(`
      SELECT r.id, r.reason, r.status, r.created_at, r.action_taken,
             v.id as video_id, v.title as video_title, v.thumbnail_url
      FROM reports r
      JOIN videos v ON r.content_id = v.id AND r.content_type = 'video'
      WHERE v.channel_id = ?
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [channel.id]);
  }

  // Count reports by status
  let reportStats = { pending: 0, reviewing: 0, resolved: 0, dismissed: 0 };
  if (channel) {
    const reportCounts = await query(`
      SELECT r.status, COUNT(*) as count
      FROM reports r
      JOIN videos v ON r.content_id = v.id AND r.content_type = 'video'
      WHERE v.channel_id = ?
      GROUP BY r.status
    `, [channel.id]);
    reportCounts.forEach(r => { reportStats[r.status] = r.count; });
  }

  // Get recent activity
  let recentActivity = [];
  if (channel) {
    // Recent comments on user's videos
    const recentComments = await query(`
      SELECT 'comment' as type, c.created_at, c.content as text, 
             u.username, v.title as video_title, v.id as video_id
      FROM comments c
      JOIN videos v ON c.video_id = v.id
      JOIN users u ON c.user_id = u.id
      WHERE v.channel_id = ? AND c.user_id != ?
      ORDER BY c.created_at DESC
      LIMIT 5
    `, [channel.id, userId]);

    // Recent subscribers
    const recentSubs = await query(`
      SELECT 'subscription' as type, s.created_at, u.username
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.channel_id = ?
      ORDER BY s.created_at DESC
      LIMIT 5
    `, [channel.id]);

    recentActivity = [...recentComments, ...recentSubs]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);
  }

  res.json({
    storage: {
      used: actualStorageUsed,
      limit: storageLimit,
      videoCount
    },
    reports: {
      stats: reportStats,
      recent: reportedVideos
    },
    recentActivity
  });
}));

module.exports = router;
