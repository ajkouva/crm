require('dotenv').config();
const { query } = require('./models/db');

async function flushData() {
  try {
    console.log('Flushing temporary complaint data...');
    
    await query('TRUNCATE TABLE complaints CASCADE');
    await query('TRUNCATE TABLE notifications CASCADE');
    await query('TRUNCATE TABLE audit_logs CASCADE');
    await query('UPDATE officer_load SET active_count = 0, last_assigned = NULL');
    
    console.log('✅ Temporary data successfully wiped.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error flushing data:', err);
    process.exit(1);
  }
}

flushData();
