const pool = require('../config/database');

async function checkProsByCategory() {
    try {
        const res = await pool.query("SELECT id, full_name, category, city, district, verification_status FROM professionals ORDER BY category, id");
        console.table(res.rows);
    } finally {
        process.exit(0);
    }
}
checkProsByCategory();
