/**
 * Script pour tester l'API admin des revenus
 */

require('dotenv').config();
const { query } = require('./src/config/database');

async function testAdminAPI() {
  try {
    console.log('🧪 Test de l\'API Admin Earnings\n');

    // Simuler la requête GET /admin/earnings/users
    const page = 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const whereClause = 'WHERE is_verified = TRUE';
    const params = [];

    const [countResult] = await query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );

    console.log(`📊 Total utilisateurs vérifiés: ${countResult.total}\n`);

    const users = await query(`
      SELECT 
        id,
        username,
        email,
        display_name,
        avatar_url,
        is_verified,
        verification_date,
        total_earnings,
        pending_earnings,
        paid_earnings,
        bank_account_name,
        bank_account_number,
        bank_name,
        mobile_money_number,
        mobile_money_provider,
        created_at
      FROM users
      ${whereClause}
      ORDER BY total_earnings DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    console.log(`👥 Utilisateurs récupérés: ${users.length}\n`);

    users.forEach(user => {
      console.log(`📊 ${user.display_name || user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Vérifié: ${user.is_verified ? 'Oui' : 'Non'}`);
      console.log(`   Total earnings: ${user.total_earnings || 0} XOF`);
      console.log(`   Pending earnings: ${user.pending_earnings || 0} XOF`);
      console.log(`   Paid earnings: ${user.paid_earnings || 0} XOF`);
      console.log('');
    });

    // Test de la route stats
    console.log('📈 Test de /admin/earnings/stats\n');

    const [totalStats] = await query(`
      SELECT 
        COUNT(DISTINCT user_id) as total_creators,
        SUM(amount) as total_earnings,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_earnings,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_earnings,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_earnings
      FROM user_earnings
    `);

    const [verifiedUsers] = await query(`
      SELECT COUNT(*) as count FROM users WHERE is_verified = TRUE
    `);

    console.log('📊 Statistiques globales:');
    console.log(`   Créateurs vérifiés: ${verifiedUsers.count || 0}`);
    console.log(`   Total créateurs avec revenus: ${totalStats.total_creators || 0}`);
    console.log(`   Total revenus: ${totalStats.total_earnings || 0} XOF`);
    console.log(`   En attente: ${totalStats.pending_earnings || 0} XOF`);
    console.log(`   Approuvés: ${totalStats.approved_earnings || 0} XOF`);
    console.log(`   Payés: ${totalStats.paid_earnings || 0} XOF`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    console.log('\n✓ Terminé');
    process.exit(0);
  }
}

testAdminAPI();
