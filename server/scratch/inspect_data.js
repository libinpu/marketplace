const pool = require('../config/database');

async function inspectData() {
    try {
        console.log('--- ALL CATEGORIES ---');
        const cats = await pool.query('SELECT id, name, price_estimate FROM categories ORDER BY id');
        console.table(cats.rows);

        console.log('--- ALL PROFESSIONALS (DISTRICTS & CITIES) ---');
        const pros = await pool.query(`
            SELECT id, full_name, category, district, city, address, work_location_name, work_radius 
            FROM professionals 
            ORDER BY id
        `);
        console.table(pros.rows);

        console.log('--- DISTINCT CITIES & DISTRICTS IN PROFESSIONALS ---');
        const distPros = await pool.query(`
            SELECT DISTINCT district, city FROM professionals WHERE city IS NOT NULL ORDER BY district, city
        `);
        console.table(distPros.rows);

        console.log('--- DISTRICT PRICING TIERS ---');
        const tiers = await pool.query('SELECT * FROM district_pricing_tiers ORDER BY id');
        console.table(tiers.rows);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

inspectData();
