const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

const EARNING_RATES = {
  PER_VIEW: 0.5,
  PER_WATCH_MINUTE: 1,
  MIN_RETENTION_FOR_BONUS: 0.5,
  ENGAGEMENT_BONUS: 0.1
};

async function recreateEarningsFromSessions() {
  let connection;
  try {
    console.log('🔌 Connexion à MySQL...\n');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'root',
      database: 'bf_media'
    });
    
    console.log('✅ Connecté à la base de données\n');
    
    // Trouver l'utilisateur test
    const [users] = await connection.query(`
      SELECT u.id as user_id, c.id as channel_id
      FROM users u
      JOIN channels c ON u.id = c.user_id
      WHERE u.username = 'test'
      LIMIT 1
    `);
    
    if (users.length === 0) {
      console.log('❌ Utilisateur test non trouvé');
      await connection.end();
      return;
    }
    
    const { user_id, channel_id } = users[0];
    
    console.log('🔍 Recherche des sessions sans revenus...\n');
    
    // Trouver toutes les sessions avec watch_duration > 0
    const [sessions] = await connection.query(`
      SELECT 
        ws.session_id,
        ws.video_id,
        ws.watch_duration,
        ws.watch_percentage,
        ws.started_at,
        v.title as video_title,
        v.duration as video_duration
      FROM watch_sessions ws
      JOIN videos v ON ws.video_id = v.id
      WHERE ws.channel_id = ?
        AND ws.watch_duration > 0
        AND ws.started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY ws.started_at DESC
    `, [channel_id]);
    
    console.log(`📊 Trouvé ${sessions.length} sessions avec du temps de visionnage\n`);
    
    let created = 0;
    let skipped = 0;
    
    for (const session of sessions) {
      // Vérifier si un revenu existe déjà pour cette session
      const [existing] = await connection.query(`
        SELECT id FROM user_earnings
        WHERE user_id = ?
          AND video_id = ?
          AND earning_type = 'view'
          AND created_at >= ?
          AND created_at <= DATE_ADD(?, INTERVAL 1 HOUR)
      `, [user_id, session.video_id, session.started_at, session.started_at]);
      
      if (existing.length > 0) {
        console.log(`⏭️  Session ${session.session_id.substring(0, 8)}... - Revenu existe déjà`);
        skipped++;
        continue;
      }
      
      // Calculer les revenus
      const watchMinutes = Math.floor(session.watch_duration / 60);
      const retention = session.video_duration > 0 
        ? Math.min(session.watch_duration / session.video_duration, 1) 
        : 0;
      
      const viewEarnings = EARNING_RATES.PER_VIEW;
      const watchEarnings = watchMinutes * EARNING_RATES.PER_WATCH_MINUTE;
      let totalEarnings = viewEarnings + watchEarnings;
      
      // Bonus d'engagement si bonne rétention
      if (retention >= EARNING_RATES.MIN_RETENTION_FOR_BONUS) {
        totalEarnings *= (1 + EARNING_RATES.ENGAGEMENT_BONUS);
      }
      
      totalEarnings = Math.round(totalEarnings * 100) / 100;
      
      // Créer le revenu
      const earningId = uuidv4();
      await connection.query(`
        INSERT INTO user_earnings (id, user_id, video_id, earning_type, amount, description, status, created_at)
        VALUES (?, ?, ?, 'view', ?, ?, 'pending', ?)
      `, [
        earningId,
        user_id,
        session.video_id,
        totalEarnings,
        `Vue - ${watchMinutes} min (${Math.round(retention * 100)}% rétention)`,
        session.started_at
      ]);
      
      console.log(`✅ Session ${session.session_id.substring(0, 8)}... - ${totalEarnings} FCFA créé`);
      console.log(`   Vidéo: ${session.video_title}`);
      console.log(`   Durée: ${watchMinutes} min (${Math.round(retention * 100)}% rétention)`);
      console.log('');
      
      created++;
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 RÉSUMÉ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Revenus créés: ${created}`);
    console.log(`Revenus existants (ignorés): ${skipped}`);
    console.log('');
    
    // Recalculer les totaux
    const [totals] = await connection.query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_earnings
      FROM user_earnings
      WHERE user_id = ?
        AND status = 'pending'
    `, [user_id]);
    
    await connection.query(`
      UPDATE users
      SET pending_earnings = ?
      WHERE id = ?
    `, [totals.total_earnings, user_id]);
    
    console.log(`✅ Totaux recalculés: ${totals.total_earnings} FCFA en attente\n`);
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
    if (connection) await connection.end();
    process.exit(1);
  }
}

recreateEarningsFromSessions();
