const mysql = require('mysql2/promise');

async function verifyAnalytics() {
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
    
    // 1. Trouver l'utilisateur test et sa chaîne
    const [users] = await connection.query(`
      SELECT u.id as user_id, u.username, c.id as channel_id, c.name as channel_name
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
    
    const { user_id, username, channel_id, channel_name } = users[0];
    console.log(`👤 Utilisateur: ${username} (${user_id})`);
    console.log(`📺 Chaîne: ${channel_name} (${channel_id})\n`);
    
    // 2. Vérifier le temps de visionnage total depuis watch_sessions
    const [watchTime] = await connection.query(`
      SELECT 
        COALESCE(SUM(watch_duration), 0) as total_seconds,
        ROUND(COALESCE(SUM(watch_duration), 0) / 60, 2) as total_minutes,
        COUNT(*) as session_count
      FROM watch_sessions
      WHERE channel_id = ?
        AND started_at >= DATE_SUB(NOW(), INTERVAL 28 DAY)
    `, [channel_id]);
    
    console.log('⏱️  TEMPS DE VISIONNAGE:');
    console.log(`   Total: ${watchTime.total_seconds} secondes (${watchTime.total_minutes} minutes)`);
    console.log(`   Sessions: ${watchTime.session_count}`);
    console.log(`   Affiché dans Analytics: ${watchTime.total_minutes} min\n`);
    
    // 3. Vérifier la durée moyenne de visionnage
    const [avgDuration] = await connection.query(`
      SELECT 
        AVG(watch_duration) as avg_seconds,
        ROUND(AVG(watch_duration) / 60, 2) as avg_minutes
      FROM watch_sessions
      WHERE channel_id = ?
        AND started_at >= DATE_SUB(NOW(), INTERVAL 28 DAY)
        AND watch_duration > 0
    `, [channel_id]);
    
    console.log('📊 DURÉE MOYENNE DE VISIONNAGE:');
    console.log(`   Moyenne: ${avgDuration.avg_seconds || 0} secondes (${avgDuration.avg_minutes || 0} minutes)`);
    console.log(`   Affiché dans Analytics: ${avgDuration.avg_minutes || 0} min\n`);
    
    // 4. Vérifier le taux de retour (returning viewers)
    const [totalViewers] = await connection.query(`
      SELECT COUNT(DISTINCT COALESCE(user_id, session_id)) as total
      FROM watch_sessions
      WHERE channel_id = ?
        AND started_at >= DATE_SUB(NOW(), INTERVAL 28 DAY)
    `, [channel_id]);
    
    const [returningViewers] = await connection.query(`
      SELECT COUNT(DISTINCT viewer_id) as returning
      FROM (
        SELECT COALESCE(user_id, session_id) as viewer_id
        FROM watch_sessions
        WHERE channel_id = ?
          AND started_at >= DATE_SUB(NOW(), INTERVAL 28 DAY)
        GROUP BY viewer_id
        HAVING COUNT(*) > 1
      ) as returning_viewers
    `, [channel_id]);
    
    const returnRate = totalViewers.total > 0 
      ? Math.round((returningViewers.returning / totalViewers.total) * 100) 
      : 0;
    
    console.log('🔄 TAUX DE RETOUR:');
    console.log(`   Spectateurs uniques: ${totalViewers.total}`);
    console.log(`   Spectateurs de retour: ${returningViewers.returning}`);
    console.log(`   Taux de retour: ${returnRate}%`);
    console.log(`   Affiché dans Analytics: ${returnRate}%\n`);
    
    // 5. Vérifier les vues dans video_views vs watch_sessions
    const [videoViews] = await connection.query(`
      SELECT COUNT(*) as count
      FROM video_views vv
      JOIN videos v ON vv.video_id = v.id
      WHERE v.channel_id = ?
        AND vv.viewed_at >= DATE_SUB(NOW(), INTERVAL 28 DAY)
    `, [channel_id]);
    
    console.log('📈 COMPARAISON DES SOURCES:');
    console.log(`   video_views: ${videoViews.count} vues`);
    console.log(`   watch_sessions: ${watchTime.session_count} sessions`);
    
    if (videoViews.count !== watchTime.session_count) {
      console.log(`   ⚠️  Différence détectée! Les deux devraient être identiques.\n`);
    } else {
      console.log(`   ✅ Les deux sources sont cohérentes\n`);
    }
    
    // 6. Détails des sessions récentes
    const [recentSessions] = await connection.query(`
      SELECT 
        session_id,
        video_id,
        watch_duration,
        watch_percentage,
        started_at,
        ended_at
      FROM watch_sessions
      WHERE channel_id = ?
      ORDER BY started_at DESC
      LIMIT 5
    `, [channel_id]);
    
    console.log('📋 DERNIÈRES SESSIONS:');
    recentSessions.forEach((session, i) => {
      console.log(`   ${i + 1}. Session ${session.session_id.substring(0, 8)}...`);
      console.log(`      Durée: ${session.watch_duration}s (${Math.round(session.watch_duration / 60)}min)`);
      console.log(`      Pourcentage: ${session.watch_percentage}%`);
      console.log(`      Début: ${session.started_at}`);
      console.log(`      Fin: ${session.ended_at || 'En cours'}`);
    });
    
    console.log('\n✅ Vérification terminée!');
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

verifyAnalytics();
