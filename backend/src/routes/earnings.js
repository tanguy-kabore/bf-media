const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid');
const earningsCalculator = require('../services/earningsCalculator');
const { getUserRealtimeEarnings } = require('../services/realtimeEarningsTracker');

// Get user's real-time earnings and stats
router.get('/realtime', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Vérifier si l'utilisateur est vérifié
  const [user] = await query('SELECT is_verified FROM users WHERE id = ?', [userId]);
  if (!user || !user.is_verified) {
    return res.status(403).json({ error: 'Compte non vérifié' });
  }

  // Utiliser le nouveau service de tracking en temps réel
  const stats = await getUserRealtimeEarnings(userId);
  res.json(stats);
}));

// Get user's weekly earnings history
router.get('/weekly', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const weeks = parseInt(req.query.weeks) || 12;

  const [user] = await query('SELECT is_verified FROM users WHERE id = ?', [userId]);
  if (!user || !user.is_verified) {
    return res.status(403).json({ error: 'Compte non vérifié' });
  }

  const weeklyData = await earningsCalculator.getUserWeeklyEarnings(userId, weeks);
  res.json({ weekly_earnings: weeklyData });
}));

// Get user's earnings summary
router.get('/summary', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Vérifier si l'utilisateur est vérifié
  const [user] = await query(
    'SELECT is_verified, total_earnings, pending_earnings, paid_earnings FROM users WHERE id = ?',
    [userId]
  );

  if (!user || !user.is_verified) {
    return res.status(403).json({ 
      error: 'Compte non vérifié',
      message: 'Vous devez avoir un compte vérifié pour accéder aux revenus'
    });
  }

  // Récupérer les statistiques détaillées
  const [stats] = await query(`
    SELECT 
      COUNT(*) as total_transactions,
      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
      SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_amount,
      SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_amount,
      SUM(CASE WHEN earning_type = 'view' THEN amount ELSE 0 END) as view_earnings,
      SUM(CASE WHEN earning_type = 'ad' THEN amount ELSE 0 END) as ad_earnings
    FROM user_earnings 
    WHERE user_id = ?
  `, [userId]);

  // Récupérer les revenus par semaine (dernières 12 semaines)
  const weeklyEarnings = await earningsCalculator.getUserWeeklyEarnings(userId, 12);

  // Statistiques temps réel
  const realTimeStats = await earningsCalculator.getUserRealTimeStats(userId);

  res.json({
    summary: {
      total_earnings: user.total_earnings || 0,
      pending_earnings: user.pending_earnings || 0,
      paid_earnings: user.paid_earnings || 0,
      available_for_withdrawal: stats.approved_amount || 0
    },
    stats: {
      total_transactions: stats.total_transactions || 0,
      view_earnings: stats.view_earnings || 0,
      ad_earnings: stats.ad_earnings || 0
    },
    weekly_earnings: weeklyEarnings,
    realtime: realTimeStats,
    rates: earningsCalculator.EARNING_RATES
  });
}));

// Get user's earnings history with pagination
router.get('/history', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const type = req.query.type; // filter by earning_type
  const status = req.query.status; // filter by status

  // Vérifier si l'utilisateur est vérifié
  const [user] = await query('SELECT is_verified FROM users WHERE id = ?', [userId]);
  if (!user || !user.is_verified) {
    return res.status(403).json({ error: 'Compte non vérifié' });
  }

  let whereClause = 'WHERE user_id = ?';
  const params = [userId];

  if (type) {
    whereClause += ' AND earning_type = ?';
    params.push(type);
  }

  if (status) {
    whereClause += ' AND status = ?';
    params.push(status);
  }

  // Compter le total
  const [countResult] = await query(
    `SELECT COUNT(*) as total FROM user_earnings ${whereClause}`,
    params
  );

  // Récupérer les revenus - simplement récupérer toutes les entrées
  // Les doublons ont été corrigés à la source avec la logique de session_id
  const earnings = await query(`
    SELECT 
      e.*,
      v.title as video_title,
      v.thumbnail_url as video_thumbnail
    FROM user_earnings e
    LEFT JOIN videos v ON e.video_id = v.id
    ${whereClause}
    ORDER BY e.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  res.json({
    earnings,
    pagination: {
      page,
      limit,
      total: countResult.total,
      pages: Math.ceil(countResult.total / limit)
    }
  });
}));

// Get user's payment history
router.get('/payments', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  // Vérifier si l'utilisateur est vérifié
  const [user] = await query('SELECT is_verified FROM users WHERE id = ?', [userId]);
  if (!user || !user.is_verified) {
    return res.status(403).json({ error: 'Compte non vérifié' });
  }

  const [countResult] = await query(
    'SELECT COUNT(*) as total FROM payments WHERE user_id = ?',
    [userId]
  );

  const payments = await query(`
    SELECT 
      p.*,
      u.username as paid_by_username,
      u.display_name as paid_by_name
    FROM payments p
    LEFT JOIN users u ON p.paid_by = u.id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `, [userId, limit, offset]);

  res.json({
    payments,
    pagination: {
      page,
      limit,
      total: countResult.total,
      pages: Math.ceil(countResult.total / limit)
    }
  });
}));

// Update bank/payment information
router.put('/payment-info', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    bank_account_name,
    bank_account_number,
    bank_name,
    mobile_money_number,
    mobile_money_provider
  } = req.body;

  await query(`
    UPDATE users SET
      bank_account_name = ?,
      bank_account_number = ?,
      bank_name = ?,
      mobile_money_number = ?,
      mobile_money_provider = ?
    WHERE id = ?
  `, [
    bank_account_name || null,
    bank_account_number || null,
    bank_name || null,
    mobile_money_number || null,
    mobile_money_provider || null,
    userId
  ]);

  res.json({ message: 'Informations de paiement mises à jour' });
}));

module.exports = router;
