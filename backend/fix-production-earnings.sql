-- Script SQL pour créer la table weekly_earnings sur le serveur de production
-- À exécuter sur le serveur : mysql -u root -p bf_media < fix-production-earnings.sql

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vérifier que les colonnes earnings existent dans la table users
-- Si elles n'existent pas, les ajouter
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_earnings DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS paid_earnings DECIMAL(10, 2) DEFAULT 0;

SELECT 'Table weekly_earnings créée avec succès!' as message;
