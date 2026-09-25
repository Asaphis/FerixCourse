// Runs Backend/migrations/*.sql against DATABASE_URL.
// Usage: npm run db:migrate
require('dotenv/config');
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    console.log(`[migrate] applying ${f}...`);
    await pool.query(fs.readFileSync(path.join(dir, f), 'utf8'));
    console.log(`[migrate] ${f} done`);
  }
  await pool.end();
  console.log('[migrate] all done');
}

main().catch((e) => { console.error('[migrate] failed:', e.message); process.exit(1); });
