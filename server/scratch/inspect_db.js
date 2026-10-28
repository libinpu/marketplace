const pool = require('../config/database');

async function inspect() {
    const tables = [
        'categories',
        'subcategories',
        'services',
        'pricing_zones',
        'location_zones',
        'pricing_settings',
        'price_history',
        'district_pricing_tiers',
        'professionals',
        'service_requests'
    ];

    for (const t of tables) {
        try {
            const cols = await pool.query(
                "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
                [t]
            );
            const count = await pool.query(`SELECT count(*) FROM "${t}"`);
            const sample = await pool.query(`SELECT * FROM "${t}" LIMIT 3`);
            console.log(`\n=== TABLE: ${t} (ROWS: ${count.rows[0].count}) ===`);
            console.log(cols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));
            console.log('Sample rows:', JSON.stringify(sample.rows, null, 2));
        } catch (err) {
            console.log(`Table ${t} error:`, err.message);
        }
    }
    process.exit(0);
}

inspect().catch(err => {
    console.error(err);
    process.exit(1);
});
