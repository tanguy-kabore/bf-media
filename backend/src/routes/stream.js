const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const { optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const crypto = require('crypto-js');

const CHUNK_SIZE = parseInt(process.env.STREAMING_CHUNK_SIZE) || 1024 * 1024; // 1MB

// Stream video with range support
router.get('/:videoId', optionalAuth, asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { quality = 'auto' } = req.query;

  const [video] = await query(`
    SELECT v.video_url, v.status, v.visibility, v.drm_protected, c.user_id
    FROM videos v
    JOIN channels c ON v.channel_id = c.id
    WHERE v.id = ?
  `, [videoId]);

  if (!video || video.status !== 'published') {
    return res.status(404).json({ error: 'Vidéo non trouvée' });
  }

  if (video.visibility === 'private') {
    if (!req.user || req.user.id !== video.user_id) {
      return res.status(403).json({ error: 'Vidéo privée' });
    }
  }

  // Get video file path
  let videoPath;
  if (quality !== 'auto') {
    const [qualityVersion] = await query(
      'SELECT video_url FROM video_qualities WHERE video_id = ? AND quality = ?',
      [videoId, quality]
    );
    videoPath = qualityVersion ? path.join(__dirname, '../..', qualityVersion.video_url) : null;
  }

  if (!videoPath) {
    videoPath = path.join(__dirname, '../..', video.video_url);
  }

  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ error: 'Fichier vidéo non trouvé' });
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + CHUNK_SIZE, fileSize - 1);
    const chunkSize = end - start + 1;

    const file = fs.createReadStream(videoPath, { start, end });
    
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
      'Cache-Control': 'public, max-age=3600'
    });

    file.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600'
    });

    fs.createReadStream(videoPath).pipe(res);
  }
}));

// Get HLS master playlist
router.get('/:videoId/hls/master.m3u8', optionalAuth, asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const [video] = await query('SELECT status, visibility FROM videos WHERE id = ?', [videoId]);
  if (!video || video.status !== 'published') {
    return res.status(404).json({ error: 'Vidéo non trouvée' });
  }

  const hlsPath = path.join(__dirname, '../../uploads/hls', videoId, 'master.m3u8');
  
  if (!fs.existsSync(hlsPath)) {
    return res.status(404).json({ error: 'HLS non disponible' });
  }

  res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  fs.createReadStream(hlsPath).pipe(res);
}));

// Get HLS segment
router.get('/:videoId/hls/:quality/:segment', optionalAuth, asyncHandler(async (req, res) => {
  const { videoId, quality, segment } = req.params;

  const segmentPath = path.join(__dirname, '../../uploads/hls', videoId, quality, segment);
  
  if (!fs.existsSync(segmentPath)) {
    return res.status(404).json({ error: 'Segment non trouvé' });
  }

  const contentType = segment.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  fs.createReadStream(segmentPath).pipe(res);
}));

// Get available qualities for a video
router.get('/:videoId/qualities', asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const qualities = await query(`
    SELECT quality, width, height, bitrate
    FROM video_qualities
    WHERE video_id = ?
    ORDER BY height DESC
  `, [videoId]);

  // Always include original
  const [original] = await query('SELECT resolution FROM videos WHERE id = ?', [videoId]);
  
  res.json({
    qualities,
    original: original?.resolution,
    hasHLS: fs.existsSync(path.join(__dirname, '../../uploads/hls', videoId, 'master.m3u8'))
  });
}));

// Generate signed URL for DRM protected content
router.get('/:videoId/signed-url', optionalAuth, asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const [video] = await query('SELECT drm_protected FROM videos WHERE id = ?', [videoId]);
  if (!video) {
    return res.status(404).json({ error: 'Vidéo non trouvée' });
  }

  // Generate signed URL with expiration
  const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour
  const signature = crypto.HmacSHA256(
    `${videoId}:${expiresAt}:${req.user?.id || 'anonymous'}`,
    process.env.DRM_SECRET_KEY || 'secret'
  ).toString();

  res.json({
    url: `/api/stream/${videoId}?expires=${expiresAt}&sig=${signature}`,
    expiresAt
  });
}));

module.exports = router;
