const pool = require('../config/database');

async function run() {
    try {
        const tables = ['location_zones', 'pricing_zones', 'pricing_settings', 'services', 'price_history'];
        for (const t of tables) {
            const count = await pool.query(`SELECT count(*) FROM "${t}"`);
            const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1", [t]);
            const rows = await pool.query(`SELECT * FROM "${t}" LIMIT 10`);
            console.log(`\n=== ${t} (${count.rows[0].count} rows) ===`);
            console.log("Columns:", cols.rows.map(c => `${c.column_name}: ${c.data_type}`).join(', '));
            console.log("Rows:", JSON.stringify(rows.rows, null, 2));
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
