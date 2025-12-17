require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

async function addColumns() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bf_media'
    });

    console.log('🔄 Adding missing analytics columns...');

    // Add browser column if not exists
    try {
      await connection.query('ALTER TABLE video_views ADD COLUMN browser VARCHAR(50)');
      console.log('✅ Added browser column');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ browser column already exists');
      } else {
        throw e;
      }
    }

    // Add os column if not exists
    try {
      await connection.query('ALTER TABLE video_views ADD COLUMN os VARCHAR(50)');
      console.log('✅ Added os column');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ os column already exists');
      } else {
        throw e;
      }
    }

    // Add is_returning column if not exists
    try {
      await connection.query('ALTER TABLE video_views ADD COLUMN is_returning BOOLEAN DEFAULT FALSE');
      console.log('✅ Added is_returning column');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ is_returning column already exists');
      } else {
        throw e;
      }
    }

    // Update country column to VARCHAR(100) for full country names
    try {
      await connection.query('ALTER TABLE video_views MODIFY COLUMN country VARCHAR(100)');
      console.log('✅ Updated country column size');
    } catch (e) {
      console.log('ℹ️ country column already correct or error:', e.message);
    }

    // Add indexes for better performance
    try {
      await connection.query('CREATE INDEX idx_browser ON video_views(browser)');
      console.log('✅ Added browser index');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️ browser index already exists');
      }
    }

    try {
      await connection.query('CREATE INDEX idx_os ON video_views(os)');
      console.log('✅ Added os index');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️ os index already exists');
      }
    }

    console.log('\n✅ All analytics columns added successfully!');
    console.log('📊 New views will now collect: browser, OS, device type, returning status');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addColumns();
