const pool = require('../config/database');

async function verifyScenarioPrices() {
    try {
        const res = await pool.query(`
            SELECT district, city, category_name, price, currency, is_active, updated_at
            FROM location_category_prices
            WHERE (city = 'Ottappalam' AND category_name = 'Plumbing')
               OR (city = 'Kottayam' AND category_name IN ('Plumbing', 'Electrical', 'Gardening & Landscaping'))
               OR (city = 'Thrissur' AND category_name = 'Plumbing')
            ORDER BY district, city, category_name
        `);
        console.table(res.rows);
    } finally {
        process.exit(0);
    }
}
verifyScenarioPrices();
