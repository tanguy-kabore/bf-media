/**
 * Migration: Initial database schema
 * Created: 2025-12-24
 * Description: Creates all base tables for the BF Media platform
 */

module.exports = {
  async up(connection) {
    // This migration uses the existing migrate.js schema
    const fs = require('fs');
    const path = require('path');
    const migratePath = path.join(__dirname, '../migrate.js');
    
    // Read the existing migrate.js file
    const migrateContent = fs.readFileSync(migratePath, 'utf8');
    
    // Extract the SQL from the migrations variable
    const sqlMatch = migrateContent.match(/const migrations = `([\s\S]*?)`;/);
    if (!sqlMatch) {
      throw new Error('Could not extract SQL from migrate.js');
    }
    
    const sql = sqlMatch[1];
    
    // Execute the SQL
    await connection.query(sql);
    
    console.log('  ✓ Created all base tables');
  },

  async down(connection) {
    // Drop all tables in reverse order of dependencies
    const tables = [
      'video_analytics',
      'activity_logs',
      'notifications',
      'watch_history',
      'playlists',
      'playlist_videos',
      'subscriptions',
      'comment_likes',
      'video_likes',
      'comments',
      'video_tags',
      'tags',
      'video_qualities',
      'videos',
      'categories',
      'channels',
      'users'
    ];

    for (const table of tables) {
      await connection.query(`DROP TABLE IF EXISTS ${table}`);
    }
    
    console.log('  ✓ Dropped all base tables');
  }
};
