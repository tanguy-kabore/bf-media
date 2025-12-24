const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

// Get public platform settings (no auth required)
router.get('/settings', asyncHandler(async (req, res) => {
  const settings = await query('SELECT * FROM settings ORDER BY setting_key');
  
  // Convert to key-value object with only public settings
  const settingsObj = {};
  settings.forEach(s => {
    let value = s.setting_value;
    if (s.setting_type === 'boolean') {
      value = value === 'true';
    } else if (s.setting_type === 'number') {
      value = parseInt(value);
    }
    
    // Only expose public settings
    settingsObj[s.setting_key] = value;
  });
  
  res.json(settingsObj);
}));

module.exports = router;
