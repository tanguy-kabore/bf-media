/**
 * Routes API pour les revenus en temps réel
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { getUserRealtimeEarnings } = require('../services/realtimeEarningsTracker');

/**
 * GET /api/earnings/realtime
 * Obtenir les revenus en temps réel de l'utilisateur connecté
 */
router.get('/realtime', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const earnings = await getUserRealtimeEarnings(userId);
  res.json(earnings);
}));

module.exports = router;
