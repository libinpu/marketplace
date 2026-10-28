const pool = require('../config/database');

async function inspect() {
  const tables = [
    'categories',
    'subcategories',
    'service_requests',
    'location_category_prices',
    'district_pricing_tiers',
    'pricing_settings',
    'pricing_zones',
    'location_zones',
    'price_history'
  ];

  for (const table of tables) {
    const cols = await pool.query(
      'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position',
      [table]
    );
    console.log(`\n=== TABLE: ${table} ===`);
    console.log(cols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));
  }
  process.exit(0);
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
