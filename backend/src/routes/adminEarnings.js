const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, isAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid');
const earningsCalculator = require('../services/earningsCalculator');

// Trigger weekly earnings calculation (admin only)
router.post('/calculate-weekly', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { week_date } = req.body; // Optional: specific date for the week to calculate
  
  const targetDate = week_date ? new Date(week_date) : new Date();
  const result = await earningsCalculator.calculateWeeklyEarnings(targetDate);
  
  res.json({
    message: 'Calcul des revenus hebdomadaires effectué',
    ...result
  });
}));

// Get pending payouts
router.get('/pending-payouts', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const pendingPayouts = await earningsCalculator.getPendingPayouts();
  
  const totalPending = pendingPayouts.reduce((sum, u) => sum + parseFloat(u.pending_earnings || 0), 0);
  
  res.json({
    users: pendingPayouts,
    total_pending: totalPending,
    min_payout: earningsCalculator.EARNING_RATES.MIN_PAYOUT
  });
}));

// Get earning rates configuration
router.get('/rates', authenticate, isAdmin, asyncHandler(async (req, res) => {
  res.json({ rates: earningsCalculator.EARNING_RATES });
}));

// Update earning rates configuration
router.put('/rates', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { per_view, per_watch_minute, engagement_bonus, min_retention_for_bonus, min_payout } = req.body;
  
  // Valider les valeurs
  if (per_view !== undefined && (per_view < 0 || per_view > 100)) {
    return res.status(400).json({ error: 'Taux par vue invalide (0-100 XOF)' });
  }
  if (per_watch_minute !== undefined && (per_watch_minute < 0 || per_watch_minute > 100)) {
    return res.status(400).json({ error: 'Taux par minute invalide (0-100 XOF)' });
  }
  if (engagement_bonus !== undefined && (engagement_bonus < 0 || engagement_bonus > 1)) {
    return res.status(400).json({ error: 'Bonus invalide (0-1)' });
  }
  if (min_retention_for_bonus !== undefined && (min_retention_for_bonus < 0 || min_retention_for_bonus > 1)) {
    return res.status(400).json({ error: 'Rétention minimale invalide (0-1)' });
  }
  if (min_payout !== undefined && (min_payout < 0 || min_payout > 100000)) {
    return res.status(400).json({ error: 'Seuil de paiement invalide' });
  }
  
  // Mettre à jour les taux
  if (per_view !== undefined) earningsCalculator.EARNING_RATES.PER_VIEW = per_view;
  if (per_watch_minute !== undefined) earningsCalculator.EARNING_RATES.PER_WATCH_MINUTE = per_watch_minute;
  if (engagement_bonus !== undefined) earningsCalculator.EARNING_RATES.ENGAGEMENT_BONUS = engagement_bonus;
  if (min_retention_for_bonus !== undefined) earningsCalculator.EARNING_RATES.MIN_RETENTION_FOR_BONUS = min_retention_for_bonus;
  if (min_payout !== undefined) earningsCalculator.EARNING_RATES.MIN_PAYOUT = min_payout;
  
  res.json({ 
    message: 'Taux mis à jour avec succès',
    rates: earningsCalculator.EARNING_RATES 
  });
}));

// Calculate earnings for a specific user (manual trigger)
router.post('/calculate-user/:userId', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  // Vérifier que l'utilisateur existe et est vérifié
  const [user] = await query('SELECT is_verified FROM users WHERE id = ?', [userId]);
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }
  if (!user.is_verified) {
    return res.status(403).json({ error: 'L\'utilisateur doit être vérifié' });
  }
  
  // Calculer les revenus de la semaine en cours
  const { weekStart, weekEnd } = earningsCalculator.getWeekBounds();
  const weekNumber = earningsCalculator.getWeekNumber(new Date());
  
  // Vérifier si cette semaine a déjà été calculée
  const [existing] = await query(
    'SELECT id FROM weekly_earnings WHERE user_id = ? AND week_number = ?',
    [userId, weekNumber]
  );
  
  if (existing) {
    return res.status(400).json({ error: 'Les revenus de cette semaine ont déjà été calculés' });
  }
  
  const earnings = await earningsCalculator.calculateUserEarnings(userId, weekStart, weekEnd);
  
  if (earnings.total_earnings > 0) {
    // Enregistrer les revenus hebdomadaires
    const weeklyId = require('uuid').v4();
    await query(`
      INSERT INTO weekly_earnings (
        id, user_id, week_number, week_start, week_end,
        total_views, total_watch_minutes, total_earnings,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `, [
      weeklyId, userId, weekNumber, weekStart, weekEnd,
      earnings.total_views, earnings.total_watch_minutes, earnings.total_earnings
    ]);
    
    // Créer des entrées user_earnings pour chaque vidéo
    for (const detail of earnings.details) {
      const earningId = require('uuid').v4();
      await query(`
        INSERT INTO user_earnings (
          id, user_id, video_id, amount, earning_type,
          views, watch_minutes, status, created_at
        ) VALUES (?, ?, ?, ?, 'view', ?, ?, 'pending', NOW())
      `, [earningId, userId, detail.video_id, detail.earnings, detail.views, detail.watch_minutes]);
    }
    
    // Mettre à jour les totaux de l'utilisateur
    await query(`
      UPDATE users 
      SET total_earnings = total_earnings + ?,
          pending_earnings = pending_earnings + ?
      WHERE id = ?
    `, [earnings.total_earnings, earnings.total_earnings, userId]);
  }
  
  res.json({
    message: 'Revenus calculés avec succès',
    week_number: weekNumber,
    earnings
  });
}));

