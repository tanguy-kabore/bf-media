/**
 * Service de calcul des revenus pour les créateurs
 * 
 * Formules de calcul:
 * - Revenu par vue: 0.5 XOF par vue (ajustable)
 * - Revenu par minute de visionnage: 1 XOF par minute (ajustable)
 * - Bonus engagement: +10% si taux de rétention > 50%
 * 
 * Cycle de paiement: Hebdomadaire (lundi à dimanche)
 */

const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Configuration des taux de rémunération (en XOF)
const EARNING_RATES = {
  PER_VIEW: 0.5,           // XOF par vue
  PER_WATCH_MINUTE: 1,     // XOF par minute de visionnage
  ENGAGEMENT_BONUS: 0.10,  // 10% bonus si bonne rétention
  MIN_RETENTION_FOR_BONUS: 0.5, // 50% de rétention minimum pour le bonus
  MIN_PAYOUT: 1000         // Montant minimum pour un paiement (1000 XOF)
};

/**
 * Obtenir les bornes de la semaine (lundi-dimanche)
 */
function getWeekBounds(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lundi
  
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return { weekStart, weekEnd };
}

/**
 * Obtenir le numéro de semaine ISO
 */
function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

// Exporter les fonctions utilitaires
module.exports.getWeekBounds = getWeekBounds;
module.exports.getWeekNumber = getWeekNumber;

/**
 * Calculer les revenus d'un utilisateur pour une période donnée
 */
async function calculateUserEarnings(userId, startDate, endDate) {
  try {
    // Récupérer les statistiques de vues pour la période
    // Utiliser view_count de la table videos via channels
    const viewStats = await query(`
      SELECT 
        v.id as video_id,
        v.title as video_title,
        v.duration as video_duration,
        v.view_count as views,
        0 as total_watch_time,
        0 as avg_retention
      FROM videos v
      INNER JOIN channels c ON v.channel_id = c.id
      WHERE c.user_id = ? AND v.view_count > 0
    `, [userId]);
    
    if (!viewStats || viewStats.length === 0) {
      return {
        total_views: 0,
        total_watch_minutes: 0,
        total_earnings: 0,
        details: [],
        period: { start: startDate, end: endDate }
      };
    }

  let totalViews = 0;
  let totalWatchMinutes = 0;
  let totalEarnings = 0;
  const earningsDetails = [];

  for (const video of viewStats) {
    const views = parseInt(video.views) || 0;
    const watchMinutes = Math.floor((parseFloat(video.total_watch_time) || 0) / 60);
    const retention = parseFloat(video.avg_retention) || 0;

    // Calcul des revenus de base
    const viewEarnings = views * EARNING_RATES.PER_VIEW;
    const watchEarnings = watchMinutes * EARNING_RATES.PER_WATCH_MINUTE;
    let videoEarnings = viewEarnings + watchEarnings;

    // Bonus d'engagement si bonne rétention
    if (retention >= EARNING_RATES.MIN_RETENTION_FOR_BONUS) {
      videoEarnings *= (1 + EARNING_RATES.ENGAGEMENT_BONUS);
    }

    totalViews += views;
    totalWatchMinutes += watchMinutes;
    totalEarnings += videoEarnings;

    earningsDetails.push({
      video_id: video.video_id,
      video_title: video.video_title,
      views,
      watch_minutes: watchMinutes,
      retention: Math.round(retention * 100),
      earnings: Math.round(videoEarnings * 100) / 100
    });
  }

  return {
    total_views: totalViews,
    total_watch_minutes: totalWatchMinutes,
    total_earnings: Math.round(totalEarnings * 100) / 100,
    details: earningsDetails,
    period: {
      start: startDate,
      end: endDate
    }
  };
  } catch (error) {
    console.error('Error calculating user earnings:', error);
    return {
      total_views: 0,
      total_watch_minutes: 0,
      total_earnings: 0,
      details: [],
      period: { start: startDate, end: endDate }
    };
  }
}

/**
 * Calculer et enregistrer les revenus hebdomadaires pour tous les utilisateurs vérifiés
 */
async function calculateWeeklyEarnings(weekDate = new Date()) {
  const { weekStart, weekEnd } = getWeekBounds(weekDate);
  const weekNumber = getWeekNumber(weekDate);

  console.log(`Calculating earnings for week ${weekNumber} (${weekStart.toISOString()} - ${weekEnd.toISOString()})`);

  // Vérifier si les revenus de cette semaine ont déjà été calculés
  const [existingWeek] = await query(`
    SELECT COUNT(*) as count FROM user_earnings 
    WHERE description LIKE ? AND earning_type = 'view'
  `, [`%${weekNumber}%`]);

  if (existingWeek.count > 0) {
    console.log(`Week ${weekNumber} already calculated, skipping...`);
    return { message: 'Already calculated', week: weekNumber };
  }

  // Récupérer tous les utilisateurs vérifiés
  const verifiedUsers = await query(`
    SELECT id, username, display_name FROM users WHERE is_verified = TRUE
  `);

  const results = [];

  for (const user of verifiedUsers) {
    try {
      const earnings = await calculateUserEarnings(user.id, weekStart, weekEnd);

      if (earnings.total_earnings > 0) {
        // Créer un enregistrement de revenus pour les vues
        if (earnings.total_views > 0) {
          const viewEarningId = uuidv4();
          const viewAmount = earnings.total_views * EARNING_RATES.PER_VIEW;
          
          await query(`
            INSERT INTO user_earnings (id, user_id, earning_type, amount, description, status)
            VALUES (?, ?, 'view', ?, ?, 'pending')
          `, [viewEarningId, user.id, viewAmount, `Revenus vues - Semaine ${weekNumber} (${earnings.total_views} vues)`]);
        }

        // Créer un enregistrement pour le temps de visionnage
        if (earnings.total_watch_minutes > 0) {
          const watchEarningId = uuidv4();
          const watchAmount = earnings.total_watch_minutes * EARNING_RATES.PER_WATCH_MINUTE;
          
          await query(`
            INSERT INTO user_earnings (id, user_id, earning_type, amount, description, status)
            VALUES (?, ?, 'view', ?, ?, 'pending')
          `, [watchEarningId, user.id, watchAmount, `Revenus visionnage - Semaine ${weekNumber} (${earnings.total_watch_minutes} min)`]);
        }

        // Mettre à jour les totaux de l'utilisateur
        await query(`
          UPDATE users 
          SET total_earnings = total_earnings + ?,
              pending_earnings = pending_earnings + ?
          WHERE id = ?
        `, [earnings.total_earnings, earnings.total_earnings, user.id]);

        results.push({
          user_id: user.id,
          username: user.username,
          earnings: earnings.total_earnings,
          views: earnings.total_views,
          watch_minutes: earnings.total_watch_minutes
        });
      }
    } catch (error) {
      console.error(`Error calculating earnings for user ${user.id}:`, error);
    }
  }

  console.log(`Calculated earnings for ${results.length} users`);
  return { week: weekNumber, results };
}

