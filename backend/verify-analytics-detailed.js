const mysql = require('mysql2/promise');

async function verifyAnalyticsDetailed() {
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
    
    // 2. VÉRIFIER LE NOMBRE DE VUES
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 ANALYSE DU NOMBRE DE VUES');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Vues depuis video_views
    const [videoViewsCount] = await connection.query(`
      SELECT COUNT(*) as count
      FROM video_views vv
      JOIN videos v ON vv.video_id = v.id
      WHERE v.channel_id = ?
        AND vv.viewed_at >= DATE_SUB(NOW(), INTERVAL 28 DAY)
    `, [channel_id]);
    
    // Vues depuis watch_sessions
    const [watchSessionsCount] = await connection.query(`
      SELECT COUNT(*) as count
      FROM watch_sessions
      WHERE channel_id = ?
        AND started_at >= DATE_SUB(NOW(), INTERVAL 28 DAY)
    `, [channel_id]);
    
    // Vues uniques (sessions uniques)
    const [uniqueViews] = await connection.query(`
      SELECT COUNT(DISTINCT session_id) as count
      FROM watch_sessions
      WHERE channel_id = ?
        AND started_at >= DATE_SUB(NOW(), INTERVAL 28 DAY)
    `, [channel_id]);
    
    console.log('📈 Sources de données:');
    console.log(`   video_views: ${videoViewsCount.count} entrées`);
    console.log(`   watch_sessions: ${watchSessionsCount.count} sessions`);
    console.log(`   Sessions uniques: ${uniqueViews.count}`);
    
    if (videoViewsCount.count !== watchSessionsCount.count) {
      console.log(`   ⚠️  INCOHÉRENCE: Les deux sources devraient avoir le même nombre!\n`);
    } else {
      console.log(`   ✅ Les sources sont cohérentes\n`);
    }
    
    // 3. VÉRIFIER LE TEMPS DE VISIONNAGE
    console.log('═══════════════════════════════════════════════════════════');
    console.log('⏱️  ANALYSE DU TEMPS DE VISIONNAGE');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const [watchTime] = await connection.query(`
      SELECT 
        SUM(watch_duration) as total_seconds,
        ROUND(SUM(watch_duration) / 60, 2) as total_minutes,
        COUNT(*) as session_count,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM watch_sessions
      WHERE channel_id = ?
        AND started_at >= DATE_SUB(NOW(), INTERVAL 28 DAY)
    `, [channel_id]);
    
    console.log('📊 Temps de visionnage total:');
    console.log(`   Total: ${watchTime.total_seconds || 0} secondes`);
    console.log(`   Total: ${watchTime.total_minutes || 0} minutes`);
    console.log(`   Sessions: ${watchTime.session_count || 0}`);
    console.log(`   Sessions uniques: ${watchTime.unique_sessions || 0}`);
    console.log(`   Affiché dans Analytics: ${watchTime.total_minutes || 0} min\n`);
    
    // Détails par session
    const [sessions] = await connection.query(`
      SELECT 
        session_id,
        video_id,
        watch_duration,
        watch_percentage,
        started_at,
        ended_at,
        COALESCE(user_id, 'anonymous') as viewer
      FROM watch_sessions
      WHERE channel_id = ?
        AND started_at >= DATE_SUB(NOW(), INTERVAL 28 DAY)
      ORDER BY started_at DESC
    `, [channel_id]);
    
    console.log('📋 Détails des sessions:');
    sessions.forEach((session, i) => {
      const duration_min = Math.round(session.watch_duration / 60);
      console.log(`   ${i + 1}. Session ${session.session_id.substring(0, 8)}...`);
      console.log(`      Durée: ${session.watch_duration}s (${duration_min}min)`);
      console.log(`      Pourcentage: ${session.watch_percentage}%`);
      console.log(`      Spectateur: ${session.viewer}`);
      console.log(`      Statut: ${session.ended_at ? 'Terminée' : 'En cours'}`);
    });
    console.log('');
    
    // 4. VÉRIFIER LA DURÉE MOYENNE
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 ANALYSE DE LA DURÉE MOYENNE');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const [avgDuration] = await connection.query(`
      SELECT 
        AVG(watch_duration) as avg_seconds,
        ROUND(AVG(watch_duration) / 60, 2) as avg_minutes,
        MIN(watch_duration) as min_seconds,
        MAX(watch_duration) as max_seconds
      FROM watch_sessions
      WHERE channel_id = ?
        AND started_at >= DATE_SUB(NOW(), INTERVAL 28 DAY)
        AND watch_duration > 0
    `, [channel_id]);
    
    console.log('📊 Durée moyenne de visionnage:');
    console.log(`   Moyenne: ${avgDuration.avg_seconds || 0} secondes`);
    console.log(`   Moyenne: ${avgDuration.avg_minutes || 0} minutes`);
    console.log(`   Min: ${avgDuration.min_seconds || 0}s`);
    console.log(`   Max: ${avgDuration.max_seconds || 0}s`);
    console.log(`   Affiché dans Analytics: ${avgDuration.avg_minutes || 0} min\n`);
    
    // Calcul manuel pour vérification
    const totalSeconds = watchTime.total_seconds || 0;
    const sessionCount = watchTime.session_count || 1;
    const manualAvg = Math.round((totalSeconds / sessionCount) / 60 * 100) / 100;
    console.log(`✓ Vérification manuelle: ${totalSeconds}s / ${sessionCount} sessions = ${manualAvg} min\n`);
    
    // 5. VÉRIFIER LE TAUX DE RETOUR
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔄 ANALYSE DU TAUX DE RETOUR');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Spectateurs uniques
    const [uniqueViewers] = await connection.query(`
      SELECT COUNT(DISTINCT COALESCE(user_id, session_id)) as count
      FROM watch_sessions
      WHERE channel_id = ?
        AND started_at >= DATE_SUB(NOW(), INTERVAL 28 DAY)
    `, [channel_id]);
    
    // Spectateurs avec plusieurs sessions
    const [viewerStats] = await connection.query(`
      SELECT 
        viewer_id,
        view_count
      FROM (
        SELECT 
          COALESCE(user_id, session_id) as viewer_id,
          COUNT(*) as view_count
        FROM watch_sessions
        WHERE channel_id = ?
          AND started_at >= DATE_SUB(NOW(), INTERVAL 28 DAY)
        GROUP BY viewer_id
      ) as stats
      ORDER BY view_count DESC
    `, [channel_id]);
    
    const newViewers = viewerStats.filter(v => v.view_count === 1).length;
    const returningViewers = viewerStats.filter(v => v.view_count > 1).length;
    const returnRate = uniqueViewers.count > 0 
      ? Math.round((returningViewers / uniqueViewers.count) * 100) 
      : 0;
    
    console.log('📊 Taux de retour:');
    console.log(`   Spectateurs uniques: ${uniqueViewers.count}`);
    console.log(`   Nouveaux: ${newViewers}`);
    console.log(`   De retour: ${returningViewers}`);
    console.log(`   Taux de retour: ${returnRate}%`);
    console.log(`   Affiché dans Analytics: ${returnRate}%\n`);
    
    console.log('📋 Détails par spectateur:');
    viewerStats.forEach((viewer, i) => {
      const viewerId = viewer.viewer_id.substring(0, 8);
      const type = viewer.view_count === 1 ? 'Nouveau' : 'Fidèle';
      console.log(`   ${i + 1}. ${viewerId}... - ${viewer.view_count} session(s) - ${type}`);
    });
    console.log('');
    
    // 6. RÉSUMÉ DES PROBLÈMES
    console.log('═══════════════════════════════════════════════════════════');
    console.log('⚠️  RÉSUMÉ DES PROBLÈMES DÉTECTÉS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const problems = [];
    
    if (videoViewsCount.count !== watchSessionsCount.count) {
      problems.push(`❌ Incohérence entre video_views (${videoViewsCount.count}) et watch_sessions (${watchSessionsCount.count})`);
    }
    
    if (watchSessionsCount.count > 1 && uniqueViews.count === 1) {
      problems.push(`❌ Plusieurs sessions (${watchSessionsCount.count}) mais une seule vue unique affichée`);
    }
    
    const expectedAvg = totalSeconds / sessionCount / 60;
    const displayedAvg = avgDuration.avg_minutes || 0;
    if (Math.abs(expectedAvg - displayedAvg) > 0.1) {
      problems.push(`❌ Durée moyenne incorrecte: attendu ${expectedAvg.toFixed(2)} min, affiché ${displayedAvg} min`);
    }
    
    if (problems.length === 0) {
      console.log('✅ Aucun problème détecté! Les statistiques sont cohérentes.\n');
    } else {
      console.log('Problèmes trouvés:');
      problems.forEach(p => console.log(`   ${p}`));
      console.log('');
    }
    
    console.log('✅ Analyse terminée!');
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

verifyAnalyticsDetailed();