// Get all users with earnings (for admin)
router.get('/users', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const verified = req.query.verified; // filter by verification status
  const search = req.query.search; // search by username/email

  let whereClause = 'WHERE is_verified = TRUE';
  const params = [];

  if (verified !== undefined) {
    whereClause = verified === 'true' ? 'WHERE is_verified = TRUE' : 'WHERE is_verified = FALSE';
  }

  if (search) {
    whereClause += whereClause === 'WHERE is_verified = TRUE' ? ' AND' : ' WHERE';
    whereClause += ' (username LIKE ? OR email LIKE ? OR display_name LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const [countResult] = await query(
    `SELECT COUNT(*) as total FROM users ${whereClause}`,
    params
  );

  const users = await query(`
    SELECT 
      id,
      username,
      email,
      display_name,
      avatar_url,
      is_verified,
      verification_date,
      total_earnings,
      pending_earnings,
      paid_earnings,
      bank_account_name,
      bank_account_number,
      bank_name,
      mobile_money_number,
      mobile_money_provider,
      created_at
    FROM users
    ${whereClause}
    ORDER BY total_earnings DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  // Récupérer les statistiques de paiement pour chaque utilisateur
  for (let user of users) {
    const [stats] = await query(`
      SELECT 
        COUNT(*) as pending_payments,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount
      FROM payments
      WHERE user_id = ? AND status = 'pending'
    `, [user.id]);
    
    user.pending_payments = stats.pending_payments || 0;
    user.pending_payment_amount = stats.pending_amount || 0;
  }

  res.json({
    users,
    pagination: {
      page,
      limit,
      total: countResult.total,
      pages: Math.ceil(countResult.total / limit)
    }
  });
}));

// Get earnings statistics (dashboard)
router.get('/stats', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const [totalStats] = await query(`
    SELECT 
      COUNT(DISTINCT user_id) as total_creators,
      SUM(amount) as total_earnings,
      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_earnings,
      SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_earnings,
      SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_earnings
    FROM user_earnings
  `);

  const [paymentStats] = await query(`
    SELECT 
      COUNT(*) as total_payments,
      SUM(amount) as total_paid,
      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_payments,
      SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as completed_payments
    FROM payments
  `);

  const [verifiedUsers] = await query(`
    SELECT COUNT(*) as count FROM users WHERE is_verified = TRUE
  `);

  res.json({
    creators: {
      total: totalStats.total_creators || 0,
      verified: verifiedUsers.count || 0
    },
    earnings: {
      total: totalStats.total_earnings || 0,
      pending: totalStats.pending_earnings || 0,
      approved: totalStats.approved_earnings || 0,
      paid: totalStats.paid_earnings || 0
    },
    payments: {
      total: paymentStats.total_payments || 0,
      total_paid: paymentStats.total_paid || 0,
      pending: paymentStats.pending_payments || 0,
      completed: paymentStats.completed_payments || 0
    }
  });
}));

// Verify a user account
router.post('/verify/:userId', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  await query(`
    UPDATE users 
    SET is_verified = TRUE, verification_date = NOW()
    WHERE id = ?
  `, [userId]);

  res.json({ message: 'Utilisateur vérifié avec succès' });
}));

// Unverify a user account
router.post('/unverify/:userId', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  await query(`
    UPDATE users 
    SET is_verified = FALSE, verification_date = NULL
    WHERE id = ?
  `, [userId]);

  res.json({ message: 'Vérification révoquée' });
}));

// Create a payment for a user
router.post('/pay/:userId', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { amount, payment_method, payment_reference, notes } = req.body;
  const adminId = req.user.id;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Montant invalide' });
  }

  // Vérifier que l'utilisateur existe et est vérifié
  const [user] = await query(
    'SELECT is_verified, pending_earnings FROM users WHERE id = ?',
    [userId]
  );

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }

  if (!user.is_verified) {
    return res.status(403).json({ error: 'L\'utilisateur doit être vérifié' });
  }

  const paymentId = uuidv4();
  const transactionId = uuidv4();

  // Créer le paiement
  await query(`
    INSERT INTO payments (
      id, user_id, amount, payment_method, payment_reference, 
      status, notes, paid_by, paid_at
    ) VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, NOW())
  `, [paymentId, userId, amount, payment_method || 'bank_transfer', payment_reference, notes, adminId]);

  // Créer la transaction
  await query(`
    INSERT INTO payment_transactions (
      id, payment_id, user_id, amount, transaction_type, 
      description, created_by
    ) VALUES (?, ?, ?, ?, 'payment', ?, ?)
  `, [transactionId, paymentId, userId, amount, `Paiement effectué par l'admin`, adminId]);

  // Mettre à jour les revenus de l'utilisateur
  await query(`
    UPDATE users 
    SET paid_earnings = paid_earnings + ?,
        pending_earnings = GREATEST(pending_earnings - ?, 0)
    WHERE id = ?
  `, [amount, amount, userId]);

  // Marquer les revenus comme payés (jusqu'au montant payé)
  await query(`
    UPDATE user_earnings 
    SET status = 'paid', updated_at = NOW()
    WHERE user_id = ? AND status = 'approved'
    ORDER BY created_at ASC
    LIMIT ?
  `, [userId, Math.ceil(amount / 10)]); // Approximation

  res.json({ 
    message: 'Paiement effectué avec succès',
    payment_id: paymentId
  });
}));

