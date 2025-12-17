require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

async function createAdminTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bf_media',
    multipleStatements: true
  });

  console.log('Creating admin tables...');

  try {
    // Add storage columns to users table
    await connection.execute(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS storage_limit BIGINT DEFAULT 5368709120,
      ADD COLUMN IF NOT EXISTS storage_used BIGINT DEFAULT 0
    `).catch(() => {
      console.log('Storage columns may already exist');
    });

    // Create ads table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ads (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        ad_type ENUM('video_pre', 'video_mid', 'video_post', 'banner', 'sidebar', 'overlay') NOT NULL,
        media_url VARCHAR(500),
        target_url VARCHAR(500),
        duration INT DEFAULT 0,
        position VARCHAR(50),
        priority INT DEFAULT 1,
        status ENUM('active', 'paused', 'ended', 'draft') DEFAULT 'draft',
        start_date DATETIME,
        end_date DATETIME,
        budget DECIMAL(10, 2) DEFAULT 0,
        spent DECIMAL(10, 2) DEFAULT 0,
        cpm DECIMAL(10, 4) DEFAULT 0,
        impressions BIGINT DEFAULT 0,
        clicks BIGINT DEFAULT 0,
        revenue DECIMAL(10, 2) DEFAULT 0,
        target_countries TEXT,
        target_devices TEXT,
        target_categories TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_ad_type (ad_type),
        INDEX idx_dates (start_date, end_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Ads table created');

    // Create ad impressions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ad_impressions (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        ad_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36),
        video_id VARCHAR(36),
        ip_address VARCHAR(45),
        device_type VARCHAR(50),
        country VARCHAR(2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE,
        INDEX idx_ad_id (ad_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Ad impressions table created');

    // Create ad clicks table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ad_clicks (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        ad_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36),
        video_id VARCHAR(36),
        ip_address VARCHAR(45),
        device_type VARCHAR(50),
        country VARCHAR(2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE,
        INDEX idx_ad_id (ad_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Ad clicks table created');

    // Create platform settings table
    await connection.execute(`
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
    console.log('✓ Platform settings table created');

    // Insert default settings
    const defaultSettings = [
      ['default_storage_limit', '5368709120', 'number', 'Default storage limit per user (5GB)'],
      ['max_video_size', '2147483648', 'number', 'Maximum video file size (2GB)'],
      ['max_video_duration', '7200', 'number', 'Maximum video duration in seconds (2 hours)'],
      ['ads_enabled', 'true', 'boolean', 'Enable ads on the platform'],
      ['registration_enabled', 'true', 'boolean', 'Allow new user registrations'],
      ['email_verification_required', 'false', 'boolean', 'Require email verification'],
      ['default_video_visibility', 'public', 'string', 'Default visibility for new videos'],
      ['maintenance_mode', 'false', 'boolean', 'Enable maintenance mode'],
      ['platform_name', 'Tipoko', 'string', 'Platform name'],
      ['platform_description', 'Plateforme de partage de vidéos', 'string', 'Platform description']
    ];

    for (const [key, value, type, desc] of defaultSettings) {
      await connection.execute(`
        INSERT IGNORE INTO platform_settings (setting_key, setting_value, setting_type, description)
        VALUES (?, ?, ?, ?)
      `, [key, value, type, desc]);
    }
    console.log('✓ Default settings inserted');

    // Create reports table if not exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS reports (
        id VARCHAR(36) PRIMARY KEY,
        reporter_id VARCHAR(36) NOT NULL,
        target_type ENUM('video', 'comment', 'channel', 'user') NOT NULL,
        target_id VARCHAR(36) NOT NULL,
        reason ENUM('spam', 'harassment', 'hate_speech', 'violence', 'sexual_content', 'copyright', 'misinformation', 'other') NOT NULL,
        description TEXT,
        status ENUM('pending', 'reviewed', 'resolved', 'dismissed') DEFAULT 'pending',
        action_taken TEXT,
        reviewed_by VARCHAR(36),
        reviewed_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_status (status),
        INDEX idx_target (target_type, target_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Reports table created');

    // Create verification_requests table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS verification_requests (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        document_type ENUM('national_id', 'passport') NOT NULL,
        document_front_url VARCHAR(500) NOT NULL,
        document_back_url VARCHAR(500),
        full_name VARCHAR(255) NOT NULL,
        date_of_birth DATE,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        rejection_reason TEXT,
        reviewed_by VARCHAR(36),
        reviewed_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Verification requests table created');

    // Add verification fields to users table
    try {
      await connection.execute(`ALTER TABLE users ADD COLUMN verification_badge BOOLEAN DEFAULT FALSE`);
      console.log('✓ verification_badge column added');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.log('verification_badge column may already exist');
    }
    try {
      await connection.execute(`ALTER TABLE users ADD COLUMN verified_at DATETIME`);
      console.log('✓ verified_at column added');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.log('verified_at column may already exist');
    }

    console.log('\n✅ All admin tables created successfully!');

  } catch (error) {
    console.error('Error creating admin tables:', error.message);
  } finally {
    await connection.end();
  }
}

createAdminTables();
