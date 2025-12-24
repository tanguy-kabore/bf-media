/**
 * Migration: Add settings table
 * Created: 2025-12-24
 * Description: Creates the settings table for platform configuration
 */

module.exports = {
  async up(connection) {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_setting_key (setting_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Insert default settings
    await connection.query(`
      INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES
      ('platform_name', 'BF Media', 'string', 'Nom de la plateforme'),
      ('maintenance_mode', 'false', 'boolean', 'Mode maintenance activé/désactivé'),
      ('registrations_enabled', 'true', 'boolean', 'Inscriptions activées/désactivées'),
      ('email_verification_required', 'false', 'boolean', 'Vérification email requise'),
      ('default_storage_limit', '5368709120', 'number', 'Limite de stockage par défaut (5GB en bytes)'),
      ('max_video_size', '2147483648', 'number', 'Taille maximale vidéo (2GB en bytes)'),
      ('max_upload_size', '5368709120', 'number', 'Taille maximale upload (5GB en bytes)'),
      ('video_quality_options', '360,480,720,1080', 'string', 'Qualités vidéo disponibles'),
      ('comments_enabled', 'true', 'boolean', 'Commentaires activés globalement'),
      ('ads_enabled', 'true', 'boolean', 'Publicités activées')
      ON DUPLICATE KEY UPDATE setting_key = setting_key
    `);

    console.log('  ✓ Created settings table with default values');
  },

  async down(connection) {
    await connection.query('DROP TABLE IF EXISTS settings');
    console.log('  ✓ Dropped settings table');
  }
};
