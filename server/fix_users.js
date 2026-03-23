const { query, pool } = require('./models/db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function fix() {
  const hash = await bcrypt.hash('password123', 10);
  const depts = ['d1','d2','d3','d4','d5','d6','d7','d8'];
  for (const d of depts) {
    await query(`
      INSERT INTO users (name, email, password_hash, role, department_id, active)
      VALUES ($1, $2, $3, 'field_officer', $4, true)
      ON CONFLICT (email) DO NOTHING
    `, ['Officer ' + d, 'officer_' + d + '@pscrm.in', hash, d]);
  }
  await query(`
    INSERT INTO officer_load (officer_id, active_count)
    SELECT id, 0 FROM users WHERE role = 'field_officer'
    ON CONFLICT DO NOTHING
  `);
  console.log('Done mapping officers to all departments.');
  process.exit(0);
}

fix().catch(e => {
  console.error(e);
  process.exit(1);
});
