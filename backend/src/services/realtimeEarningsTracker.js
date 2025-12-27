/**
 * Service de suivi des revenus en temps réel
 * Mise à jour automatique des revenus à chaque vue/engagement
 */

const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Taux de rémunération
const EARNING_RATES = {
  PER_VIEW: 0.5,                    // 0.5 XOF par vue
  PER_WATCH_MINUTE: 1,              // 1 XOF par minute
  ENGAGEMENT_BONUS: 0.1,            // +10% bonus si rétention >= 50%
  MIN_RETENTION_FOR_BONUS: 0.5,    // 50% de rétention minimum
  MIN_PAYOUT: 1000,                 // 1000 XOF minimum pour paiement
  // Bonus d'engagement
  PER_LIKE: 0.1,                    // 0.1 XOF par like
  PER_COMMENT: 0.5,                 // 0.5 XOF par commentaire
  PER_SHARE: 1.0                    // 1 XOF par partage
};

/**
 * Calculer et enregistrer les revenus pour une vue de vidéo
 * Appelé automatiquement à chaque vue
 */
async function trackVideoView(videoId, userId, watchTimeSeconds = 0) {
  try {
    // Récupérer les infos de la vidéo et du créateur
    const [videoData] = await query(`
      SELECT 
        v.id,
        v.title,
        v.duration,
        v.view_count,
        c.user_id as creator_id,
        u.is_verified
      FROM videos v
      INNER JOIN channels c ON v.channel_id = c.id
      INNER JOIN users u ON c.user_id = u.id
      WHERE v.id = ?
    `, [videoId]);

    if (!videoData || !videoData.is_verified) {
      // Pas de revenus pour les utilisateurs non vérifiés
      return null;
    }

    const creatorId = videoData.creator_id;
    const duration = parseInt(videoData.duration) || 0;
    
    // Récupérer le vrai watch_duration depuis watch_sessions (tracker temps réel)
    // watch_sessions est mis à jour automatiquement toutes les 5 secondes pendant le visionnage
    // Si userId est fourni, chercher la session de cet utilisateur spécifique
    let watchSession;
    if (userId) {
      [watchSession] = await query(`
        SELECT watch_duration, watch_percentage, session_id
        FROM watch_sessions
        WHERE video_id = ? AND channel_owner_id = ? AND user_id = ?
        ORDER BY started_at DESC
        LIMIT 1
      `, [videoId, creatorId, userId]);
    } else {
      // Fallback: chercher la dernière session pour cette vidéo
      [watchSession] = await query(`
        SELECT watch_duration, watch_percentage, session_id
        FROM watch_sessions
        WHERE video_id = ? AND channel_owner_id = ?
        ORDER BY started_at DESC
        LIMIT 1
      `, [videoId, creatorId]);
    }
    
    const actualWatchTime = watchSession?.watch_duration || watchTimeSeconds || 0;
    
    // NE JAMAIS utiliser d'estimation - seulement les vraies données du tracker
    // Si pas de données, ne pas créer de revenu pour le temps de visionnage
    if (actualWatchTime === 0) {
      console.log(`No watch duration data for video ${videoId}, skipping watch time earnings`);
      return null;
    }
    
    // Calculer le temps de visionnage réel depuis le tracker
    const watchMinutes = Math.floor(actualWatchTime / 60);
    const retention = duration > 0 ? Math.min(actualWatchTime / duration, 1) : 0;

    // Calculer les revenus pour cette vue
    const viewEarnings = EARNING_RATES.PER_VIEW;
    const watchEarnings = watchMinutes * EARNING_RATES.PER_WATCH_MINUTE;
    let totalEarnings = viewEarnings + watchEarnings;

    // Bonus d'engagement si bonne rétention
    if (retention >= EARNING_RATES.MIN_RETENTION_FOR_BONUS) {
      totalEarnings *= (1 + EARNING_RATES.ENGAGEMENT_BONUS);
    }

    // Arrondir à 2 décimales
    totalEarnings = Math.round(totalEarnings * 100) / 100;

    // Vérifier si un revenu existe déjà pour cette session spécifique
    // Chaque spectateur (session) doit générer son propre revenu
    const sessionId = watchSession?.session_id;
    let existingEarning = null;
    
    if (sessionId) {
      // Chercher un revenu pour cette session spécifique via session_id
      [existingEarning] = await query(`
        SELECT id, amount 
        FROM user_earnings
        WHERE user_id = ?
          AND video_id = ?
          AND session_id = ?
          AND earning_type = 'view'
        ORDER BY created_at DESC
        LIMIT 1
      `, [creatorId, videoId, sessionId]);
    }

    if (existingEarning) {
      // Mettre à jour le revenu existant
      const oldAmount = parseFloat(existingEarning.amount) || 0;
      const amountDiff = totalEarnings - oldAmount;
      
      await query(`
        UPDATE user_earnings
        SET amount = ?,
            description = ?
        WHERE id = ?
      `, [
        totalEarnings,
        `Vue - ${watchMinutes} min (${Math.round(retention * 100)}% rétention)`,
        existingEarning.id
      ]);

      // Mettre à jour les totaux avec la différence
      if (amountDiff !== 0) {
        await query(`
          UPDATE users 
          SET total_earnings = total_earnings + ?,
              pending_earnings = pending_earnings + ?
          WHERE id = ?
        `, [amountDiff, amountDiff, creatorId]);
      }

      return {
        earningId: existingEarning.id,
        amount: totalEarnings,
        watchMinutes,
        retention: Math.round(retention * 100),
        updated: true
      };
    } else {
      // Créer un nouveau revenu
      const earningId = uuidv4();
      await query(`
        INSERT INTO user_earnings (id, user_id, video_id, session_id, earning_type, amount, description, status)
        VALUES (?, ?, ?, ?, 'view', ?, ?, 'pending')
      `, [
        earningId,
        creatorId,
        videoId,
        sessionId,
        totalEarnings,
        `Vue - ${watchMinutes} min (${Math.round(retention * 100)}% rétention)`
      ]);

      // Mettre à jour les totaux de l'utilisateur de manière incrémentale
      await query(`
        UPDATE users 
        SET total_earnings = total_earnings + ?,
            pending_earnings = pending_earnings + ?
        WHERE id = ?
      `, [totalEarnings, totalEarnings, creatorId]);

      return {
        earningId,
        amount: totalEarnings,
        watchMinutes,
        retention: Math.round(retention * 100),
        updated: false
      };
    }

  } catch (error) {
    console.error('Error tracking video view earnings:', error);
    return null;
  }
}

