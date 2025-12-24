/**
 * Migration: Add phone column to users
 * Created: 2025-12-24
 * Description: Example migration showing how to add a new column
 */

module.exports = {
  async up(connection) {
    // Check if column already exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'phone'
    `);

    if (columns.length === 0) {
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN phone VARCHAR(20) AFTER email,
        ADD INDEX idx_phone (phone)
      `);
      console.log('  ✓ Added phone column to users table');
    } else {
      console.log('  ⚠ Phone column already exists, skipping');
    }
  },

  async down(connection) {
    await connection.query(`
      ALTER TABLE users 
      DROP INDEX idx_phone,
      DROP COLUMN phone
    `);
    console.log('  ✓ Removed phone column from users table');
  }
};
