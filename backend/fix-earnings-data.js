/**
 * Script pour corriger les données de revenus incohérentes
 */

require('dotenv').config();
const { query } = require('./src/config/database');

async function fixEarningsData() {
  try {
    console.log('🔧 Correction des données de revenus...\n');

    // 1. Trouver tous les utilisateurs vérifiés
    const users = await query(`
      SELECT id, username, display_name, total_earnings, pending_earnings, paid_earnings
      FROM users
      WHERE is_verified = TRUE
    `);

    console.log(`👥 ${users.length} utilisateur(s) vérifié(s) trouvé(s)\n`);

    for (const user of users) {
      console.log(`📊 ${user.display_name || user.username}`);
      console.log(`   Totaux actuels: ${user.total_earnings} XOF (en attente: ${user.pending_earnings}, payé: ${user.paid_earnings})`);

      // 2. Calculer les vrais totaux depuis user_earnings
      const [realTotals] = await query(`
        SELECT 
          COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_total,
          COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as approved_total,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_total,
          COALESCE(SUM(amount), 0) as grand_total
        FROM user_earnings
        WHERE user_id = ?
      `, [user.id]);

      const correctTotal = parseFloat(realTotals.grand_total) || 0;
      const correctPending = parseFloat(realTotals.pending_total) || 0;
      const correctPaid = parseFloat(realTotals.paid_total) || 0;

      console.log(`   Totaux corrects: ${correctTotal} XOF (en attente: ${correctPending}, payé: ${correctPaid})`);

      // 3. Mettre à jour si différent
      if (
        Math.abs(user.total_earnings - correctTotal) > 0.01 ||
        Math.abs(user.pending_earnings - correctPending) > 0.01 ||
        Math.abs(user.paid_earnings - correctPaid) > 0.01
      ) {
        await query(`
          UPDATE users
          SET total_earnings = ?,
              pending_earnings = ?,
              paid_earnings = ?
          WHERE id = ?
        `, [correctTotal, correctPending, correctPaid, user.id]);

        console.log('   ✅ Totaux mis à jour!\n');
      } else {
        console.log('   ✓ Déjà cohérent\n');
      }
    }

    console.log('✅ Correction terminée avec succès!');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    console.log('\n✓ Terminé');
    process.exit(0);
  }
}

fixEarningsData();
