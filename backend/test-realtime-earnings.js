/**
 * Script de test pour le système de revenus en temps réel
 */

require('dotenv').config();
const { query } = require('./src/config/database');
const { trackVideoView, trackEngagement, getUserRealtimeEarnings } = require('./src/services/realtimeEarningsTracker');

async function testRealtimeEarnings() {
  try {
    console.log('🧪 Test du système de revenus en temps réel\n');

    // 1. Trouver un utilisateur vérifié
    const [user] = await query(`
      SELECT id, username, display_name, is_verified
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

    // 2. Trouver une vidéo de cet utilisateur
    const [video] = await query(`
      SELECT v.id, v.title, v.duration, v.view_count
      FROM videos v
      INNER JOIN channels c ON v.channel_id = c.id
      WHERE c.user_id = ?
      LIMIT 1
    `, [user.id]);

    if (!video) {
      console.log('❌ Aucune vidéo trouvée pour cet utilisateur');
      process.exit(1);
    }

    console.log(`🎬 Vidéo: ${video.title}`);
    console.log(`   Vues actuelles: ${video.view_count}`);
    console.log(`   Durée: ${video.duration}s\n`);

    // 3. Obtenir les revenus avant le test
    console.log('📊 Revenus AVANT le test:');
    const earningsBefore = await getUserRealtimeEarnings(user.id);
    console.log(`   Total: ${earningsBefore.total_earnings} XOF`);
    console.log(`   En attente: ${earningsBefore.pending_earnings} XOF`);
    console.log(`   Semaine actuelle: ${earningsBefore.current_week.earnings} XOF\n`);

    // 4. Simuler une vue avec 5 minutes de visionnage
    console.log('🎯 Simulation d\'une vue (5 minutes de visionnage)...');
    const viewResult = await trackVideoView(video.id, user.id, 300); // 5 minutes = 300 secondes
    
    if (viewResult) {
      console.log(`   ✅ Vue enregistrée!`);
      console.log(`   Revenus générés: ${viewResult.amount} XOF`);
      console.log(`   Minutes visionnées: ${viewResult.watchMinutes}`);
      console.log(`   Rétention: ${viewResult.retention}%\n`);
    } else {
      console.log('   ⚠️  Aucun revenu généré (utilisateur non vérifié?)\n');
    }

    // 5. Simuler un like
    console.log('👍 Simulation d\'un like...');
    const likeResult = await trackEngagement(video.id, 'like', user.id);
    
    if (likeResult) {
      console.log(`   ✅ Like enregistré!`);
      console.log(`   Bonus: ${likeResult.amount} XOF\n`);
    }

    // 6. Simuler un commentaire
    console.log('💬 Simulation d\'un commentaire...');
    const commentResult = await trackEngagement(video.id, 'comment', user.id);
    
    if (commentResult) {
      console.log(`   ✅ Commentaire enregistré!`);
      console.log(`   Bonus: ${commentResult.amount} XOF\n`);
    }

    // 7. Obtenir les revenus après le test
    console.log('📊 Revenus APRÈS le test:');
    const earningsAfter = await getUserRealtimeEarnings(user.id);
    console.log(`   Total: ${earningsAfter.total_earnings} XOF`);
    console.log(`   En attente: ${earningsAfter.pending_earnings} XOF`);
    console.log(`   Semaine actuelle: ${earningsAfter.current_week.earnings} XOF\n`);

    // 8. Calculer la différence
    const difference = earningsAfter.total_earnings - earningsBefore.total_earnings;
    console.log('💰 RÉSULTAT:');
    console.log(`   Revenus ajoutés: ${difference.toFixed(2)} XOF`);
    
    if (difference > 0) {
      console.log('   ✅ Le système de revenus en temps réel fonctionne!\n');
    } else {
      console.log('   ⚠️  Aucun revenu ajouté. Vérifiez que l\'utilisateur est vérifié.\n');
    }

    // 9. Afficher les dernières entrées de revenus
    console.log('📝 Dernières entrées de revenus:');
    const recentEarnings = await query(`
      SELECT amount, description, created_at
      FROM user_earnings
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `, [user.id]);

    recentEarnings.forEach(e => {
      console.log(`   - ${e.amount} XOF: ${e.description} (${new Date(e.created_at).toLocaleString('fr-FR')})`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    console.log('\n✓ Test terminé');
    process.exit(0);
  }
}

testRealtimeEarnings();
