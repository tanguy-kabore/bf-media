const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { optionalAuth, authenticate } = require('../middleware/auth');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Ensure uploads/ads directory exists
const adsUploadDir = path.join(__dirname, '../../uploads/ads');
if (!fs.existsSync(adsUploadDir)) {
  fs.mkdirSync(adsUploadDir, { recursive: true });
}

// Configure multer for ad media uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, adsUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `ad-${uuidv4()}${ext}`);
  }
});

const uploadAdMedia = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Format non supporté. Utilisez: JPG, PNG, GIF, WEBP, MP4, WEBM'));
  }
});

// Upload ad media
router.post('/upload', authenticate, uploadAdMedia.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Fichier requis' });
  }
  const mediaUrl = `/uploads/ads/${req.file.filename}`;
  res.json({ url: mediaUrl, filename: req.file.filename });
}));

// Get active ads for a specific position
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { position = 'sidebar', limit = 5 } = req.query;
  
  const now = new Date().toISOString().split('T')[0];
  
  const ads = await query(`
    SELECT id, title, description, ad_type, media_url, target_url, position
    FROM ads 
    WHERE status = 'active' 
      AND position = ?
      AND (start_date IS NULL OR start_date <= ?)
      AND (end_date IS NULL OR end_date >= ?)
    ORDER BY priority DESC, RAND()
    LIMIT ?
  `, [position, now, now, parseInt(limit)]);
  
  res.json(ads);
}));

// Get a single ad by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const [ad] = await query(`
    SELECT id, title, description, ad_type, media_url, target_url, position
    FROM ads 
    WHERE id = ? AND status = 'active'
  `, [id]);
  
  if (!ad) {
    return res.status(404).json({ error: 'Publicité non trouvée' });
  }
  
  res.json(ad);
}));

// Record an impression
router.post('/:id/impression', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await query(`
    UPDATE ads 
    SET impressions = impressions + 1,
        revenue = revenue + (cpm / 1000)
    WHERE id = ?
  `, [id]);
  
  res.json({ success: true });
}));

// Record a click
router.post('/:id/click', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Get ad to return target URL
  const [ad] = await query('SELECT target_url FROM ads WHERE id = ?', [id]);
  
  if (!ad) {
    return res.status(404).json({ error: 'Publicité non trouvée' });
  }
  
  await query(`
    UPDATE ads 
    SET clicks = clicks + 1
    WHERE id = ?
  `, [id]);
  
  res.json({ success: true, target_url: ad.target_url });
}));

module.exports = router;
