const pool = require('../config/database');

async function inspectMore() {
    const tables = ['categories', 'subcategories', 'services', 'pricing_zones', 'location_zones', 'pricing_settings', 'district_pricing_tiers'];
    for (const t of tables) {
        const rows = await pool.query(`SELECT * FROM "${t}" LIMIT 15`);
        console.log(`\n=== ALL/SAMPLE ROWS FOR ${t} (${rows.rows.length}) ===`);
        console.log(JSON.stringify(rows.rows, null, 2));
    }
    process.exit(0);
}

inspectMore().catch(e => { console.error(e); process.exit(1); });
