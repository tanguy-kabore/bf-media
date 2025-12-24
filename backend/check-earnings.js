/**
 * Script pour vérifier les revenus dans la base de données
 */

require('dotenv').config();
const { query } = require('./src/config/database');

async function checkEarnings() {
  try {
    console.log('🔍 Vérification des revenus...\n');

    // 1. Vérifier tous les utilisateurs vérifiés
    const users = await query(`
      SELECT id, username, display_name, is_verified, 
             total_earnings, pending_earnings, paid_earnings
      FROM users 
      WHERE is_verified = TRUE
    `);

    console.log(`👥 Utilisateurs vérifiés: ${users.length}\n`);

    for (const user of users) {
      console.log(`📊 ${user.display_name || user.username}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Total: ${user.total_earnings || 0} XOF`);
      console.log(`   En attente: ${user.pending_earnings || 0} XOF`);
      console.log(`   Payé: ${user.paid_earnings || 0} XOF`);

      // Vérifier les vidéos
      const videos = await query(`
        SELECT v.id, v.title, v.view_count
        FROM videos v
        INNER JOIN channels c ON v.channel_id = c.id
        WHERE c.user_id = ?
      `, [user.id]);

      console.log(`   Vidéos: ${videos.length}`);
      let totalViews = 0;
      videos.forEach(v => {
        totalViews += v.view_count || 0;
        console.log(`     - ${v.title}: ${v.view_count || 0} vues`);
      });
      console.log(`   Total vues: ${totalViews}`);

      // Vérifier les revenus enregistrés
      const earnings = await query(`
        SELECT * FROM user_earnings WHERE user_id = ?
      `, [user.id]);

      console.log(`   Revenus enregistrés: ${earnings.length} entrées`);
      earnings.forEach(e => {
        console.log(`     - ${e.description}: ${e.amount} XOF (${e.status})`);
      });

      console.log('');
    }

    // 2. Vérifier la table weekly_earnings
    const weeklyEarnings = await query(`
      SELECT * FROM weekly_earnings ORDER BY created_at DESC LIMIT 10
    `);
    console.log(`📅 Weekly earnings: ${weeklyEarnings.length} entrées`);
    weeklyEarnings.forEach(w => {
      console.log(`   - User ${w.user_id}: ${w.total_earnings} XOF (semaine ${w.week_number})`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    console.log('\n✓ Terminé');
    process.exit(0);
  }
}

checkEarnings();
