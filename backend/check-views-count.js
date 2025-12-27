const mysql = require('mysql2/promise');

async function checkViewsCount() {
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
    
    console.log('📊 VÉRIFICATION DES VUES\n');
    
    // Compter les sessions dans les derniers 28 jours
    const [sessions28] = await connection.query(`
      SELECT COUNT(*) as total
      FROM watch_sessions
      WHERE channel_id = ?
        AND started_at >= DATE_SUB(NOW(), INTERVAL 28 DAY)
    `, [channel_id]);
    
    console.log(`Sessions (28 derniers jours): ${sessions28.total}`);
    
    // Compter les sessions aujourd'hui
    const [sessionsToday] = await connection.query(`
      SELECT COUNT(*) as total
      FROM watch_sessions
      WHERE channel_id = ?
        AND DATE(started_at) = CURDATE()
    `, [channel_id]);
    
    console.log(`Sessions (aujourd'hui): ${sessionsToday.total}`);
    
    // Dernières sessions
    const [recentSessions] = await connection.query(`
      SELECT 
        session_id,
        video_id,
        watch_duration,
        started_at,
        COALESCE(user_id, 'anonymous') as viewer
      FROM watch_sessions
      WHERE channel_id = ?
      ORDER BY started_at DESC
      LIMIT 10
    `, [channel_id]);
    
    console.log('\n📋 Dernières sessions:');
    recentSessions.forEach((s, i) => {
      const duration_min = Math.round(s.watch_duration / 60);
      const time = new Date(s.started_at).toLocaleString('fr-FR');
      console.log(`   ${i + 1}. ${s.session_id.substring(0, 8)}... - ${duration_min}min - ${time}`);
    });
    
    console.log('\n💡 Si le nombre reste à 6:');
    console.log('   - Vérifiez que de nouvelles sessions sont créées quand vous regardez une vidéo');
    console.log('   - Actualisez la page Analytics (F5)');
    console.log('   - Vérifiez que le backend est bien redémarré avec les corrections\n');
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

checkViewsCount();
