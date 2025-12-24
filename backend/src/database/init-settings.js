require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { createSettingsTable } = require('./settings_table');

async function init() {
  try {
    console.log('Initializing settings table...');
    await createSettingsTable();
    console.log('Settings table initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to initialize settings table:', error);
    process.exit(1);
  }
}

init();
