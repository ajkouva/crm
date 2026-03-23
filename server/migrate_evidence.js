require('dotenv').config();
const { pool } = require('./models/db');

async function migrate() {
  try {
    console.log('Migrating database...');
    await pool.query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolved_media_urls JSONB DEFAULT '[]'::jsonb;`);
    console.log('Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
