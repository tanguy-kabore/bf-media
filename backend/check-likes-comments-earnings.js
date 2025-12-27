const mysql = require('mysql2/promise');

async function checkLikesCommentsEarnings() {
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
    
    console.log('🔍 VÉRIFICATION DES REVENUS LIKES & COMMENTAIRES\n');
    
    // Compter les likes réels
    const [likes] = await connection.query(`
      SELECT COUNT(*) as total
      FROM video_likes vl
      JOIN videos v ON vl.video_id = v.id
      WHERE v.channel_id = ?
        AND vl.is_like = 1
        AND vl.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `, [channel_id]);
    
    console.log(`👍 Likes (7 derniers jours): ${likes.total}`);
    
    // Compter les commentaires réels
    const [comments] = await connection.query(`
      SELECT COUNT(*) as total
      FROM comments c
      JOIN videos v ON c.video_id = v.id
      WHERE v.channel_id = ?
        AND c.is_deleted = 0
        AND c.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `, [channel_id]);
    
    console.log(`💬 Commentaires (7 derniers jours): ${comments.total}\n`);
    
    // Compter les revenus de type 'like'
    const [likeEarnings] = await connection.query(`
      SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as total_amount
      FROM user_earnings
      WHERE user_id = ?
        AND earning_type = 'like'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `, [user_id]);
    
    console.log(`💰 Revenus de type "like": ${likeEarnings.total} (${likeEarnings.total_amount} FCFA)`);
    
    // Compter les revenus de type 'comment'
    const [commentEarnings] = await connection.query(`
      SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as total_amount
      FROM user_earnings
      WHERE user_id = ?
        AND earning_type = 'comment'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `, [user_id]);
    
    console.log(`💰 Revenus de type "comment": ${commentEarnings.total} (${commentEarnings.total_amount} FCFA)\n`);
    
    // Diagnostic
    console.log('⚠️  DIAGNOSTIC:');
    if (likes.total > 0 && likeEarnings.total === 0) {
      console.log(`   ❌ ${likes.total} likes mais 0 revenu de type "like"`);
      console.log(`   → Les likes ne génèrent pas de revenus`);
    } else if (likes.total > 0) {
      console.log(`   ✅ Likes génèrent des revenus`);
    }
    
    if (comments.total > 0 && commentEarnings.total === 0) {
      console.log(`   ❌ ${comments.total} commentaires mais 0 revenu de type "comment"`);
      console.log(`   → Les commentaires ne génèrent pas de revenus`);
    } else if (comments.total > 0) {
      console.log(`   ✅ Commentaires génèrent des revenus`);
    }
    
    console.log('\n💡 SOLUTION:');
    console.log('   Les likes et commentaires doivent appeler trackEngagement()');
    console.log('   pour générer des revenus automatiquement.\n');
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

checkLikesCommentsEarnings();
