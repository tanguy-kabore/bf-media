const { query } = require('./src/config/database');

async function checkVerification() {
  try {
    console.log('🔍 Vérification du statut de vérification...\n');
    
    // Vérifier l'utilisateur test
    const [user] = await query(`
      SELECT id, username, email, display_name, is_verified 
      FROM users 
      WHERE username = 'test' OR email LIKE '%test%'
      LIMIT 1
    `);
    
    if (!user) {
      console.log('❌ Aucun utilisateur "test" trouvé');
      return;
    }
    
    console.log('👤 Utilisateur trouvé:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Display Name: ${user.display_name}`);
    console.log(`   Is Verified: ${user.is_verified} ${user.is_verified ? '✅' : '❌'}\n`);
    
    // Vérifier la chaîne associée
    const [channel] = await query(`
      SELECT id, name, handle, is_verified
      FROM channels
      WHERE user_id = ?
    `, [user.id]);
    
    if (channel) {
      console.log('📺 Chaîne associée:');
      console.log(`   ID: ${channel.id}`);
      console.log(`   Name: ${channel.name}`);
      console.log(`   Handle: ${channel.handle}`);
      console.log(`   Is Verified: ${channel.is_verified} ${channel.is_verified ? '✅' : '❌'}\n`);
    }
    
    // Vérifier une vidéo
    const [video] = await query(`
      SELECT v.id, v.title, ch.name as channel_name, u.is_verified as user_verified, ch.is_verified as channel_verified
      FROM videos v
      JOIN channels ch ON v.channel_id = ch.id
      JOIN users u ON ch.user_id = u.id
      WHERE ch.user_id = ?
      LIMIT 1
    `, [user.id]);
    
    if (video) {
      console.log('🎥 Exemple de vidéo:');
      console.log(`   Title: ${video.title}`);
      console.log(`   Channel: ${video.channel_name}`);
      console.log(`   User Verified: ${video.user_verified} ${video.user_verified ? '✅' : '❌'}`);
      console.log(`   Channel Verified: ${video.channel_verified} ${video.channel_verified ? '✅' : '❌'}\n`);
    }
    
    // Si is_verified = 0, proposer de le corriger
    if (!user.is_verified) {
      console.log('⚠️  L\'utilisateur n\'est pas vérifié !');
      console.log('\nPour corriger, exécutez:');
      console.log(`UPDATE users SET is_verified = 1 WHERE id = '${user.id}';`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

checkVerification();
