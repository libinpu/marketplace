const pool = require('../config/database');

async function checkPalakkad() {
    try {
        const res = await pool.query("SELECT * FROM professionals WHERE district ILIKE '%Palakkad%' OR city ILIKE '%Palakkad%' OR city ILIKE '%Ottappalam%'");
        console.log('Palakkad pros count:', res.rows.length);
        if (res.rows.length > 0) {
            console.log(res.rows);
        }
    } finally {
        process.exit(0);
    }
}
checkPalakkad();
