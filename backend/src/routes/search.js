const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Search videos, channels, playlists
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { q, type = 'all', sort = 'relevance', page = 1, limit = 20, duration, uploadDate, category } = req.query;
  const offset = (page - 1) * limit;

  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: 'Terme de recherche requis' });
  }

  const searchTerm = `%${q.trim()}%`;
  const results = { videos: [], channels: [], playlists: [] };

  // Search videos
  if (type === 'all' || type === 'video') {
    let videoQuery = `
      SELECT v.id, v.title, v.description, v.thumbnail_url, v.duration, v.view_count,
             v.published_at, v.created_at,
             c.id as channel_id, c.name as channel_name, c.handle as channel_handle,
             COALESCE(c.avatar_url, u.avatar_url) as channel_avatar, u.is_verified as channel_verified,
             MATCH(v.title, v.description) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE v.status = 'published' AND v.visibility = 'public'
        AND (v.title LIKE ? OR v.description LIKE ? OR MATCH(v.title, v.description) AGAINST(? IN NATURAL LANGUAGE MODE))
    `;
    const videoParams = [q, searchTerm, searchTerm, q];

    // Duration filter
    if (duration === 'short') {
      videoQuery += ' AND v.duration < 240';
    } else if (duration === 'medium') {
      videoQuery += ' AND v.duration >= 240 AND v.duration <= 1200';
    } else if (duration === 'long') {
      videoQuery += ' AND v.duration > 1200';
    }

    // Upload date filter
    if (uploadDate === 'hour') {
      videoQuery += ' AND v.published_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)';
    } else if (uploadDate === 'today') {
      videoQuery += ' AND v.published_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)';
    } else if (uploadDate === 'week') {
      videoQuery += ' AND v.published_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK)';
    } else if (uploadDate === 'month') {
      videoQuery += ' AND v.published_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
    } else if (uploadDate === 'year') {
      videoQuery += ' AND v.published_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
    }

    // Category filter
    if (category) {
      videoQuery += ' AND v.category_id = ?';
      videoParams.push(category);
    }

    // Sorting
    if (sort === 'relevance') {
      videoQuery += ' ORDER BY relevance DESC, v.view_count DESC';
    } else if (sort === 'date') {
      videoQuery += ' ORDER BY v.published_at DESC';
    } else if (sort === 'views') {
      videoQuery += ' ORDER BY v.view_count DESC';
    } else if (sort === 'rating') {
      videoQuery += ' ORDER BY v.like_count DESC';
    }

    videoQuery += ' LIMIT ? OFFSET ?';
    videoParams.push(parseInt(limit), parseInt(offset));

    results.videos = await query(videoQuery, videoParams);
  }

  // Search channels
  if (type === 'all' || type === 'channel') {
    results.channels = await query(`
      SELECT id, name, handle, description, avatar_url, banner_url,
             subscriber_count, video_count, is_verified
      FROM channels
      WHERE name LIKE ? OR handle LIKE ? OR description LIKE ?
      ORDER BY subscriber_count DESC
      LIMIT ?
    `, [searchTerm, searchTerm, searchTerm, type === 'channel' ? parseInt(limit) : 5]);
  }

  // Search playlists
  if (type === 'all' || type === 'playlist') {
    results.playlists = await query(`
      SELECT p.id, p.title, p.description, p.thumbnail_url, p.video_count,
             c.name as channel_name, c.handle as channel_handle
      FROM playlists p
      JOIN channels c ON p.channel_id = c.id
      WHERE p.visibility = 'public' AND (p.title LIKE ? OR p.description LIKE ?)
      ORDER BY p.video_count DESC
      LIMIT ?
    `, [searchTerm, searchTerm, type === 'playlist' ? parseInt(limit) : 5]);
  }

  res.json(results);
}));

// Get search suggestions
router.get('/suggestions', asyncHandler(async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.trim().length < 2) {
    return res.json([]);
  }

  const searchTerm = `${q.trim()}%`;

  // Get video title suggestions
  const videos = await query(`
    SELECT DISTINCT title as suggestion, 'video' as type
    FROM videos
    WHERE status = 'published' AND visibility = 'public' AND title LIKE ?
    LIMIT 5
  `, [searchTerm]);

  // Get channel name suggestions
  const channels = await query(`
    SELECT DISTINCT name as suggestion, 'channel' as type
    FROM channels
    WHERE name LIKE ?
    LIMIT 3
  `, [searchTerm]);

  // Get popular tags
  const tags = await query(`
    SELECT name as suggestion, 'tag' as type
    FROM tags
    WHERE name LIKE ?
    ORDER BY usage_count DESC
    LIMIT 3
  `, [searchTerm]);

  res.json([...videos, ...channels, ...tags]);
}));

// Get trending searches
router.get('/trending', asyncHandler(async (req, res) => {
  const trending = await query(`
    SELECT t.name, t.slug, t.usage_count
    FROM tags t
    ORDER BY t.usage_count DESC
    LIMIT 10
  `);

  res.json(trending);
}));

module.exports = router;
