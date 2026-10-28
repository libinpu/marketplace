const pool = require('../config/database');

async function getCategories() {
    try {
        const cats = await pool.query('SELECT id, name, price_estimate FROM categories ORDER BY id');
        console.log(cats.rows);
    } finally {
        process.exit(0);
    }
}
getCategories();
