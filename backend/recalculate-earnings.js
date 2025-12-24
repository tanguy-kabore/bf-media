/**
 * Script pour recalculer les revenus avec la nouvelle formule
 */

require('dotenv').config();
const { query } = require('./src/config/database');
const { v4: uuidv4 } = require('uuid');

async function recalculateEarnings() {
  try {
    console.log('🔄 Recalcul des revenus avec la nouvelle formule...\n');

    // Trouver tous les utilisateurs vérifiés
    const users = await query(
      'SELECT id, username, display_name FROM users WHERE is_verified = TRUE'
    );

    console.log(`👥 ${users.length} utilisateur(s) vérifié(s) trouvé(s)\n`);

    const PER_VIEW = 0.5;
    const PER_WATCH_MINUTE = 1;
    const ENGAGEMENT_BONUS = 0.1;
    const MIN_RETENTION_FOR_BONUS = 0.5;

    for (const user of users) {
      console.log(`📊 ${user.display_name || user.username}`);

      // Récupérer les vidéos de l'utilisateur
      const videos = await query(`
        SELECT v.id, v.title, v.view_count, v.duration
        FROM videos v
        INNER JOIN channels c ON v.channel_id = c.id
        WHERE c.user_id = ? AND v.view_count > 0
      `, [user.id]);

      if (videos.length === 0) {
        console.log('   Aucune vidéo avec des vues\n');
        continue;
      }

      let totalViews = 0;
      let totalWatchMinutes = 0;
      let totalEarnings = 0;

      console.log(`   Vidéos: ${videos.length}`);

      for (const video of videos) {
        const views = parseInt(video.view_count) || 0;
        const duration = parseInt(video.duration) || 0;

        // Calculer le temps de visionnage estimé avec 70% de rétention
        const estimatedRetention = 0.7;
        const totalWatchTimeSeconds = duration * views * estimatedRetention;
        const watchMinutes = Math.floor(totalWatchTimeSeconds / 60);

        // Calcul des revenus
        const viewEarnings = views * PER_VIEW;
        const watchEarnings = watchMinutes * PER_WATCH_MINUTE;
        let videoEarnings = viewEarnings + watchEarnings;

        // Bonus d'engagement (70% de rétention > 50%)
        if (estimatedRetention >= MIN_RETENTION_FOR_BONUS) {
          videoEarnings *= (1 + ENGAGEMENT_BONUS);
        }

        totalViews += views;
        totalWatchMinutes += watchMinutes;
        totalEarnings += videoEarnings;

        console.log(`     - ${video.title}: ${views} vues, ${watchMinutes} min, ${videoEarnings.toFixed(2)} XOF`);
      }

      console.log(`   Total: ${totalViews} vues, ${totalWatchMinutes} min, ${totalEarnings.toFixed(2)} XOF`);

      // Supprimer les anciens revenus
      await query('DELETE FROM user_earnings WHERE user_id = ?', [user.id]);

      // Créer les nouveaux revenus
      const earningId = uuidv4();
      await query(`
        INSERT INTO user_earnings (id, user_id, earning_type, amount, description, status)
        VALUES (?, ?, 'view', ?, ?, 'pending')
      `, [earningId, user.id, totalEarnings, `Revenus calculés - ${totalViews} vues, ${totalWatchMinutes} minutes`]);

      // Mettre à jour les totaux de l'utilisateur
      await query(`
        UPDATE users 
        SET total_earnings = ?,
            pending_earnings = ?
        WHERE id = ?
      `, [totalEarnings, totalEarnings, user.id]);

      console.log('   ✅ Revenus mis à jour\n');
    }

    console.log('✅ Recalcul terminé avec succès!');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    console.log('\n✓ Terminé');
    process.exit(0);
  }
}

recalculateEarnings();