/**
 * Calculer et enregistrer les revenus pour un engagement (like, comment, share)
 * Bonus pour l'engagement
 */
async function trackEngagement(videoId, engagementType, userId = null) {
  try {
    // Récupérer les infos de la vidéo et du créateur
    const [videoData] = await query(`
      SELECT 
        v.id,
        c.user_id as creator_id,
        u.is_verified
      FROM videos v
      INNER JOIN channels c ON v.channel_id = c.id
      INNER JOIN users u ON c.user_id = u.id
      WHERE v.id = ?
    `, [videoId]);

    if (!videoData || !videoData.is_verified) {
      return null;
    }

    const creatorId = videoData.creator_id;

    // Bonus d'engagement (utiliser les taux centralisés)
    const engagementBonus = {
      'like': EARNING_RATES.PER_LIKE,
      'comment': EARNING_RATES.PER_COMMENT,
      'share': EARNING_RATES.PER_SHARE
    };

    const amount = engagementBonus[engagementType] || 0;

    if (amount > 0) {
      // Enregistrer le bonus d'engagement
      const earningId = uuidv4();
      await query(`
        INSERT INTO user_earnings (id, user_id, video_id, earning_type, amount, description, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `, [
        earningId,
        creatorId,
        videoId,
        engagementType, // Utiliser le type exact (like, comment, share)
        amount,
        `Engagement - ${engagementType}`
      ]);

      // Mettre à jour les totaux
      await query(`
        UPDATE users 
        SET total_earnings = total_earnings + ?,
            pending_earnings = pending_earnings + ?
        WHERE id = ?
      `, [amount, amount, creatorId]);

      return { earningId, amount, type: engagementType };
    }

    return null;

  } catch (error) {
    console.error('Error tracking engagement earnings:', error);
    return null;
  }
}

