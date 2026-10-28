const pool = require('../config/database');

async function run() {
    try {
        const tablesRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);
        console.log('Tables:', tablesRes.rows.map(r => r.table_name));

        const cats = await pool.query('SELECT * FROM categories');
        console.log('Categories:', cats.rows);

        const subcats = await pool.query('SELECT id, name, category_name, price_estimate FROM subcategories LIMIT 10');
        console.log('Sample Subcategories:', subcats.rows);

        const districts = await pool.query('SELECT * FROM district_pricing_tiers');
        console.log('District pricing tiers:', districts.rows);

        const pros = await pool.query('SELECT id, full_name, category, city, district, address, work_radius, is_online FROM professionals LIMIT 10');
        console.log('Sample Pros:', pros.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

run();
