const mysql = require('mysql2/promise');

async function debugEarningsIssue() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'root',
      database: 'bf_media'
    });
    
    const [users] = await connection.query(`
      SELECT u.id as user_id, c.id as channel_id
      FROM users u
      JOIN channels c ON u.id = c.user_id
      WHERE u.username = 'test'
      LIMIT 1
    `);
    
    const { user_id, channel_id } = users[0];
    
    console.log('🔍 ANALYSE DU PROBLÈME D\'ÉCRASEMENT DES REVENUS\n');
    
    // Compter les sessions uniques
    const [sessions] = await connection.query(`
      SELECT 
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(*) as total_entries
      FROM watch_sessions
      WHERE channel_id = ?
        AND started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND watch_duration > 0
    `, [channel_id]);
    
    console.log(`📊 Sessions avec temps de visionnage (7 derniers jours):`);
    console.log(`   Sessions uniques: ${sessions.unique_sessions}`);
    console.log(`   Total d'entrées: ${sessions.total_entries}\n`);
    
    // Compter les revenus
    const [earnings] = await connection.query(`
      SELECT COUNT(*) as total_earnings
      FROM user_earnings
      WHERE user_id = ?
        AND earning_type = 'view'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `, [user_id]);
    
    console.log(`💰 Revenus de type "Vue" (7 derniers jours):`);
    console.log(`   Total: ${earnings.total_earnings}\n`);
    
    // Détails des sessions et leurs revenus
    const [sessionDetails] = await connection.query(`
      SELECT 
        ws.session_id,
        ws.video_id,
        ws.watch_duration,
        ws.started_at,
        ue.id as earning_id,
        ue.amount as earning_amount,
        ue.created_at as earning_created_at
      FROM watch_sessions ws
      LEFT JOIN user_earnings ue ON ue.user_id = ? 
        AND ue.video_id = ws.video_id
        AND ue.earning_type = 'view'
        AND ue.created_at >= ws.started_at
        AND ue.created_at <= DATE_ADD(ws.started_at, INTERVAL 1 HOUR)
      WHERE ws.channel_id = ?
        AND ws.started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND ws.watch_duration > 0
      ORDER BY ws.started_at DESC
    `, [user_id, channel_id]);
    
    console.log('📋 Détails sessions → revenus:');
    sessionDetails.forEach((s, i) => {
      const duration_min = Math.round(s.watch_duration / 60);
      const sessionTime = new Date(s.started_at).toLocaleString('fr-FR');
      console.log(`   ${i + 1}. Session ${s.session_id.substring(0, 8)}... - ${duration_min}min - ${sessionTime}`);
      if (s.earning_id) {
        const earningTime = new Date(s.earning_created_at).toLocaleString('fr-FR');
        console.log(`      → Revenu: ${s.earning_amount} FCFA - ${earningTime}`);
      } else {
        console.log(`      → ❌ Aucun revenu trouvé`);
      }
    });
    
    console.log('\n⚠️  DIAGNOSTIC:');
    if (sessions.unique_sessions > earnings.total_earnings) {
      console.log(`   ${sessions.unique_sessions} sessions mais seulement ${earnings.total_earnings} revenu(s)`);
      console.log(`   → Les revenus sont écrasés au lieu d'être créés séparément`);
      console.log(`   → Problème: La requête de recherche de revenu existant trouve un revenu`);
      console.log(`     pour une session différente et le met à jour\n`);
    } else {
      console.log(`   ✅ Nombre de revenus cohérent avec les sessions\n`);
    }
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

debugEarningsIssue();
