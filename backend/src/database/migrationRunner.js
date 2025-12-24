require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

class MigrationRunner {
  constructor() {
    this.connection = null;
    this.migrationsDir = path.join(__dirname, 'migrations');
  }

  async connect() {
    this.connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bf_media',
      multipleStatements: true
    });
    console.log('✓ Connected to database');
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      console.log('✓ Disconnected from database');
    }
  }

  async createMigrationsTable() {
    await this.connection.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Migrations table ready');
  }

  async getExecutedMigrations() {
    const [rows] = await this.connection.query(
      'SELECT name FROM migrations ORDER BY id ASC'
    );
    return rows.map(row => row.name);
  }

  async getMigrationFiles() {
    try {
      const files = await fs.readdir(this.migrationsDir);
      return files
        .filter(f => f.endsWith('.js') && f !== 'README.md')
        .sort();
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('⚠ Migrations directory not found, creating...');
        await fs.mkdir(this.migrationsDir, { recursive: true });
        return [];
      }
      throw error;
    }
  }

  async runMigration(filename) {
    const migrationPath = path.join(this.migrationsDir, filename);
    const migration = require(migrationPath);

    if (!migration.up || typeof migration.up !== 'function') {
      throw new Error(`Migration ${filename} must export an 'up' function`);
    }

    console.log(`→ Running migration: ${filename}`);
    
    try {
      await this.connection.beginTransaction();
      await migration.up(this.connection);
      await this.connection.query(
        'INSERT INTO migrations (name) VALUES (?)',
        [filename]
      );
      await this.connection.commit();
      console.log(`✓ Migration ${filename} completed`);
    } catch (error) {
      await this.connection.rollback();
      console.error(`✗ Migration ${filename} failed:`, error.message);
      throw error;
    }
  }

  async rollbackMigration(filename) {
    const migrationPath = path.join(this.migrationsDir, filename);
    const migration = require(migrationPath);

    if (!migration.down || typeof migration.down !== 'function') {
      throw new Error(`Migration ${filename} must export a 'down' function for rollback`);
    }

    console.log(`← Rolling back migration: ${filename}`);
    
    try {
      await this.connection.beginTransaction();
      await migration.down(this.connection);
      await this.connection.query(
        'DELETE FROM migrations WHERE name = ?',
        [filename]
      );
      await this.connection.commit();
      console.log(`✓ Rollback ${filename} completed`);
    } catch (error) {
      await this.connection.rollback();
      console.error(`✗ Rollback ${filename} failed:`, error.message);
      throw error;
    }
  }

  async migrate() {
    try {
      await this.connect();
      await this.createMigrationsTable();

      const executed = await this.getExecutedMigrations();
      const available = await this.getMigrationFiles();
      const pending = available.filter(f => !executed.includes(f));

      if (pending.length === 0) {
        console.log('✓ No pending migrations');
        return;
      }

      console.log(`\nFound ${pending.length} pending migration(s):\n`);
      pending.forEach(f => console.log(`  - ${f}`));
      console.log('');

      for (const filename of pending) {
        await this.runMigration(filename);
      }

      console.log(`\n✓ All migrations completed successfully`);
    } catch (error) {
      console.error('\n✗ Migration failed:', error.message);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }

  async rollback() {
    try {
      await this.connect();
      await this.createMigrationsTable();

      const executed = await this.getExecutedMigrations();
      
      if (executed.length === 0) {
        console.log('✓ No migrations to rollback');
        return;
      }

      const lastMigration = executed[executed.length - 1];
      await this.rollbackMigration(lastMigration);

      console.log('\n✓ Rollback completed successfully');
    } catch (error) {
      console.error('\n✗ Rollback failed:', error.message);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }

  async status() {
    try {
      await this.connect();
      await this.createMigrationsTable();

      const executed = await this.getExecutedMigrations();
      const available = await this.getMigrationFiles();
      const pending = available.filter(f => !executed.includes(f));

      console.log('\n=== Migration Status ===\n');
      
      if (executed.length > 0) {
        console.log('Executed migrations:');
        executed.forEach(f => console.log(`  ✓ ${f}`));
      }

      if (pending.length > 0) {
        console.log('\nPending migrations:');
        pending.forEach(f => console.log(`  ○ ${f}`));
      }

      if (executed.length === 0 && pending.length === 0) {
        console.log('No migrations found');
      }

      console.log('');
    } catch (error) {
      console.error('\n✗ Status check failed:', error.message);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }

  async create(name) {
    if (!name) {
      console.error('✗ Migration name is required');
      console.log('Usage: npm run migrate:create <migration_name>');
      process.exit(1);
    }

    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const filename = `${timestamp}_${name}.js`;
    const filepath = path.join(this.migrationsDir, filename);

    const template = `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

module.exports = {
  /**
   * Apply migration changes
   * @param {import('mysql2/promise').Connection} connection
   */
  async up(connection) {
    // Add your migration code here
    // Example:
    // await connection.query(\`
    //   ALTER TABLE users 
    //   ADD COLUMN phone VARCHAR(20) AFTER email
    // \`);
  },

  /**
   * Rollback migration changes
   * @param {import('mysql2/promise').Connection} connection
   */
  async down(connection) {
    // Add your rollback code here
    // Example:
    // await connection.query(\`
    //   ALTER TABLE users 
    //   DROP COLUMN phone
    // \`);
  }
};
`;

    try {
      await fs.mkdir(this.migrationsDir, { recursive: true });
      await fs.writeFile(filepath, template);
      console.log(`✓ Created migration: ${filename}`);
    } catch (error) {
      console.error('✗ Failed to create migration:', error.message);
      process.exit(1);
    }
  }
}

// CLI
if (require.main === module) {
  const runner = new MigrationRunner();
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'up':
    case 'run':
      runner.migrate();
      break;
    case 'down':
    case 'rollback':
      runner.rollback();
      break;
    case 'status':
      runner.status();
      break;
    case 'create':
      runner.create(arg);
      break;
    default:
      console.log(`
BF Media - Database Migration Tool

Usage:
  node migrationRunner.js <command> [options]

Commands:
  run, up          Run all pending migrations
  rollback, down   Rollback the last migration
  status           Show migration status
  create <name>    Create a new migration file

Examples:
  node migrationRunner.js run
  node migrationRunner.js create add_phone_to_users
  node migrationRunner.js status
  node migrationRunner.js rollback
      `);
      process.exit(0);
  }
}

module.exports = MigrationRunner;