/**
 * Obtenir les revenus d'un utilisateur par semaine
 */
async function getUserWeeklyEarnings(userId, weeks = 12) {
  const weeklyData = await query(`
    SELECT 
      YEARWEEK(created_at, 1) as year_week,
      MIN(DATE(created_at)) as week_start,
      SUM(amount) as total,
      SUM(CASE WHEN earning_type = 'view' THEN amount ELSE 0 END) as view_earnings,
      SUM(CASE WHEN earning_type = 'ad' THEN amount ELSE 0 END) as ad_earnings,
      COUNT(*) as transactions
    FROM user_earnings
    WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? WEEK)
    GROUP BY YEARWEEK(created_at, 1)
    ORDER BY year_week DESC
  `, [userId, weeks]);

  return weeklyData;
}

/**
 * Obtenir les statistiques en temps réel d'un utilisateur
 */
async function getUserRealTimeStats(userId) {
  try {
    // Statistiques globales
    const globalStatsResult = await query(`
      SELECT 
        COUNT(DISTINCT v.id) as total_videos,
        COALESCE(SUM(v.view_count), 0) as total_views,
        COALESCE(SUM(v.duration * v.view_count), 0) as potential_watch_time
      FROM videos v
      INNER JOIN channels c ON v.channel_id = c.id
      WHERE c.user_id = ?
    `, [userId]);
    
    const globalStats = globalStatsResult[0] || { total_videos: 0, total_views: 0, potential_watch_time: 0 };

    // Statistiques de la semaine en cours
    const { weekStart, weekEnd } = getWeekBounds();
    const currentWeekStats = await calculateUserEarnings(userId, weekStart, weekEnd);

    // Statistiques de la semaine précédente
    const lastWeekDate = new Date();
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const lastWeekBounds = getWeekBounds(lastWeekDate);
    const lastWeekStats = await calculateUserEarnings(userId, lastWeekBounds.weekStart, lastWeekBounds.weekEnd);

    // Calculer la tendance
    const trend = lastWeekStats.total_earnings > 0 
      ? ((currentWeekStats.total_earnings - lastWeekStats.total_earnings) / lastWeekStats.total_earnings) * 100 
      : 0;

    // Revenus estimés (projection basée sur la semaine en cours)
    const daysIntoWeek = Math.min(7, Math.ceil((new Date() - weekStart) / (1000 * 60 * 60 * 24)));
    const estimatedWeeklyEarnings = daysIntoWeek > 0 
      ? (currentWeekStats.total_earnings / daysIntoWeek) * 7 
      : 0;

    return {
      global: {
        total_videos: globalStats.total_videos || 0,
        total_views: globalStats.total_views || 0
      },
      current_week: {
      ...currentWeekStats,
      week_number: getWeekNumber(new Date()),
      days_completed: daysIntoWeek,
      estimated_total: Math.round(estimatedWeeklyEarnings * 100) / 100
    },
    last_week: {
      ...lastWeekStats,
      week_number: getWeekNumber(lastWeekDate)
    },
    trend: Math.round(trend * 10) / 10,
    rates: EARNING_RATES
  };
  } catch (error) {
    console.error('Error getting real-time stats:', error);
    return {
      global: { total_videos: 0, total_views: 0 },
      current_week: { total_views: 0, total_watch_minutes: 0, total_earnings: 0, week_number: getWeekNumber(new Date()), days_completed: 0, estimated_total: 0 },
      last_week: { total_views: 0, total_watch_minutes: 0, total_earnings: 0, week_number: '' },
      trend: 0,
      rates: EARNING_RATES
    };
  }
}

/**
 * Obtenir les paiements à effectuer cette semaine
 */
async function getPendingPayouts() {
  const users = await query(`
    SELECT 
      u.id,
      u.username,
      u.display_name,
      u.email,
      u.pending_earnings,
      u.bank_account_name,
      u.bank_account_number,
      u.bank_name,
      u.mobile_money_number,
      u.mobile_money_provider
    FROM users u
    WHERE u.is_verified = TRUE 
      AND u.pending_earnings >= ?
    ORDER BY u.pending_earnings DESC
  `, [EARNING_RATES.MIN_PAYOUT]);

  return users;
}

module.exports = {
  EARNING_RATES,
  getWeekBounds,
  getWeekNumber,
  calculateUserEarnings,
  calculateWeeklyEarnings,
  getUserWeeklyEarnings,
  getUserRealTimeStats,
  getPendingPayouts
};
