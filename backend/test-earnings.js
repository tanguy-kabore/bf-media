/**
 * Script de test pour le calcul des revenus
 */

require('dotenv').config();
const { query } = require('./src/config/database');
const { v4: uuidv4 } = require('uuid');

async function testEarningsCalculation() {

  try {
    console.log('✓ Connected to database\n');

    // 1. Trouver un utilisateur vérifié
    const users = await query(
      'SELECT id, username, display_name, is_verified FROM users WHERE is_verified = TRUE LIMIT 1'
    );

    if (users.length === 0) {
      console.log('❌ Aucun utilisateur vérifié trouvé');
      return;
    }

    const user = users[0];
    console.log(`📊 Utilisateur: ${user.display_name || user.username} (${user.id})`);
    console.log(`✓ Vérifié: ${user.is_verified}\n`);

    // 2. Récupérer les vidéos de l'utilisateur
    const videos = await query(
      `SELECT v.id, v.title, v.view_count, v.duration 
       FROM videos v
       INNER JOIN channels c ON v.channel_id = c.id
       WHERE c.user_id = ?`,
      [user.id]
    );

    console.log(`📹 Vidéos trouvées: ${videos.length}`);
    
    let totalViews = 0;
    let totalEarnings = 0;
    const PER_VIEW = 0.5;
    const PER_WATCH_MINUTE = 1;

    videos.forEach(video => {
      const views = parseInt(video.view_count) || 0;
      const duration = parseInt(video.duration) || 0;
      const watchMinutes = Math.floor((duration * views) / 60); // Estimation
      
      const viewEarnings = views * PER_VIEW;
      const watchEarnings = watchMinutes * PER_WATCH_MINUTE;
      const videoEarnings = viewEarnings + watchEarnings;

      totalViews += views;
      totalEarnings += videoEarnings;

      console.log(`  - ${video.title}`);
      console.log(`    Vues: ${views}, Durée: ${duration}s`);
      console.log(`    Revenus: ${videoEarnings.toFixed(2)} XOF`);
    });

    console.log(`\n💰 TOTAL:`);
    console.log(`  Vues totales: ${totalViews}`);
    console.log(`  Revenus estimés: ${totalEarnings.toFixed(2)} XOF\n`);

    // 3. Vérifier les revenus existants
    const existingEarnings = await query(
      'SELECT SUM(amount) as total FROM user_earnings WHERE user_id = ?',
      [user.id]
    );

    console.log(`💵 Revenus enregistrés: ${existingEarnings[0].total || 0} XOF`);

    // 4. Vérifier les colonnes de la table users
    const userDetails = await query(
      'SELECT total_earnings, pending_earnings, paid_earnings FROM users WHERE id = ?',
      [user.id]
    );

    console.log(`\n👤 Colonnes utilisateur:`);
    console.log(`  total_earnings: ${userDetails[0].total_earnings || 0} XOF`);
    console.log(`  pending_earnings: ${userDetails[0].pending_earnings || 0} XOF`);
    console.log(`  paid_earnings: ${userDetails[0].paid_earnings || 0} XOF`);

    // 5. Proposer de créer les revenus
    if (totalEarnings > 0 && (!existingEarnings[0].total || existingEarnings[0].total === 0)) {
      console.log(`\n🔧 Création des revenus...`);
      
      const earningId = uuidv4();
      await query(`
        INSERT INTO user_earnings (id, user_id, earning_type, amount, description, status)
        VALUES (?, ?, 'view', ?, ?, 'pending')
      `, [earningId, user.id, totalEarnings, `Revenus calculés - ${totalViews} vues`]);

      await query(`
        UPDATE users 
        SET total_earnings = ?,
            pending_earnings = ?
        WHERE id = ?
      `, [totalEarnings, totalEarnings, user.id]);

      console.log(`✅ Revenus créés avec succès!`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    console.log('\n✓ Terminé');
    process.exit(0);
  }
}

testEarningsCalculation();
