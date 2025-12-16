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

  res.json({
    totals,
    viewsOverTime,
    watchTime: watchTime.total_watch_time || 0,
    subscriberGrowth,
    topVideos,
    demographics: { countries, devices }
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

module.exports = router;
