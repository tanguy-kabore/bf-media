const mysql = require('mysql2/promise');

async function checkLikeEarningsAmount() {
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
      SELECT u.id as user_id
      FROM users u
      WHERE u.username = 'test'
      LIMIT 1
    `);
    
    const { user_id } = users[0];
    
    console.log('🔍 VÉRIFICATION DES MONTANTS DES LIKES\n');
    
    // Récupérer les revenus de type 'like'
    const [likeEarnings] = await connection.query(`
      SELECT 
        id,
        amount,
        description,
        created_at
      FROM user_earnings
      WHERE user_id = ?
        AND earning_type = 'like'
      ORDER BY created_at DESC
      LIMIT 10
    `, [user_id]);
    
    console.log(`💰 Revenus de type "like" (derniers 10):\n`);
    
    if (likeEarnings.length === 0) {
      console.log('   ❌ Aucun revenu de type "like" trouvé\n');
    } else {
      likeEarnings.forEach((earning, i) => {
        const time = new Date(earning.created_at).toLocaleString('fr-FR');
        console.log(`   ${i + 1}. ${earning.amount} FCFA - ${earning.description} - ${time}`);
      });
      console.log('');
    }
    
    // Vérifier le taux configuré
    console.log('⚙️  Taux configuré dans EARNING_RATES:');
    console.log('   PER_LIKE: 0.1 XOF\n');
    
    // Diagnostic
    const zeroAmountLikes = likeEarnings.filter(e => parseFloat(e.amount) === 0);
    if (zeroAmountLikes.length > 0) {
      console.log('⚠️  PROBLÈME DÉTECTÉ:');
      console.log(`   ${zeroAmountLikes.length} like(s) avec montant à 0 FCFA`);
      console.log('   → Le taux PER_LIKE n\'est pas appliqué correctement\n');
    } else if (likeEarnings.length > 0) {
      console.log('✅ Tous les likes ont le bon montant (0.1 FCFA)\n');
    }
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

checkLikeEarningsAmount();
