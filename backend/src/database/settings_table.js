const { query } = require('../config/database');

async function createSettingsTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type ENUM('string', 'boolean', 'number') DEFAULT 'string',
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Settings table created successfully');

    // Insert default settings if they don't exist
    const defaultSettings = [
      { key: 'platform_name', value: 'Tipoko', type: 'string', description: 'Nom de la plateforme affiché partout sur le site' },
      { key: 'maintenance_mode', value: 'false', type: 'boolean', description: 'Bloquer l\'accès au site pour maintenance' },
      { key: 'registrations_enabled', value: 'true', type: 'boolean', description: 'Permettre les nouveaux comptes' },
      { key: 'default_storage_limit', value: '5368709120', type: 'number', description: 'Espace pour les nouveaux utilisateurs (en octets)' },
      { key: 'max_video_size', value: '2147483648', type: 'number', description: 'Taille maximale par fichier vidéo (en octets)' },
      { key: 'ads_enabled', value: 'true', type: 'boolean', description: 'Afficher les publicités sur le site' },
      { key: 'max_upload_size', value: '5368709120', type: 'number', description: 'Taille maximale de fichier uploadable (en octets)' },
      { key: 'video_quality_options', value: '360,480,720,1080', type: 'string', description: 'Qualités vidéo disponibles' },
      { key: 'comments_enabled', value: 'true', type: 'boolean', description: 'Permettre les commentaires' },
      { key: 'email_verification_required', value: 'false', type: 'boolean', description: 'Vérification email obligatoire' }
    ];

    for (const setting of defaultSettings) {
      await query(`
        INSERT INTO settings (setting_key, setting_value, setting_type, description)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE setting_key = setting_key
      `, [setting.key, setting.value, setting.type, setting.description]);
    }

    console.log('Default settings inserted successfully');
  } catch (error) {
    console.error('Error creating settings table:', error);
    throw error;
  }
}

module.exports = { createSettingsTable };