// Pay multiple users at once
router.post('/pay-multiple', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { user_ids, payment_method, notes } = req.body;
  const adminId = req.user.id;

  if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
    return res.status(400).json({ error: 'Liste d\'utilisateurs invalide' });
  }

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (const userId of user_ids) {
    try {
      // Récupérer le montant à payer (revenus approuvés)
      const [earnings] = await query(`
        SELECT SUM(amount) as total
        FROM user_earnings
        WHERE user_id = ? AND status = 'approved'
      `, [userId]);

      const amount = earnings.total || 0;

      if (amount <= 0) {
        results.push({ user_id: userId, success: false, error: 'Aucun revenu à payer' });
        failCount++;
        continue;
      }

      // Vérifier que l'utilisateur est vérifié
      const [user] = await query('SELECT is_verified FROM users WHERE id = ?', [userId]);
      if (!user || !user.is_verified) {
        results.push({ user_id: userId, success: false, error: 'Utilisateur non vérifié' });
        failCount++;
        continue;
      }

      const paymentId = uuidv4();
      const transactionId = uuidv4();

      // Créer le paiement
      await query(`
        INSERT INTO payments (
          id, user_id, amount, payment_method, status, notes, paid_by, paid_at
        ) VALUES (?, ?, ?, ?, 'completed', ?, ?, NOW())
      `, [paymentId, userId, amount, payment_method || 'bank_transfer', notes, adminId]);

      // Créer la transaction
      await query(`
        INSERT INTO payment_transactions (
          id, payment_id, user_id, amount, transaction_type, description, created_by
        ) VALUES (?, ?, ?, ?, 'payment', ?, ?)
      `, [transactionId, paymentId, userId, amount, 'Paiement groupé', adminId]);

      // Mettre à jour les revenus
      await query(`
        UPDATE users 
        SET paid_earnings = paid_earnings + ?,
            pending_earnings = GREATEST(pending_earnings - ?, 0)
        WHERE id = ?
      `, [amount, amount, userId]);

      // Marquer les revenus comme payés
      await query(`
        UPDATE user_earnings 
        SET status = 'paid', updated_at = NOW()
        WHERE user_id = ? AND status = 'approved'
      `, [userId]);

      results.push({ user_id: userId, success: true, amount, payment_id: paymentId });
      successCount++;
    } catch (error) {
      console.error(`Error paying user ${userId}:`, error);
      results.push({ user_id: userId, success: false, error: error.message });
      failCount++;
    }
  }

  res.json({
    message: `Paiements effectués: ${successCount} réussis, ${failCount} échoués`,
    success_count: successCount,
    fail_count: failCount,
    results
  });
}));

// Get user's detailed earnings (for admin)
router.get('/user/:userId/earnings', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  const [countResult] = await query(
    'SELECT COUNT(*) as total FROM user_earnings WHERE user_id = ?',
    [userId]
  );

  const earnings = await query(`
    SELECT 
      e.*,
      v.title as video_title
    FROM user_earnings e
    LEFT JOIN videos v ON e.video_id = v.id
    WHERE e.user_id = ?
    ORDER BY e.created_at DESC
    LIMIT ? OFFSET ?
  `, [userId, limit, offset]);

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

// Approve earnings (change status from pending to approved)
router.post('/approve/:userId', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Approuver tous les revenus en attente
  const result = await query(`
    UPDATE user_earnings 
    SET status = 'approved', updated_at = NOW()
    WHERE user_id = ? AND status = 'pending'
  `, [userId]);

  // Recalculer les totaux
  const [totals] = await query(`
    SELECT 
      SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending
    FROM user_earnings
    WHERE user_id = ?
  `, [userId]);

  await query(`
    UPDATE users 
    SET pending_earnings = ?
    WHERE id = ?
  `, [totals.approved || 0, userId]);

  res.json({ 
    message: 'Revenus approuvés',
    affected_rows: result.affectedRows
  });
}));

module.exports = router;
