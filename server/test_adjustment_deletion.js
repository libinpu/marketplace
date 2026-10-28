const http = require('http');
const pool = require('./config/database');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'servicehub_super_secret_jwt_key_2025';

function getAdminToken() {
  return jwt.sign(
    { id: 1, email: 'admin@servicehub.com', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function makeRequest(method, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING LOCATION ADJUSTMENT DELETION TESTS ---');
  const token = getAdminToken();
  const authHeaders = { Authorization: `Bearer ${token}` };

  let testAdjId = null;

  try {
    // 0. Record baseline counts and verify data
    const beforeBaseRates = await pool.query('SELECT count(*) as count FROM pricing_base_rates');
    const beforeOverrides = await pool.query('SELECT count(*) as count FROM pricing_manual_overrides');
    const beforeTravel = await pool.query('SELECT count(*) as count FROM pricing_travel_rules');
    const beforeBookings = await pool.query('SELECT count(*) as count FROM service_requests WHERE pricing_snapshot IS NOT NULL');
    const activeAdjustments = await pool.query('SELECT id, district, city, adjustment_type, adjustment_value FROM pricing_location_adjustments');
    console.log(`Active adjustments count before test: ${activeAdjustments.rows.length} (IDs: ${activeAdjustments.rows.map(a => a.id).join(', ')})`);

    // 1. Create a dedicated test adjustment for deletion testing
    console.log('\n[Test 1] Creating temporary test adjustment for deletion...');
    const createRes = await pool.query(
      `INSERT INTO pricing_location_adjustments (district, city, category_id, adjustment_type, adjustment_value, is_active)
       VALUES ('Ernakulam', 'Aluva Test Zone', NULL, 'percentage', 15.00, true)
       RETURNING id`
    );
    testAdjId = createRes.rows[0].id;
    console.log(`✓ Created test adjustment with ID: ${testAdjId}`);

    // Verify it exists in database
    const checkCreated = await pool.query('SELECT * FROM pricing_location_adjustments WHERE id = $1', [testAdjId]);
    if (checkCreated.rows.length === 0) throw new Error('Test adjustment creation failed');

    // 2. Delete the adjustment using the actual backend DELETE route
    console.log(`\n[Test 2] Deleting existing adjustment ID ${testAdjId} via DELETE /api/admin/pricing/adjustments/:id...`);
    const deleteRes = await makeRequest('DELETE', `/api/admin/pricing/adjustments/${testAdjId}`, authHeaders);
    console.log(`✓ Response status: ${deleteRes.status}`);
    console.log(`✓ Response body:`, deleteRes.data);
    if (deleteRes.status !== 200 || !deleteRes.data.message.includes('successfully')) {
      throw new Error(`Expected successful deletion, got status ${deleteRes.status}`);
    }

    // Verify adjustment is no longer in DB
    const checkDeleted = await pool.query('SELECT * FROM pricing_location_adjustments WHERE id = $1', [testAdjId]);
    if (checkDeleted.rows.length > 0) throw new Error('Adjustment was not removed from database');
    console.log(`✓ Adjustment ${testAdjId} verified deleted from database.`);

    // Verify audit log entry
    const auditLogs = await pool.query(
      `SELECT * FROM pricing_audit_logs WHERE entity_type = 'adjustment' AND entity_id = $1 ORDER BY id DESC LIMIT 1`,
      [testAdjId]
    );
    if (auditLogs.rows.length > 0) {
      console.log(`✓ Audit log verified: Action '${auditLogs.rows[0].action_type}', Entity '${auditLogs.rows[0].entity_type}#${auditLogs.rows[0].entity_id}'`);
    }

    // 3. Delete non-existent ID (should return 404 with clear error message)
    console.log('\n[Test 3] Deleting non-existent adjustment ID 999999...');
    const nonExistentRes = await makeRequest('DELETE', `/api/admin/pricing/adjustments/999999`, authHeaders);
    console.log(`✓ Response status: ${nonExistentRes.status}`);
    console.log(`✓ Error response message: "${nonExistentRes.data.message}"`);
    if (nonExistentRes.status !== 404) throw new Error(`Expected status 404, got ${nonExistentRes.status}`);
    if (nonExistentRes.data.message !== 'Adjustment not found') throw new Error(`Unexpected message: ${nonExistentRes.data.message}`);

    // 4. Repeated deletion (delete the same test ID again, simulating double click)
    console.log(`\n[Test 4] Repeated deletion of already deleted ID ${testAdjId} (double-click simulation)...`);
    const repeatRes = await makeRequest('DELETE', `/api/admin/pricing/adjustments/${testAdjId}`, authHeaders);
    console.log(`✓ Correctly received HTTP ${repeatRes.status} on repeated deletion`);
    console.log(`✓ Error response message: "${repeatRes.data.message}"`);
    if (repeatRes.status !== 404) throw new Error(`Expected status 404, got ${repeatRes.status}`);

    // 5. Verify unrelated pricing configurations are completely untouched
    console.log('\n[Test 5] Verifying integrity of unrelated pricing tables...');
    const afterBaseRates = await pool.query('SELECT count(*) as count FROM pricing_base_rates');
    const afterOverrides = await pool.query('SELECT count(*) as count FROM pricing_manual_overrides');
    const afterTravel = await pool.query('SELECT count(*) as count FROM pricing_travel_rules');
    const afterBookings = await pool.query('SELECT count(*) as count FROM service_requests WHERE pricing_snapshot IS NOT NULL');
    const afterAdjustments = await pool.query('SELECT id, district, city, adjustment_type, adjustment_value FROM pricing_location_adjustments');

    console.log(`- Base rates: ${beforeBaseRates.rows[0].count} -> ${afterBaseRates.rows[0].count} (Unchanged: ${beforeBaseRates.rows[0].count === afterBaseRates.rows[0].count})`);
    console.log(`- Exact overrides: ${beforeOverrides.rows[0].count} -> ${afterOverrides.rows[0].count} (Unchanged: ${beforeOverrides.rows[0].count === afterOverrides.rows[0].count})`);
    console.log(`- Travel rules: ${beforeTravel.rows[0].count} -> ${afterTravel.rows[0].count} (Unchanged: ${beforeTravel.rows[0].count === afterTravel.rows[0].count})`);
    console.log(`- Booking snapshots: ${beforeBookings.rows[0].count} -> ${afterBookings.rows[0].count} (Unchanged: ${beforeBookings.rows[0].count === afterBookings.rows[0].count})`);
    console.log(`- Active adjustments: ${activeAdjustments.rows.length} -> ${afterAdjustments.rows.length} (Original records preserved)`);

    if (beforeBaseRates.rows[0].count !== afterBaseRates.rows[0].count) throw new Error('Base rates count changed!');
    if (beforeOverrides.rows[0].count !== afterOverrides.rows[0].count) throw new Error('Exact overrides count changed!');
    if (beforeTravel.rows[0].count !== afterTravel.rows[0].count) throw new Error('Travel rules count changed!');
    if (beforeBookings.rows[0].count !== afterBookings.rows[0].count) throw new Error('Booking snapshots count changed!');
    if (activeAdjustments.rows.length !== afterAdjustments.rows.length) throw new Error('Original active adjustments were altered!');

    console.log('\n✅ ALL DELETION AND INTEGRITY TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exitCode = 1;
  } finally {
    // Clean up test adjustment if it was left over
    if (testAdjId) {
      await pool.query('DELETE FROM pricing_location_adjustments WHERE id = $1', [testAdjId]).catch(() => {});
    }
    await pool.end();
  }
}

runTests();
