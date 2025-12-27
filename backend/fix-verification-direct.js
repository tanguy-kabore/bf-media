const mysql = require('mysql2/promise');

async function fixVerification() {
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
    
    // 1. Vérifier l'état actuel
    console.log('🔍 Vérification de l\'utilisateur test...\n');
    const [users] = await connection.query(`
      SELECT id, username, email, display_name, is_verified, verification_badge, verified_at
      FROM users 
      WHERE username = 'test' OR email LIKE '%test%'
      LIMIT 1
    `);
    
    if (users.length === 0) {
      console.log('❌ Aucun utilisateur "test" trouvé');
      await connection.end();
      return;
    }
    
    const user = users[0];
    console.log('👤 Utilisateur trouvé:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Display Name: ${user.display_name}`);
    console.log(`   Is Verified: ${user.is_verified} ${user.is_verified ? '✅' : '❌'}`);
    console.log(`   Verification Badge: ${user.verification_badge} ${user.verification_badge ? '✅' : '❌'}`);
    console.log(`   Verified At: ${user.verified_at || 'N/A'}\n`);
    
    // 2. Activer la vérification si nécessaire
    if (!user.is_verified) {
      console.log('⚙️  Activation de la vérification...\n');
      await connection.query(`
        UPDATE users 
        SET is_verified = 1, 
            verification_badge = 1,
            verified_at = NOW()
        WHERE id = ?
      `, [user.id]);
      console.log('✅ Vérification activée!\n');
    } else {
      console.log('✅ L\'utilisateur est déjà vérifié\n');
    }
    
    // 3. Vérifier l'état après mise à jour
    const [updatedUsers] = await connection.query(`
      SELECT id, username, is_verified, verification_badge, verified_at
      FROM users 
      WHERE id = ?
    `, [user.id]);
    
    const updatedUser = updatedUsers[0];
    console.log('📊 État après mise à jour:');
    console.log(`   Is Verified: ${updatedUser.is_verified} ${updatedUser.is_verified ? '✅' : '❌'}`);
    console.log(`   Verification Badge: ${updatedUser.verification_badge} ${updatedUser.verification_badge ? '✅' : '❌'}`);
    console.log(`   Verified At: ${updatedUser.verified_at}\n`);
    
    // 4. Vérifier une vidéo pour confirmer
    const [videos] = await connection.query(`
      SELECT v.id, v.title, ch.name as channel_name, u.is_verified as user_verified
      FROM videos v
      JOIN channels ch ON v.channel_id = ch.id
      JOIN users u ON ch.user_id = u.id
      WHERE u.id = ?
      LIMIT 1
    `, [user.id]);
    
    if (videos.length > 0) {
      const video = videos[0];
      console.log('🎥 Exemple de vidéo:');
      console.log(`   Title: ${video.title}`);
      console.log(`   Channel: ${video.channel_name}`);
      console.log(`   User Verified: ${video.user_verified} ${video.user_verified ? '✅' : '❌'}\n`);
    }
    
    console.log('✅ Terminé! Actualisez la page pour voir le badge de vérification.');
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

fixVerification();
