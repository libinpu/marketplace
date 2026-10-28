const pool = require('../config/database');
const { lookupServicePrice, getLocationPricing } = require('../controllers/adminController');

async function testLookups() {
    console.log('Testing lookups directly with DB query logic:');
    const cases = [
        { city: 'Ottappalam', category: 'Plumbing', expected: 140 },
        { city: 'Kottayam', category: 'Plumbing', expected: 200 },
        { city: 'Kottayam', category: 'Electrical', expected: 250 },
        { city: 'Kottayam', category: 'Gardening & Landscaping', expected: 180 },
        { city: 'Thrissur', category: 'Plumbing', expected: 160 }
    ];

    for (const c of cases) {
        const res = await pool.query(`
            SELECT * FROM location_category_prices
            WHERE LOWER(city) = LOWER($1) AND LOWER(category_name) = LOWER($2) AND is_active = TRUE
        `, [c.city, c.category]);
        if (res.rows.length === 0) {
            console.error(`FAILED: No price found for ${c.city} - ${c.category}`);
        } else {
            const actual = Number(res.rows[0].price);
            if (actual === c.expected) {
                console.log(`PASS: ${c.city} - ${c.category} => ₹${actual} (Expected: ₹${c.expected})`);
            } else {
                console.error(`FAIL: ${c.city} - ${c.category} => ₹${actual} (Expected: ₹${c.expected})`);
            }
        }
    }

    // Missing price case (Scenario E)
    const missingRes = await pool.query(`
        SELECT * FROM location_category_prices
        WHERE LOWER(city) = LOWER($1) AND LOWER(category_name) = LOWER($2) AND is_active = TRUE
    `, ['NonExistentCity', 'Plumbing']);
    console.log(`Scenario E (Missing price): rows returned = ${missingRes.rows.length} (Expected 0, price unavailable)`);

    process.exit(0);
}

testLookups();
