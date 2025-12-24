/**
 * Migration: Add admin tables
 * Created: 2025-12-24
 * Description: Creates admin-specific tables (ads, reports, etc.)
 */

module.exports = {
  async up(connection) {
    // Platform settings table (if not exists from older schema)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_key (setting_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Ads table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ads (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        ad_type ENUM('banner', 'video', 'sponsored') NOT NULL,
        media_url VARCHAR(500),
        click_url VARCHAR(500),
        position ENUM('header', 'sidebar', 'in_feed', 'footer', 'pre_roll', 'mid_roll', 'post_roll') NOT NULL,
        target_audience JSON,
        start_date DATETIME,
        end_date DATETIME,
        budget DECIMAL(10,2),
        spent DECIMAL(10,2) DEFAULT 0,
        impressions INT DEFAULT 0,
        clicks INT DEFAULT 0,
        status ENUM('draft', 'active', 'paused', 'completed', 'archived') DEFAULT 'draft',
        priority INT DEFAULT 0,
        created_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_status (status),
        INDEX idx_position (position),
        INDEX idx_dates (start_date, end_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Reports table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id VARCHAR(36) PRIMARY KEY,
        reporter_id VARCHAR(36) NOT NULL,
        target_type ENUM('video', 'comment', 'user', 'channel') NOT NULL,
        target_id VARCHAR(36) NOT NULL,
        reason ENUM('spam', 'harassment', 'hate_speech', 'violence', 'copyright', 'misinformation', 'other') NOT NULL,
        description TEXT,
        status ENUM('pending', 'reviewing', 'resolved', 'dismissed') DEFAULT 'pending',
        reviewed_by VARCHAR(36),
        reviewed_at DATETIME,
        resolution_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_status (status),
        INDEX idx_target (target_type, target_id),
        INDEX idx_reporter (reporter_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // System logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        level ENUM('info', 'warning', 'error', 'critical') NOT NULL,
        category VARCHAR(50),
        message TEXT NOT NULL,
        context JSON,
        user_id VARCHAR(36),
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_level (level),
        INDEX idx_category (category),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('  ✓ Created admin tables (ads, reports, system_logs)');
  },

  async down(connection) {
    await connection.query('DROP TABLE IF EXISTS system_logs');
    await connection.query('DROP TABLE IF EXISTS reports');
    await connection.query('DROP TABLE IF EXISTS ads');
    await connection.query('DROP TABLE IF EXISTS platform_settings');
    console.log('  ✓ Dropped admin tables');
  }
};
