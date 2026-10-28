const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });
const p = new Pool({ connectionString: process.env.DATABASE_URL });
p.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='service_requests'").then(r => {
  console.log(r.rows);
  p.end();
});
