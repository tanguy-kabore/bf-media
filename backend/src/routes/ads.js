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

// Get active ads for a specific position with targeting
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { position = 'sidebar', limit = 5, country, device, category } = req.query;
  
  const now = new Date().toISOString().split('T')[0];
  
  // Get all potentially active ads for this position
  const allAds = await query(`
    SELECT id, title, description, ad_type, media_url, target_url, position,
           target_countries, target_devices, target_categories, budget, revenue
    FROM ads 
    WHERE status = 'active' 
      AND position = ?
      AND (start_date IS NULL OR start_date <= ?)
      AND (end_date IS NULL OR end_date >= ?)
      AND (budget = 0 OR budget > revenue)
    ORDER BY priority DESC, RAND()
  `, [position, now, now]);
  
  // Filter ads based on targeting
  const filteredAds = allAds.filter(ad => {
    // Parse targeting arrays
    let targetCountries = [];
    let targetDevices = [];
    let targetCategories = [];
    
    try {
      targetCountries = JSON.parse(ad.target_countries || '[]');
      targetDevices = JSON.parse(ad.target_devices || '[]');
      targetCategories = JSON.parse(ad.target_categories || '[]');
    } catch (e) {
      // If parsing fails, no targeting = show to everyone
    }
    
    // Country targeting
    if (targetCountries.length > 0 && country) {
      if (!targetCountries.includes(country)) return false;
    }
    
    // Device targeting
    if (targetDevices.length > 0 && device) {
      if (!targetDevices.includes(device)) return false;
    }
    
    // Category targeting
    if (targetCategories.length > 0 && category) {
      if (!targetCategories.includes(category)) return false;
    }
    
    return true;
  });
  
  // Return only needed fields, limited
  const result = filteredAds.slice(0, parseInt(limit)).map(ad => ({
    id: ad.id,
    title: ad.title,
    description: ad.description,
    ad_type: ad.ad_type,
    media_url: ad.media_url,
    target_url: ad.target_url,
    position: ad.position
  }));
  
  res.json(result);
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
