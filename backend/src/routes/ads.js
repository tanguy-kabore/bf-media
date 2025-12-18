const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { optionalAuth } = require('../middleware/auth');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

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
