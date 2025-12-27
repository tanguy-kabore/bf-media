const mysql = require('mysql2/promise');

async function checkCurrentState() {
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
    
    console.log('📊 ÉTAT ACTUEL\n');
    
    // Sessions
    const [sessions] = await connection.query(`
      SELECT COUNT(*) as total, COUNT(DISTINCT session_id) as unique_sessions
      FROM watch_sessions
      WHERE channel_id = ? AND started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `, [channel_id]);
    
    console.log(`Sessions (7 derniers jours): ${sessions.total} (${sessions.unique_sessions} uniques)`);
    
    // Revenus
    const [earnings] = await connection.query(`
      SELECT COUNT(*) as total
      FROM user_earnings
      WHERE user_id = ? AND earning_type = 'view' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `, [user_id]);
    
    console.log(`Revenus de type "Vue": ${earnings.total}\n`);
    
    console.log('Le problème: Analytics compte les sessions (6) mais Historique affiche les revenus (1)');
    console.log('Solution: Recréer les revenus manquants basés sur les sessions réelles\n');
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

checkCurrentState();
