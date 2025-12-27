const mysql = require('mysql2/promise');

async function checkSessionsCount() {
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
    
    // Compter les sessions uniques pour cette semaine
    const [sessions] = await connection.query(`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(DISTINCT video_id) as unique_videos
      FROM watch_sessions
      WHERE channel_id = ?
        AND started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `, [channel_id]);
    
    console.log('📊 Sessions de visionnage (7 derniers jours):');
    console.log(`   Total de sessions: ${sessions.total_sessions}`);
    console.log(`   Sessions uniques: ${sessions.unique_sessions}`);
    console.log(`   Vidéos uniques: ${sessions.unique_videos}\n`);
    
    // Compter les revenus de type "view"
    const [earnings] = await connection.query(`
      SELECT COUNT(*) as total_earnings
      FROM user_earnings
      WHERE user_id = ?
        AND earning_type = 'view'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `, [user_id]);
    
    console.log('💰 Revenus de type "Vue" (7 derniers jours):');
    console.log(`   Total d'entrées: ${earnings.total_earnings}\n`);
    
    // Détails des sessions
    const [sessionDetails] = await connection.query(`
      SELECT 
        session_id,
        video_id,
        watch_duration,
        started_at,
        COALESCE(user_id, 'anonymous') as viewer
      FROM watch_sessions
      WHERE channel_id = ?
        AND started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY started_at DESC
    `, [channel_id]);
    
    console.log('📋 Détails des sessions:');
    sessionDetails.forEach((s, i) => {
      const duration_min = Math.round(s.watch_duration / 60);
      console.log(`   ${i + 1}. Session ${s.session_id.substring(0, 8)}... - ${duration_min}min - ${s.started_at}`);
    });
    console.log('');
    
    console.log('✅ Analyse terminée!');
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

checkSessionsCount();