/**
 * Obtenir les statistiques de revenus en temps réel pour un utilisateur
 */
async function getUserRealtimeEarnings(userId) {
  try {
    // Statistiques globales depuis la table users (déjà agrégées)
    const [userStats] = await query(`
      SELECT 
        total_earnings,
        pending_earnings,
        paid_earnings
      FROM users
      WHERE id = ?
    `, [userId]);

    if (!userStats) {
      return {
        total_earnings: 0,
        pending_earnings: 0,
        paid_earnings: 0,
        current_week: { earnings: 0, views: 0, watch_minutes: 0 },
        last_week: { earnings: 0, views: 0, watch_minutes: 0 }
      };
    }

    // Statistiques de la semaine en cours
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

    // Récupérer le channel_id de l'utilisateur
    const [userChannel] = await query(`SELECT id FROM channels WHERE user_id = ?`, [userId]);
    const channelId = userChannel?.id;

    const [currentWeekStats] = await query(`
      SELECT 
        COUNT(*) as earnings_count,
        COALESCE(SUM(amount), 0) as total_earnings
      FROM user_earnings
      WHERE user_id = ? 
        AND created_at >= ? 
        AND created_at <= ?
    `, [userId, weekStart, weekEnd]);
    
    // Compter les vues réelles depuis watch_sessions pour cohérence avec Analytics
    const [currentWeekViews] = await query(`
      SELECT COUNT(*) as total_views
      FROM watch_sessions
      WHERE channel_id = ?
        AND started_at >= ?
        AND started_at <= ?
    `, [channelId, weekStart, weekEnd]);
    
    // Compter les likes réels depuis video_likes pour la semaine actuelle
    const [currentWeekLikes] = await query(`
      SELECT COUNT(*) as total_likes
      FROM video_likes vl
      JOIN videos v ON vl.video_id = v.id
      WHERE v.channel_id = ?
        AND vl.is_like = 1
        AND vl.created_at >= ?
        AND vl.created_at <= ?
    `, [channelId, weekStart, weekEnd]);
    
    // Compter les commentaires réels depuis comments pour la semaine actuelle
    const [currentWeekComments] = await query(`
      SELECT COUNT(*) as total_comments
      FROM comments c
      JOIN videos v ON c.video_id = v.id
      WHERE v.channel_id = ?
        AND c.is_deleted = 0
        AND c.created_at >= ?
        AND c.created_at <= ?
    `, [channelId, weekStart, weekEnd]);
    
    // Compter les partages depuis user_earnings (car pas de table shares)
    const [currentWeekShares] = await query(`
      SELECT COALESCE(SUM(CASE WHEN earning_type = 'share' THEN 1 ELSE 0 END), 0) as total_shares
      FROM user_earnings
      WHERE user_id = ? 
        AND created_at >= ? 
        AND created_at <= ?
    `, [userId, weekStart, weekEnd]);

    // Statistiques de la semaine précédente
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekEnd);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

    const [lastWeekStats] = await query(`
      SELECT 
        COUNT(*) as earnings_count,
        COALESCE(SUM(amount), 0) as total_earnings
      FROM user_earnings
      WHERE user_id = ? 
        AND created_at >= ? 
        AND created_at <= ?
    `, [userId, lastWeekStart, lastWeekEnd]);
    
    // Compter les vues réelles depuis watch_sessions pour la semaine précédente
    const [lastWeekViews] = await query(`
      SELECT COUNT(*) as total_views
      FROM watch_sessions
      WHERE channel_id = ?
        AND started_at >= ?
        AND started_at <= ?
    `, [channelId, lastWeekStart, lastWeekEnd]);
    
    // Compter les likes réels de la semaine précédente
    const [lastWeekLikes] = await query(`
      SELECT COUNT(*) as total_likes
      FROM video_likes vl
      JOIN videos v ON vl.video_id = v.id
      WHERE v.channel_id = ?
        AND vl.is_like = 1
        AND vl.created_at >= ?
        AND vl.created_at <= ?
    `, [channelId, lastWeekStart, lastWeekEnd]);
    
    // Compter les commentaires réels de la semaine précédente
    const [lastWeekComments] = await query(`
      SELECT COUNT(*) as total_comments
      FROM comments c
      JOIN videos v ON c.video_id = v.id
      WHERE v.channel_id = ?
        AND c.is_deleted = 0
        AND c.created_at >= ?
        AND c.created_at <= ?
    `, [channelId, lastWeekStart, lastWeekEnd]);
    
    // Compter les partages de la semaine précédente
    const [lastWeekShares] = await query(`
      SELECT COALESCE(SUM(CASE WHEN earning_type = 'share' THEN 1 ELSE 0 END), 0) as total_shares
      FROM user_earnings
      WHERE user_id = ? 
        AND created_at >= ? 
        AND created_at <= ?
    `, [userId, lastWeekStart, lastWeekEnd]);

    // Calculer la tendance
    const currentWeekEarnings = parseFloat(currentWeekStats.total_earnings) || 0;
    const lastWeekEarnings = parseFloat(lastWeekStats.total_earnings) || 0;
    const trend = lastWeekEarnings > 0 
      ? ((currentWeekEarnings - lastWeekEarnings) / lastWeekEarnings) * 100 
      : 0;

    // Calculer les minutes de visionnage pour la semaine actuelle
    // Utiliser UNIQUEMENT watch_sessions car c'est le tracker temps réel
    const [watchTimeSessions] = await query(`
      SELECT COALESCE(SUM(watch_duration), 0) as total
      FROM watch_sessions ws
      WHERE ws.channel_id = ?
        AND ws.started_at >= ?
        AND ws.started_at <= ?
    `, [channelId, weekStart, weekEnd]);
    
    const totalWatchSeconds = watchTimeSessions.total || 0;
    const watchMinutes = Math.floor(totalWatchSeconds / 60);

    // Calculer le total des engagements avec les vraies valeurs
    const currentLikes = parseInt(currentWeekLikes.total_likes) || 0;
    const currentComments = parseInt(currentWeekComments.total_comments) || 0;
    const currentShares = parseInt(currentWeekShares.total_shares) || 0;
    const currentEngagements = currentLikes + currentComments + currentShares;
    
    const lastLikes = parseInt(lastWeekLikes.total_likes) || 0;
    const lastComments = parseInt(lastWeekComments.total_comments) || 0;
    const lastShares = parseInt(lastWeekShares.total_shares) || 0;
    const lastEngagements = lastLikes + lastComments + lastShares;

    return {
      total_earnings: parseFloat(userStats.total_earnings) || 0,
      pending_earnings: parseFloat(userStats.pending_earnings) || 0,
      paid_earnings: parseFloat(userStats.paid_earnings) || 0,
      current_week: {
        earnings: currentWeekEarnings,
        views: parseInt(currentWeekViews.total_views) || 0,
        watch_minutes: watchMinutes,
        engagements: currentEngagements,
        likes: currentLikes,
        comments: currentComments,
        shares: currentShares
      },
      last_week: {
        earnings: lastWeekEarnings,
        views: parseInt(lastWeekViews.total_views) || 0,
        watch_minutes: 0,
        engagements: lastEngagements,
        likes: lastLikes,
        comments: lastComments,
        shares: lastShares
      },
      trend: Math.round(trend * 10) / 10,
      rates: EARNING_RATES
    };

  } catch (error) {
    console.error('Error getting realtime earnings:', error);
    return {
      total_earnings: 0,
      pending_earnings: 0,
      paid_earnings: 0,
      current_week: { earnings: 0, views: 0, watch_minutes: 0 },
      last_week: { earnings: 0, views: 0, watch_minutes: 0 }
    };
  }
}

/**
 * Obtenir le début de la semaine (lundi)
 */
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * Obtenir la fin de la semaine (dimanche)
 */
function getWeekEnd(date = new Date()) {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

module.exports = {
  EARNING_RATES,
  trackVideoView,
  trackEngagement,
  getUserRealtimeEarnings,
  getWeekStart,
  getWeekEnd
};
