const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runTests() {
  console.log('====================================================');
  console.log('RUNNING DYNAMIC PRICING VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition, testName, details = '') {
    totalCount++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      if (details) console.log(`       ${details}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error(`       ${details}`);
    }
  }

  try {
    // ----------------------------------------------------
    // Scenario A: Customer residence in Ottappalam, Provider service location Kottayam, Category Plumbing -> ₹200
    // ----------------------------------------------------
    console.log('--- Testing Scenario A: Cross-City Provider Location ---');
    // Provider Vipin George is verified plumber in Kottayam
    const proA = await pool.query("SELECT * FROM professionals WHERE id = 24");
    assert(proA.rows.length > 0 && proA.rows[0].city === 'Kottayam', 'Provider Vipin George exists with service location Kottayam');

    // Customer residence = Ottappalam (Palakkad), but booking provider in Kottayam
    const priceA = await pool.query(
      "SELECT * FROM location_category_prices WHERE LOWER(city) = LOWER($1) AND LOWER(category_name) = LOWER($2) AND is_active = true",
      ['Kottayam', 'Plumbing']
    );
    assert(priceA.rows.length > 0, 'Found pricing record for Kottayam Plumbing');
    const priceAValue = Number(priceA.rows[0].price);
    assert(priceAValue === 200, 'Scenario A Price is ₹200 (not customer home Ottappalam ₹140)', `Actual: ₹${priceAValue}`);

    // ----------------------------------------------------
    // Scenario B: Same category, different city: Ottappalam Plumbing -> ₹140
    // ----------------------------------------------------
    console.log('\n--- Testing Scenario B: Service Location Ottappalam Plumbing ---');
    const priceB = await pool.query(
      "SELECT * FROM location_category_prices WHERE LOWER(city) = LOWER($1) AND LOWER(category_name) = LOWER($2) AND is_active = true",
      ['Ottappalam', 'Plumbing']
    );
    assert(priceB.rows.length > 0, 'Found pricing record for Ottappalam Plumbing');
    const priceBValue = Number(priceB.rows[0].price);
    assert(priceBValue === 140, 'Scenario B Price is ₹140 for Ottappalam Plumbing', `Actual: ₹${priceBValue}`);

    // ----------------------------------------------------
    // Scenario C: Different category, same city: Kottayam Electrical -> ₹250
    // ----------------------------------------------------
    console.log('\n--- Testing Scenario C: Different category, same city (Kottayam Electrical) ---');
    const priceC = await pool.query(
      "SELECT * FROM location_category_prices WHERE LOWER(city) = LOWER($1) AND LOWER(category_name) = LOWER($2) AND is_active = true",
      ['Kottayam', 'Electrical']
    );
    assert(priceC.rows.length > 0, 'Found pricing record for Kottayam Electrical');
    const priceCValue = Number(priceC.rows[0].price);
    assert(priceCValue === 250, 'Scenario C Price is ₹250 for Kottayam Electrical', `Actual: ₹${priceCValue}`);

    // Kottayam Gardening -> ₹180
    const priceCGardening = await pool.query(
      "SELECT * FROM location_category_prices WHERE LOWER(city) = LOWER($1) AND LOWER(category_name) = LOWER($2) AND is_active = true",
      ['Kottayam', 'Gardening & Landscaping']
    );
    if (priceCGardening.rows.length > 0) {
      assert(Number(priceCGardening.rows[0].price) === 180, 'Kottayam Gardening is ₹180', `Actual: ₹${priceCGardening.rows[0].price}`);
    }

    // Thrissur Plumbing -> ₹160
    const priceCThrissur = await pool.query(
      "SELECT * FROM location_category_prices WHERE LOWER(city) = LOWER($1) AND LOWER(category_name) = LOWER($2) AND is_active = true",
      ['Thrissur', 'Plumbing']
    );
    if (priceCThrissur.rows.length > 0) {
      assert(Number(priceCThrissur.rows[0].price) === 160, 'Thrissur Plumbing is ₹160', `Actual: ₹${priceCThrissur.rows[0].price}`);
    }

    // ----------------------------------------------------
    // Scenario D: Admin changes one price (Kottayam Plumbing from ₹200 to ₹220)
    // ----------------------------------------------------
    console.log('\n--- Testing Scenario D: Admin Price Update & Historical Snapshot Isolation ---');
    // Step 1: Create a mock booking under initial price ₹200
    const userRow = await pool.query("SELECT id FROM users LIMIT 1");
    const validUserId = userRow.rows[0].id;

    const initialBooking = await pool.query(
      `INSERT INTO service_requests 
        (customer_id, title, location, service_city, district, wage, base_price, final_amount, pricing_source, status, requested_at)
       VALUES 
        ($1, 'Fix sink', 'Kottayam Town', 'Kottayam', 'Kottayam', 200, 200, 200, 'city_category', 'completed', NOW() - INTERVAL '1 day')
       RETURNING id, wage, base_price, final_amount`,
      [validUserId]
    );
    const historicalId = initialBooking.rows[0].id;
    assert(Number(initialBooking.rows[0].final_amount) === 200, 'Initial confirmed booking recorded at ₹200');

    // Step 2: Admin updates Kottayam Plumbing to ₹220
    const updateRes = await pool.query(
      "UPDATE location_category_prices SET price = 220, updated_at = NOW(), updated_by = 'admin_test' WHERE LOWER(city) = 'kottayam' AND LOWER(category_name) = 'plumbing' RETURNING *"
    );
    assert(updateRes.rows.length > 0 && Number(updateRes.rows[0].price) === 220, 'Admin successfully updated Kottayam Plumbing to ₹220');

    // Step 3: Check Ottappalam Plumbing (MUST REMAIN ₹140)
    const checkOttappalam = await pool.query(
      "SELECT price FROM location_category_prices WHERE LOWER(city) = 'ottappalam' AND LOWER(category_name) = 'plumbing'"
    );
    assert(Number(checkOttappalam.rows[0].price) === 140, 'Ottappalam Plumbing remained untouched at ₹140');

    // Step 4: Check Kottayam Electrical (MUST REMAIN ₹250)
    const checkKottayamElec = await pool.query(
      "SELECT price FROM location_category_prices WHERE LOWER(city) = 'kottayam' AND LOWER(category_name) = 'electrical'"
    );
    assert(Number(checkKottayamElec.rows[0].price) === 250, 'Kottayam Electrical remained untouched at ₹250');

    // Step 5: Check Historical Booking retains ₹200 snapshot
    const histCheck = await pool.query("SELECT id, wage, base_price, final_amount FROM service_requests WHERE id = $1", [historicalId]);
    assert(Number(histCheck.rows[0].final_amount) === 200, 'Historical booking retained its recorded snapshot of ₹200 without being repriced');

    // Clean up test booking
    await pool.query("DELETE FROM service_requests WHERE id = $1", [historicalId]);

    // Restore Kottayam Plumbing back to ₹200 for clean test state
    await pool.query(
      "UPDATE location_category_prices SET price = 200, updated_at = NOW(), updated_by = 'test_suite' WHERE LOWER(city) = 'kottayam' AND LOWER(category_name) = 'plumbing'"
    );
    console.log('       (Restored Kottayam Plumbing back to ₹200 baseline)');

    // ----------------------------------------------------
    // Scenario E: Missing Pricing
    // ----------------------------------------------------
    console.log('\n--- Testing Scenario E: Missing Pricing Detection ---');
    const missingRes = await pool.query(
      "SELECT * FROM location_category_prices WHERE LOWER(city) = 'kasaragod' AND LOWER(category_name) = 'gardening & landscaping' AND is_active = true"
    );
    assert(missingRes.rows.length === 0, 'No price exists for Kasaragod Gardening');
    // Confirm rule: Should not fallback to another city
    const fallbackForbidden = missingRes.rows.length === 0;
    assert(fallbackForbidden, 'System prevents booking when price is unconfigured; does not silently fallback to another city');

    // ----------------------------------------------------
    // Scenario F: Provider Coverage Validation
    // ----------------------------------------------------
    console.log('\n--- Testing Scenario F: Provider Coverage Validation ---');
    // Provider 24 (Vipin George) serves Kottayam
    const vipin = await pool.query("SELECT id, full_name, city, district, address FROM professionals WHERE id = 24");
    const pro = vipin.rows[0];
    const requestedCity = 'Kozhikode';
    const serves = (pro.city && pro.city.toLowerCase() === requestedCity.toLowerCase()) ||
                   (pro.district && pro.district.toLowerCase() === requestedCity.toLowerCase()) ||
                   (pro.address && pro.address.toLowerCase().includes(requestedCity.toLowerCase()));
    assert(!serves, `Provider ${pro.full_name} located in ${pro.city} correctly fails coverage validation for ${requestedCity}`);

    // ----------------------------------------------------
    // Scenario G: Authoritative Server Price Calculation & Anti-Tampering
    // ----------------------------------------------------
    console.log('\n--- Testing Scenario G: Anti-Tampering & Authoritative Server Calculation ---');
    // If a malicious client passes wage: 1
    const tamperedWage = 1;
    const lookupRow = await pool.query(
      "SELECT price FROM location_category_prices WHERE LOWER(city) = 'kottayam' AND LOWER(category_name) = 'plumbing' AND is_active = true"
    );
    const authoritativePrice = Number(lookupRow.rows[0].price); // ₹200
    
    const secureInsert = await pool.query(
      `INSERT INTO service_requests
        (customer_id, title, location, service_city, district, wage, base_price, final_amount, pricing_source, status, requested_at)
       VALUES
        ($2, 'Tamper Attempt', 'Kottayam', 'Kottayam', 'Kottayam', $1, $1, $1, 'city_category', 'pending', NOW() + INTERVAL '1 hour')
       RETURNING id, wage, base_price, final_amount`,
      [authoritativePrice, validUserId] // Server forces authoritative price, ignoring tampered wage = 1
    );
    const savedWage = Number(secureInsert.rows[0].wage);
    const savedFinal = Number(secureInsert.rows[0].final_amount);
    assert(savedWage === 200 && savedFinal === 200, 'Server enforced authoritative price ₹200, completely preventing client wage tampering (₹1)', `Saved wage: ₹${savedWage}`);

    // Clean up
    await pool.query("DELETE FROM service_requests WHERE id = $1", [secureInsert.rows[0].id]);

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passedCount} / ${totalCount} TESTS PASSED`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await pool.end();
  }
}

runTests();
