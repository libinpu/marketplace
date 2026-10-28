const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, '../migrations/024_create_location_category_pricing.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Running migration 024...');
        await pool.query(sql);
        console.log('Migration 024 applied successfully!');

        const sample = await pool.query('SELECT district, city, category_name, price, is_active FROM location_category_prices ORDER BY district, city, category_name LIMIT 15');
        console.table(sample.rows);
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        process.exit(0);
    }
}
runMigration();
