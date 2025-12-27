/**
 * Script pour tester l'API realtime directement
 */

require('dotenv').config();
const { getUserRealtimeEarnings } = require('./src/services/realtimeEarningsTracker');
const { query } = require('./src/config/database');

async function testRealtimeAPI() {
  try {
    console.log('🧪 Test de l\'API realtime earnings\n');

    // Trouver un utilisateur vérifié
    const [user] = await query(`
      SELECT id, username, display_name
      FROM users
      WHERE is_verified = TRUE
      LIMIT 1
    `);

    if (!user) {
      console.log('❌ Aucun utilisateur vérifié trouvé');
      process.exit(1);
    }

    console.log(`👤 Utilisateur: ${user.display_name || user.username}`);
    console.log(`   ID: ${user.id}\n`);

    // Appeler la fonction comme l'API le fait
    console.log('📡 Appel de getUserRealtimeEarnings()...\n');
    const result = await getUserRealtimeEarnings(user.id);

    console.log('📊 Résultat de l\'API:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    console.log('\n✓ Test terminé');
    process.exit(0);
  }
}

testRealtimeAPI();
