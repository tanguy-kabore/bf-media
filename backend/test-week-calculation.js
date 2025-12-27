/**
 * Script pour tester le calcul des semaines
 */

require('dotenv').config();
const { query } = require('./src/config/database');

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function getWeekEnd(date = new Date()) {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

async function testWeekCalculation() {
  try {
    console.log('📅 Test du calcul des semaines\n');

    const now = new Date();
    console.log(`Date actuelle: ${now.toLocaleString('fr-FR')}`);
    console.log(`Jour de la semaine: ${now.toLocaleDateString('fr-FR', { weekday: 'long' })}\n`);

    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

    console.log('🗓️  Semaine actuelle (calculée):');
    console.log(`   Début: ${weekStart.toLocaleString('fr-FR')}`);
    console.log(`   Fin: ${weekEnd.toLocaleString('fr-FR')}\n`);

    // Vérifier les revenus dans cette période
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

    console.log(`👤 Utilisateur: ${user.display_name || user.username}\n`);

    // Revenus de la semaine actuelle
    const currentWeekEarnings = await query(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total,
        MIN(created_at) as first_earning,
        MAX(created_at) as last_earning
      FROM user_earnings
      WHERE user_id = ? 
        AND created_at >= ? 
        AND created_at <= ?
    `, [user.id, weekStart, weekEnd]);

    console.log('💰 Revenus de la semaine actuelle:');
    console.log(`   Nombre d'entrées: ${currentWeekEarnings[0].count}`);
    console.log(`   Total: ${currentWeekEarnings[0].total} XOF`);
    if (currentWeekEarnings[0].first_earning) {
      console.log(`   Premier revenu: ${new Date(currentWeekEarnings[0].first_earning).toLocaleString('fr-FR')}`);
      console.log(`   Dernier revenu: ${new Date(currentWeekEarnings[0].last_earning).toLocaleString('fr-FR')}`);
    }
    console.log('');

    // Tous les revenus
    const allEarnings = await query(`
      SELECT 
        id,
        amount,
        description,
        created_at
      FROM user_earnings
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [user.id]);

    console.log('📝 Derniers revenus enregistrés:');
    allEarnings.forEach(e => {
      const date = new Date(e.created_at);
      const isThisWeek = date >= weekStart && date <= weekEnd;
      console.log(`   ${isThisWeek ? '✓' : '✗'} ${e.amount} XOF - ${e.description}`);
      console.log(`      ${date.toLocaleString('fr-FR')}`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    console.log('\n✓ Test terminé');
    process.exit(0);
  }
}

testWeekCalculation();
