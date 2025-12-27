/**
 * Migration: Create earnings and payments system
 * Created: 2025-12-24
 * Description: Creates tables for tracking user earnings, payments, and transactions
 */

module.exports = {
  async up(connection) {
    // Table pour les revenus des utilisateurs
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_earnings (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        video_id VARCHAR(36),
        session_id VARCHAR(255),
        earning_type ENUM('view', 'ad', 'subscription', 'donation', 'like', 'comment', 'share', 'other') NOT NULL,
        amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'XOF',
        description TEXT,
        status ENUM('pending', 'approved', 'paid') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE SET NULL,
        INDEX idx_user_earnings (user_id, status),
        INDEX idx_created_at (created_at),
        INDEX idx_earning_type (earning_type),
        INDEX idx_session_id (session_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Table pour les paiements effectués
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'XOF',
        payment_method ENUM('bank_transfer', 'mobile_money', 'cash', 'other') DEFAULT 'bank_transfer',
        payment_reference VARCHAR(255),
        status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
        notes TEXT,
        paid_by VARCHAR(36),
        paid_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_payments (user_id, status),
        INDEX idx_paid_at (paid_at),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Table pour les revenus hebdomadaires
    await connection.query(`
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

    // Table pour l'historique des transactions
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id VARCHAR(36) PRIMARY KEY,
        payment_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'XOF',
        transaction_type ENUM('earning', 'payment', 'refund', 'adjustment') NOT NULL,
        description TEXT,
        metadata JSON,
        created_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_payment_transactions (payment_id),
        INDEX idx_user_transactions (user_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Ajouter des colonnes au tableau users pour le statut de vérification et les infos bancaires
    // MySQL ne supporte pas IF NOT EXISTS pour ADD COLUMN, donc on utilise une approche try-catch
    const columnsToAdd = [
      { name: 'is_verified', definition: 'BOOLEAN DEFAULT FALSE' },
      { name: 'verification_date', definition: 'TIMESTAMP NULL' },
      { name: 'bank_account_name', definition: 'VARCHAR(255)' },
      { name: 'bank_account_number', definition: 'VARCHAR(100)' },
      { name: 'bank_name', definition: 'VARCHAR(255)' },
      { name: 'mobile_money_number', definition: 'VARCHAR(50)' },
      { name: 'mobile_money_provider', definition: 'VARCHAR(50)' },
      { name: 'total_earnings', definition: 'DECIMAL(10, 2) DEFAULT 0' },
      { name: 'pending_earnings', definition: 'DECIMAL(10, 2) DEFAULT 0' },
      { name: 'paid_earnings', definition: 'DECIMAL(10, 2) DEFAULT 0' }
    ];

    for (const col of columnsToAdd) {
      try {
        await connection.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.definition}`);
      } catch (err) {
        // Ignorer l'erreur si la colonne existe déjà (code 1060)
        if (err.code !== 'ER_DUP_FIELDNAME' && err.errno !== 1060) {
          throw err;
        }
      }
    }

    console.log('  ✓ Created earnings system tables');
  },

  async down(connection) {
    await connection.query('DROP TABLE IF EXISTS payment_transactions');
    await connection.query('DROP TABLE IF EXISTS weekly_earnings');
    await connection.query('DROP TABLE IF EXISTS payments');
    await connection.query('DROP TABLE IF EXISTS user_earnings');
    
    // MySQL ne supporte pas DROP COLUMN IF EXISTS, utiliser try-catch
    const columnsToDrop = [
      'is_verified', 'verification_date', 'bank_account_name', 
      'bank_account_number', 'bank_name', 'mobile_money_number',
      'mobile_money_provider', 'total_earnings', 'pending_earnings', 'paid_earnings'
    ];

    for (const col of columnsToDrop) {
      try {
        await connection.query(`ALTER TABLE users DROP COLUMN ${col}`);
      } catch (err) {
        // Ignorer si la colonne n'existe pas
        if (err.errno !== 1091) {
          throw err;
        }
      }
    }
    
    console.log('  ✓ Dropped earnings system tables');
  }
};
