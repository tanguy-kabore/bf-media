/**
 * Script pour créer la table weekly_earnings
 */

require('dotenv').config();
const { query } = require('./src/config/database');

async function createWeeklyEarningsTable() {
  try {
    console.log('🔧 Création de la table weekly_earnings...\n');

    await query(`
      CREATE TABLE IF NOT EXISTS weekly_earnings (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        week_number VARCHAR(10) NOT NULL,
        week_start DATE NOT NULL,
        week_end DATE NOT NULL,
        total_views INT DEFAULT 0,
        total_watch_minutes INT DEFAULT 0,
        total_earnings DECIMAL(10, 2) DEFAULT 0,
        status ENUM('pending', 'approved', 'paid') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_week (user_id, week_number),
        INDEX idx_user_week (user_id, week_number),
        INDEX idx_week_number (week_number),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Table weekly_earnings créée avec succès!\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    console.log('✓ Terminé');
    process.exit(0);
  }
}

createWeeklyEarningsTable();
