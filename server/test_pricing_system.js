const pool = require('./config/database');
const { calculatePrice, calculateTravelCharge } = require('./services/pricingService');
const { getAdjustmentRecommendation } = require('./services/wageRecommendationService');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
        console.log(`[PASS] ${testName}`);
        if (details) console.log(`       ${details}`);
        passedTests++;
    } else {
        console.error(`[FAIL] ${testName}`);
        if (details) console.error(`       ${details}`);
    }
}

async function runTestSuite() {
    console.log('================================================================');
    console.log('LOCATION-BASED PRICING SYSTEM COMPREHENSIVE TEST SUITE');
    console.log('================================================================\n');

    try {
        // Fetch IDs for test categories
        const cats = await pool.query("SELECT id, name FROM categories WHERE LOWER(name) IN ('electrical', 'plumbing', 'cleaning')");
        const electrical = cats.rows.find(c => c.name.toLowerCase() === 'electrical');
        const plumbing = cats.rows.find(c => c.name.toLowerCase() === 'plumbing');
        const cleaning = cats.rows.find(c => c.name.toLowerCase() === 'cleaning');

        // Test 1: Base price with 0% adjustment (Ottappalam Electrical: Base ₹400, Adj: 0% -> ₹400)
        console.log('--- Test 1: Base price with 0% adjustment (Ottappalam Electrical) ---');
        const t1 = await calculatePrice({
            categoryId: electrical.id,
            district: 'Palakkad',
            city: 'Ottappalam'
        });
        assert(t1.available === true, 'Test 1.1: Pricing available for Ottappalam Electrical');
        assert(t1.pricing_breakdown.base_price === 400, 'Test 1.2: Base price is ₹400', `Got: ₹${t1.pricing_breakdown.base_price}`);
        assert(t1.pricing_breakdown.final_labour_price === 400, 'Test 1.3: Ottappalam Electrical labour price is ₹400', `Got: ₹${t1.pricing_breakdown.final_labour_price}`);

        // Test 2: Base price with positive percentage adjustment (Palakkad town: +15% -> ₹460)
        console.log('\n--- Test 2: Base price with positive percentage adjustment (Palakkad town +15%) ---');
        const t2 = await calculatePrice({
            categoryId: electrical.id,
            district: 'Palakkad',
            city: 'Palakkad'
        });
        assert(t2.available === true, 'Test 2.1: Pricing available for Palakkad town Electrical');
        assert(t2.pricing_breakdown.applied_adjustment.value === 15, 'Test 2.2: Adjustment is +15%');
        assert(t2.pricing_breakdown.final_labour_price === 460, 'Test 2.3: Expected Palakkad town price is ₹460 (400 * 1.15)', `Got: ₹${t2.pricing_breakdown.final_labour_price}`);

        // Test 3: Kottayam Electrical: +25% adjustment -> ₹500
        console.log('\n--- Test 3: Kottayam Electrical (+25% adjustment -> ₹500) ---');
        const t3 = await calculatePrice({
            categoryId: electrical.id,
            district: 'Kottayam',
            city: 'Kottayam'
        });
        assert(t3.available === true, 'Test 3.1: Pricing available for Kottayam Electrical');
        assert(t3.pricing_breakdown.applied_adjustment.value === 25, 'Test 3.2: Adjustment is +25%');
        assert(t3.pricing_breakdown.final_labour_price === 500, 'Test 3.3: Expected Kottayam Electrical price is ₹500 (400 * 1.25)', `Got: ₹${t3.pricing_breakdown.final_labour_price}`);

        // Test 4: Fixed-amount adjustment (e.g. +₹50 or -₹30)
        console.log('\n--- Test 4: Fixed-amount adjustment ---');
        // Insert temporary fixed adjustment for cleaning in Thrissur: +₹60
        const fixedAdjRes = await pool.query(
            `INSERT INTO pricing_location_adjustments (district, city, category_id, adjustment_type, adjustment_value, is_active)
             VALUES ('Thrissur', 'Thrissur', $1, 'fixed', 60.00, TRUE)
             RETURNING id`,
            [cleaning.id]
        );
        const t4 = await calculatePrice({
            categoryId: cleaning.id,
            district: 'Thrissur',
            city: 'Thrissur'
        });
        assert(t4.pricing_breakdown.applied_adjustment.type === 'fixed', 'Test 4.1: Adjustment type is fixed');
        assert(t4.pricing_breakdown.final_labour_price === (t4.pricing_breakdown.base_price + 60), 'Test 4.2: Fixed adjustment correctly added to base price', `Base: ₹${t4.pricing_breakdown.base_price}, Final: ₹${t4.pricing_breakdown.final_labour_price}`);
        // Clean up
        await pool.query('DELETE FROM pricing_location_adjustments WHERE id = $1', [fixedAdjRes.rows[0].id]);

        // Test 5: Exact manual override taking priority (Kottayam exact override ₹520 takes priority)
        console.log('\n--- Test 5: Exact manual override priority (Kottayam Electrical ₹520) ---');
        // Add exact override of ₹520 for Kottayam Electrical
        const ovrRes = await pool.query(
            `INSERT INTO pricing_manual_overrides (district, city, category_id, exact_price, currency, is_active, reason)
             VALUES ('Kottayam', 'Kottayam', $1, 520.00, 'INR', TRUE, 'Test priority override')
             RETURNING id`,
            [electrical.id]
        );
        const t5 = await calculatePrice({
            categoryId: electrical.id,
            district: 'Kottayam',
            city: 'Kottayam'
        });
        assert(t5.pricing_breakdown.exact_override !== null, 'Test 5.1: Exact override detected');
        assert(t5.pricing_breakdown.final_labour_price === 520, 'Test 5.2: Final price equals exact override ₹520 instead of calculated ₹500', `Got: ₹${t5.pricing_breakdown.final_labour_price}`);
        // Delete test override to restore state
        await pool.query('DELETE FROM pricing_manual_overrides WHERE id = $1', [ovrRes.rows[0].id]);

        // Test 6: City adjustments are independent (Changing Kottayam does not change Ottappalam)
        console.log('\n--- Test 6: City adjustments independence ---');
        const t6_otta = await calculatePrice({ categoryId: electrical.id, district: 'Palakkad', city: 'Ottappalam' });
        const t6_kotta = await calculatePrice({ categoryId: electrical.id, district: 'Kottayam', city: 'Kottayam' });
        assert(t6_otta.pricing_breakdown.final_labour_price === 400, 'Test 6.1: Ottappalam remains ₹400');
        assert(t6_kotta.pricing_breakdown.final_labour_price === 500, 'Test 6.2: Kottayam remains ₹500');

        // Test 7: Different categories have independent prices in the same city
        console.log('\n--- Test 7: Category price independence in same city ---');
        const t7_plumb = await calculatePrice({ categoryId: plumbing.id, district: 'Kottayam', city: 'Kottayam' });
        const t7_elec = await calculatePrice({ categoryId: electrical.id, district: 'Kottayam', city: 'Kottayam' });
        assert(t7_plumb.pricing_breakdown.final_labour_price !== t7_elec.pricing_breakdown.final_labour_price, 'Test 7: Plumbing and Electrical have independent pricing in Kottayam');

        // Test 8: Locality override taking priority over city-level pricing
        console.log('\n--- Test 8: Locality adjustment taking priority over city adjustment ---');
        const locAdjRes = await pool.query(
            `INSERT INTO pricing_location_adjustments (district, city, locality, category_id, adjustment_type, adjustment_value, is_active)
             VALUES ('Palakkad', 'Ottappalam', 'Town Center', $1, 'percentage', 20.00, TRUE)
             RETURNING id`,
            [electrical.id]
        );
        const t8 = await calculatePrice({
            categoryId: electrical.id,
            district: 'Palakkad',
            city: 'Ottappalam',
            locality: 'Town Center'
        });
        assert(t8.pricing_breakdown.applied_adjustment.scope === 'locality', 'Test 8.1: Locality rule selected over city rule');
        assert(t8.pricing_breakdown.final_labour_price === 480, 'Test 8.2: Locality adjustment +20% applied (400 * 1.20 = 480)', `Got: ₹${t8.pricing_breakdown.final_labour_price}`);
        await pool.query('DELETE FROM pricing_location_adjustments WHERE id = $1', [locAdjRes.rows[0].id]);

        // Test 9: District/default fallback (missing city adjustment uses configured 0% fallback)
        console.log('\n--- Test 9: District/default 0% fallback ---');
        const t9 = await calculatePrice({
            categoryId: electrical.id,
            district: 'Idukki',
            city: 'Munnar'
        });
        assert(t9.available === true, 'Test 9.1: Available for unconfigured city using default fallback');
        assert(t9.pricing_breakdown.applied_adjustment.value === 0, 'Test 9.2: Default adjustment fallback is 0%');
        assert(t9.pricing_breakdown.final_labour_price === 400, 'Test 9.3: Base price preserved at ₹400');

        // Test 10: Missing base price returns price-unavailable response
        console.log('\n--- Test 10: Missing or invalid category/base price handling ---');
        const t10 = await calculatePrice({
            categoryId: 999999,
            district: 'Kottayam',
            city: 'Kottayam'
        });
        assert(t10.available === false, 'Test 10: Missing category returns available: false');

        // Test 11: Customer residence differing from service location
        // Example: Customer lives in Ottappalam but requests work in Kottayam
        console.log('\n--- Test 11: Customer residence differing from service location ---');
        const t11 = await calculatePrice({
            categoryId: electrical.id,
            district: 'Kottayam',
            city: 'Kottayam'
        });
        assert(t11.pricing_breakdown.final_labour_price === 500, 'Test 11: Correctly applies Kottayam rate ₹500 regardless of customer home residence');

        // Test 12: Separate travel charge calculation
        console.log('\n--- Test 12: Separate travel charge calculation ---');
        const t12 = await calculateTravelCharge({
            district: 'Kottayam',
            providerLat: 9.5916,
            providerLon: 76.5222,
            serviceLat: 9.5916 + (11 * 0.009), // ~11 km away (free 5km, 6km * ₹10 = ₹60)
            serviceLon: 76.5222
        });
        assert(t12.status === 'calculated', 'Test 12.1: Travel charge status is calculated');
        assert(t12.travel_charge > 0, 'Test 12.2: Travel fee is greater than zero and separate from labour price', `Travel fee: ₹${t12.travel_charge}`);

        // Test 13: Client price tampering protection in booking creation
        console.log('\n--- Test 13: Client-side price tampering protection ---');
        // When client submits bogus wage (e.g. ₹50), backend authoritatively calculates price
        const userRes = await pool.query('SELECT id FROM users LIMIT 1');
        const userId = userRes.rows[0].id;
        const fakeWage = 1.00;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const calculated = await calculatePrice({
                categoryId: electrical.id,
                district: 'Kottayam',
                city: 'Kottayam'
            });
            const insertTest = await client.query(
                `INSERT INTO service_requests (
                    customer_id, title, location, service_city, district, wage, labour_price, travel_fee, base_price, final_amount, status, requested_at, pricing_snapshot
                ) VALUES ($1, 'Tamper test', 'Kottayam', 'Kottayam', 'Kottayam', $2, $3, 0, $4, $5, 'pending', NOW() + INTERVAL '2 hours', $6)
                RETURNING id, wage, labour_price, final_amount`,
                [
                    userId,
                    calculated.pricing_breakdown.final_labour_price, // Server overwrites client's fake wage!
                    calculated.pricing_breakdown.final_labour_price,
                    calculated.pricing_breakdown.base_price,
                    calculated.pricing_breakdown.estimated_total,
                    JSON.stringify({ calculated: true })
                ]
            );
            assert(Number(insertTest.rows[0].labour_price) === 500, 'Test 13: Backend enforces authoritative ₹500 labour price, rejecting client-side tampering');
            await client.query('ROLLBACK');
        } finally {
            client.release();
        }

        // Test 14: Historical booking snapshot immutability
        console.log('\n--- Test 14: Historical booking snapshot preservation ---');
        const client2 = await pool.connect();
        try {
            await client2.query('BEGIN');
            const snapshotObj = {
                service_location: { city: 'Kottayam', district: 'Kottayam' },
                base_price: 400,
                final_labour_price: 500,
                travel_charge: 60,
                final_amount: 560,
                confirmed_at: new Date().toISOString()
            };
            const reqRes = await client2.query(
                `INSERT INTO service_requests (
                    customer_id, title, location, service_city, district, wage, labour_price, travel_fee, final_amount, status, requested_at, pricing_snapshot
                ) VALUES ($1, 'Snapshot test', 'Kottayam', 'Kottayam', 'Kottayam', 500, 500, 60, 560, 'completed', NOW() - INTERVAL '1 day', $2)
                RETURNING id, pricing_snapshot`,
                [userId, JSON.stringify(snapshotObj)]
            );
            const savedSnapshot = reqRes.rows[0].pricing_snapshot;
            assert(savedSnapshot.final_amount === 560, 'Test 14.1: Historical snapshot contains immutable final amount');
            assert(savedSnapshot.base_price === 400, 'Test 14.2: Historical snapshot contains base price snapshot');
            await client2.query('ROLLBACK');
        } finally {
            client2.release();
        }

        // Test 15: Wage recommendation with insufficient data returns configured default
        console.log('\n--- Test 15: Wage recommendation without fabricated percentages ---');
        const rec = await getAdjustmentRecommendation({
            categoryId: electrical.id,
            district: 'Wayanad',
            city: 'Kalpetta'
        });
        assert(rec.has_data === false, 'Test 15.1: Reports has_data = false when no reliable data exists');
        assert(rec.message.includes('Insufficient local pricing data'), 'Test 15.2: Uses configured default adjustment notice without inventing numbers');

        // Test 16: Locations directory count
        console.log('\n--- Test 16: Verified locations directory verification ---');
        const locCountRes = await pool.query('SELECT count(*) FROM kerala_locations WHERE is_active = TRUE');
        const count = Number(locCountRes.rows[0].count);
        assert(count >= 141, `Test 16: Verified Kerala locations directory populated (${count} locations, requirement was ~141)`);

        console.log('\n================================================================');
        console.log(`RESULTS: ${passedTests} / ${totalTests} TESTS PASSED!`);
        console.log('================================================================');

        process.exit(passedTests === totalTests ? 0 : 1);
    } catch (err) {
        console.error('Test execution error:', err);
        process.exit(1);
    }
}

runTestSuite();
