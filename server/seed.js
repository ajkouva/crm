/**
 * seed.js — populate the database with demo users and complaints.
 * Run once after initDB: node seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, initDB, pool } = require('./models/db');

async function seed() {
  console.log('🌱  Seeding database…');
  await initDB();

  // ── Demo users ─────────────────────────────────────────────────────────────
  const hash = await bcrypt.hash('password123', 12);

  const users = [
    { name: 'Super Admin',          email: 'admin@pscrm.in',       role: 'super_admin',   dept: null },
    { name: 'District Collector',   email: 'collector@pscrm.in',   role: 'collector',     dept: null },
    { name: 'Ravi Kumar',           email: 'ravi@water.in',        role: 'field_officer', dept: 'd1' },
    { name: 'Priya Sharma',         email: 'priya@water.in',       role: 'field_officer', dept: 'd1' },
    { name: 'Amit Singh',           email: 'amit@roads.in',        role: 'field_officer', dept: 'd2' },
    { name: 'Sunita Patel',         email: 'sunita@roads.in',      role: 'field_officer', dept: 'd2' },
    { name: 'Dept Head Water',      email: 'head.water@pscrm.in',  role: 'dept_head',     dept: 'd1' },
    { name: 'Dept Head Roads',      email: 'head.roads@pscrm.in',  role: 'dept_head',     dept: 'd2' },
    { name: 'Rahul Citizen',        email: 'rahul@example.com',    role: 'citizen',       dept: null },
    { name: 'Meera Nair',           email: 'meera@example.com',    role: 'citizen',       dept: null },
  ];

  // Auto-fill an officer for every department so assignment never fails
  const depts = ['d1','d2','d3','d4','d5','d6','d7','d8'];
  for (const d of depts) {
    users.push({ name: `Officer ${d.toUpperCase()}`, email: `officer_${d}@pscrm.in`, role: 'field_officer', dept: d });
  }

  for (const u of users) {
    await query(`
      INSERT INTO users (name, email, password_hash, role, department_id, active, email_verified)
      VALUES ($1,$2,$3,$4,$5,TRUE,TRUE)
      ON CONFLICT (email) DO UPDATE SET
        password_hash  = EXCLUDED.password_hash,
        role           = EXCLUDED.role,
        department_id  = EXCLUDED.department_id,
        name           = EXCLUDED.name,
        active         = TRUE,
        email_verified = TRUE
    `, [u.name, u.email, hash, u.role, u.dept]);
  }
  console.log('  ✓ Users seeded');

  // Init officer_load rows
  await query(`
    INSERT INTO officer_load (officer_id, active_count)
    SELECT id, 0 FROM users WHERE role = 'field_officer'
    ON CONFLICT DO NOTHING
  `);

  // ── Demo complaints ────────────────────────────────────────────────────────
  const { rows: [citizen] } = await query(`SELECT id FROM users WHERE email='rahul@example.com'`);
  const cid = citizen.id;

  const now = new Date();
  function hoursAgo(h) { return new Date(now - h * 3600000); }

  const complaints = [
    { title: 'Water pipe burst on MG Road', description: 'A major water pipe has burst near MG Road junction, flooding the road and causing disruption to traffic and water supply.', location: 'MG Road, Ward 5', dept: 'd1', priority: 'P1', status: 'escalated', createdAt: hoursAgo(30), lat: 28.6139 + (Math.random()*0.1 - 0.05), lng: 77.2090 + (Math.random()*0.1 - 0.05) },
    { title: 'Pothole causing accidents', description: 'There is a large pothole on the main highway near the bus stop. Two vehicles have already been damaged. Needs urgent repair.', location: 'Highway 24, Bus Stop 7', dept: 'd2', priority: 'P2', status: 'in_progress', createdAt: hoursAgo(20), lat: 28.6139 + (Math.random()*0.1 - 0.05), lng: 77.2090 + (Math.random()*0.1 - 0.05) },
    { title: 'Garbage not collected for 5 days', description: 'The garbage has not been collected for the past 5 days in our area. It is creating a severe hygiene problem.', location: 'Sector 9, Block B', dept: 'd3', priority: 'P2', status: 'assigned', createdAt: hoursAgo(10), lat: 28.6139 + (Math.random()*0.1 - 0.05), lng: 77.2090 + (Math.random()*0.1 - 0.05) },
    { title: 'Street light out on entire block', description: 'All street lights on our block have been non-functional for a week. This is creating a safety hazard at night.', location: 'Civil Lines, Block 4', dept: 'd4', priority: 'P3', status: 'new', createdAt: hoursAgo(5), lat: 28.6139 + (Math.random()*0.1 - 0.05), lng: 77.2090 + (Math.random()*0.1 - 0.05) },
    { title: 'Sewage overflow near school', description: 'Sewage is overflowing near the primary school on Park Street. Children are exposed to health risks. Emergency action needed.', location: 'Park Street Primary School', dept: 'd3', priority: 'P1', status: 'resolved', createdAt: hoursAgo(48), lat: 28.6139 + (Math.random()*0.1 - 0.05), lng: 77.2090 + (Math.random()*0.1 - 0.05) },
  ];

  for (const c of complaints) {
    const tid = 'CMP-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,5).toUpperCase();
    const sla = new Date(c.createdAt);
    sla.setHours(sla.getHours() + ({ P1: 24, P2: 72, P3: 168 }[c.priority]));

    const resolvedAt = c.status === 'resolved' ? hoursAgo(2) : null;

    await query(`
      INSERT INTO complaints
        (ticket_id, user_id, citizen_name, title, description, location, lat, lng, category, department_id,
         priority, status, language, sla_deadline, resolved_at, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'en',$13,$14,$15,$15)
      ON CONFLICT DO NOTHING
    `, [tid, cid, 'Rahul Citizen', c.title, c.description, c.location, c.lat, c.lng,
        c.dept === 'd1' ? 'Water Supply' : c.dept === 'd2' ? 'Roads & Infrastructure' : c.dept === 'd3' ? 'Sanitation' : 'Electricity',
        c.dept, c.priority, c.status, sla, resolvedAt, c.createdAt]);
  }
  console.log('  ✓ Complaints seeded');
  console.log('\n📋  Demo credentials (password: password123)');
  console.log('   admin@pscrm.in        — Super Admin');
  console.log('   collector@pscrm.in    — Collector');
  console.log('   head.water@pscrm.in   — Dept Head (Water)');
  console.log('   ravi@water.in         — Field Officer (Water)');
  console.log('   rahul@example.com     — Citizen');

  await pool.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
