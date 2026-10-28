const pool = require('./config/database');
const { 
    getAdjustmentRecommendation, 
    getBenchmarkCoverageDiagnostics, 
    getBenchmarkConfig, 
    updateBenchmarkConfig 
} = require('./services/wageRecommendationService');
const { calculatePrice } = require('./services/pricingService');
const crypto = require('crypto');

async function runBenchmarkTestSuite() {
    console.log('========================================================================');
    console.log('WAGE BENCHMARK INTELLIGENCE & EVIDENCE INTEGRITY TEST SUITE');
    console.log('========================================================================\n');

    let totalTests = 0;
    let passedTests = 0;

    function assert(cond, name, details = '') {
        totalTests++;
        if (cond) {
            console.log(`[PASS] ${name}`);
            if (details) console.log(`       ${details}`);
            passedTests++;
        } else {
            console.error(`[FAIL] ${name}`);
            if (details) console.error(`       ${details}`);
        }
    }

    // Helper to get rule and booking hashes
    async function getSystemChecksum() {
        const rates = await pool.query('SELECT * FROM pricing_base_rates ORDER BY id ASC');
        const adjs = await pool.query('SELECT * FROM pricing_location_adjustments ORDER BY id ASC');
        const ovrs = await pool.query('SELECT * FROM pricing_manual_overrides ORDER BY id ASC');
        const travel = await pool.query('SELECT * FROM pricing_travel_rules ORDER BY id ASC');
        const bookings = await pool.query('SELECT id, status, wage, labour_price, travel_fee, base_price, final_amount, md5(pricing_snapshot::text) FROM service_requests ORDER BY id ASC');
        
        const payload = JSON.stringify({
            rates: rates.rows,
            adjs: adjs.rows,
            ovrs: ovrs.rows,
            travel: travel.rows,
            bookings: bookings.rows
        });
        return {
            hash: crypto.createHash('sha256').update(payload).digest('hex'),
            ratesCount: rates.rows.length,
            adjsCount: adjs.rows.length,
            ovrsCount: ovrs.rows.length,
            travelCount: travel.rows.length,
            bookingsCount: bookings.rows.length
        };
    }

    try {
        const initialSystem = await getSystemChecksum();
        console.log('Baseline System Checksum SHA256:', initialSystem.hash);
        console.log(`Entities: Rates=${initialSystem.ratesCount}, Adjs=${initialSystem.adjsCount}, Overrides=${initialSystem.ovrsCount}, Travel=${initialSystem.travelCount}, Bookings=${initialSystem.bookingsCount}\n`);

        const catRes = await pool.query("SELECT id, name FROM categories WHERE LOWER(name) = 'electrical'");
        const electrical = catRes.rows[0];

        // -------------------------------------------------------------------------
        // Test 1: Insufficient Data Handling & Fallback
        // -------------------------------------------------------------------------
        console.log('--- Test 1: Insufficient Data Handling & Fallback (Requirement 8) ---');
        const t1 = await getAdjustmentRecommendation({
            categoryId: electrical.id,
            district: 'Wayanad',
            city: 'Kalpetta'
        });
        assert(t1.has_data === false, 'Test 1.1: Reports has_data = false when no reliable data exists');
        assert(t1.fallback_applied === true, 'Test 1.2: Confirms fallback_applied = true');
        assert(t1.recommended_adjustment_percentage === 0, 'Test 1.3: Recommended adjustment is 0% configured default');
        assert(t1.message.includes('Insufficient local pricing data'), 'Test 1.4: Displays clear insufficient data message with threshold explanation');

        // -------------------------------------------------------------------------
        // Test 2: Invalid Reference Amounts Excluded
        // -------------------------------------------------------------------------
        console.log('\n--- Test 2: Invalid/Zero/Null Reference Amounts Excluded (Requirement 4) ---');
        const invalidBench = await pool.query(
            `INSERT INTO pricing_wage_benchmarks (
                source_name, district, city, category_id, category_name, wage_type, reference_price, reference_amount, verification_status, collection_date, effective_date
            ) VALUES ($1, 'Kollam', 'Kollam', $2, 'Electrical', 'service_charge', 0, 0, 'verified', CURRENT_DATE, CURRENT_DATE)
            RETURNING id`,
            ['Test Invalid Source', electrical.id]
        );
        const t2 = await getAdjustmentRecommendation({
            categoryId: electrical.id,
            district: 'Kollam',
            city: 'Kollam'
        });
        assert(t2.has_data === false, 'Test 2.1: Invalid (₹0) benchmark record excluded, has_data remains false');
        assert(t2.evidence_summary?.excluded_count >= 1, 'Test 2.2: Invalid record recorded in excluded_count');
        await pool.query('DELETE FROM pricing_wage_benchmarks WHERE id = $1', [invalidBench.rows[0].id]);

        // -------------------------------------------------------------------------
        // Test 3: Unverified Records Excluded
        // -------------------------------------------------------------------------
        console.log('\n--- Test 3: Unverified / Draft Records Excluded (Requirement 4) ---');
        const draftBench = await pool.query(
            `INSERT INTO pricing_wage_benchmarks (
                source_name, district, city, category_id, category_name, wage_type, reference_price, reference_amount, verification_status, collection_date, effective_date
            ) VALUES ($1, 'Kollam', 'Kollam', $2, 'Electrical', 'service_charge', 500.00, 500.00, 'draft', CURRENT_DATE, CURRENT_DATE)
            RETURNING id`,
            ['Test Unverified Source', electrical.id]
        );
        const t3 = await getAdjustmentRecommendation({
            categoryId: electrical.id,
            district: 'Kollam',
            city: 'Kollam'
        });
        assert(t3.has_data === false, 'Test 3.1: Unverified draft benchmark excluded from recommendations');
        assert(t3.evidence_summary?.excluded_details.some(e => e.reason.includes('Unverified record')), 'Test 3.2: Exclusion reason explicitly notes unverified status');
        await pool.query('DELETE FROM pricing_wage_benchmarks WHERE id = $1', [draftBench.rows[0].id]);

        // -------------------------------------------------------------------------
        // Test 4: Stale Data Excluded (> max_data_age_days)
        // -------------------------------------------------------------------------
        console.log('\n--- Test 4: Stale Data Excluded (Requirement 4) ---');
        const staleBench = await pool.query(
            `INSERT INTO pricing_wage_benchmarks (
                source_name, district, city, category_id, category_name, wage_type, reference_price, reference_amount, verification_status, collection_date, effective_date
            ) VALUES ($1, 'Kollam', 'Kollam', $2, 'Electrical', 'service_charge', 500.00, 500.00, 'verified', CURRENT_DATE - INTERVAL '500 days', CURRENT_DATE - INTERVAL '500 days')
            RETURNING id`,
            ['Test Stale Source', electrical.id]
        );
        const t4 = await getAdjustmentRecommendation({
            categoryId: electrical.id,
            district: 'Kollam',
            city: 'Kollam'
        });
        assert(t4.has_data === false, 'Test 4.1: Benchmark collected 500 days ago (> 365 days threshold) is excluded as stale');
        assert(t4.evidence_summary?.excluded_details.some(e => e.reason.includes('Stale data')), 'Test 4.2: Stale exclusion documented in audit summary');
        await pool.query('DELETE FROM pricing_wage_benchmarks WHERE id = $1', [staleBench.rows[0].id]);

        // -------------------------------------------------------------------------
        // Test 5: Incomparable Mixed Hourly / Daily / Per-Job Data Separated
        // -------------------------------------------------------------------------
        console.log('\n--- Test 5: Mixed Hourly/Daily vs Per-Job Data Separation (Requirement 4 & 9) ---');
        const hourlyBench = await pool.query(
            `INSERT INTO pricing_wage_benchmarks (
                source_name, district, city, category_id, category_name, wage_type, reference_price, reference_amount, verification_status, collection_date, effective_date
            ) VALUES ($1, 'Kollam', 'Kollam', $2, 'Electrical', 'hourly', 150.00, 150.00, 'verified', CURRENT_DATE, CURRENT_DATE)
            RETURNING id`,
            ['Test Hourly Wage Source', electrical.id]
        );
        const t5 = await getAdjustmentRecommendation({
            categoryId: electrical.id,
            district: 'Kollam',
            city: 'Kollam'
        });
        assert(t5.has_data === false, 'Test 5.1: Hourly wage rate not mixed directly into per-job service charge');
        assert(t5.evidence_summary?.excluded_details.some(e => e.reason.includes("Incomparable wage type 'hourly'")), 'Test 5.2: Incomparable wage type explicitly isolated');
        await pool.query('DELETE FROM pricing_wage_benchmarks WHERE id = $1', [hourlyBench.rows[0].id]);

        // -------------------------------------------------------------------------
        // Test 6: Evidence Threshold Enforcement (e.g. threshold = 3 samples)
        // -------------------------------------------------------------------------
        console.log('\n--- Test 6: Evidence Threshold Enforcement (Requirement 5) ---');
        // Insert only 2 valid samples (threshold requires 3)
        const partial1 = await pool.query(
            `INSERT INTO pricing_wage_benchmarks (
                source_name, district, city, category_id, category_name, wage_type, reference_price, reference_amount, verification_status, collection_date, effective_date
            ) VALUES ('Govt Labour Report', 'Kollam', 'Kollam', $1, 'Electrical', 'service_charge', 460.00, 460.00, 'verified', CURRENT_DATE, CURRENT_DATE)
            RETURNING id`,
            [electrical.id]
        );
        const partial2 = await pool.query(
            `INSERT INTO pricing_wage_benchmarks (
                source_name, district, city, category_id, category_name, wage_type, reference_price, reference_amount, verification_status, collection_date, effective_date
            ) VALUES ('Electrician Association Kollam', 'Kollam', 'Kollam', $1, 'Electrical', 'service_charge', 480.00, 480.00, 'verified', CURRENT_DATE, CURRENT_DATE)
            RETURNING id`,
            [electrical.id]
        );

        const t6_partial = await getAdjustmentRecommendation({
            categoryId: electrical.id,
            district: 'Kollam',
            city: 'Kollam'
        });
        assert(t6_partial.has_data === false, 'Test 6.1: 2 valid samples fails minimum threshold of 3, returns has_data = false');
        assert(t6_partial.insufficient_reason === 'BELOW_EVIDENCE_THRESHOLD', 'Test 6.2: Reason flagged as BELOW_EVIDENCE_THRESHOLD');

        // Now add the 3rd valid sample (reaches threshold of 3)
        const partial3 = await pool.query(
            `INSERT INTO pricing_wage_benchmarks (
                source_name, district, city, category_id, category_name, wage_type, reference_price, reference_amount, verification_status, collection_date, effective_date
            ) VALUES ('Local Market Survey', 'Kollam', 'Kollam', $1, 'Electrical', 'service_charge', 500.00, 500.00, 'verified', CURRENT_DATE, CURRENT_DATE)
            RETURNING id`,
            [electrical.id]
        );

        const t6_full = await getAdjustmentRecommendation({
            categoryId: electrical.id,
            district: 'Kollam',
            city: 'Kollam'
        });
        assert(t6_full.has_data === true, 'Test 6.3: 3 verified samples meets threshold, recommendation calculated');
        assert(t6_full.median_reference_price === 480, 'Test 6.4: Median of [460, 480, 500] is ₹480', `Got ₹${t6_full.median_reference_price}`);
        // Base price is ₹400. (480 - 400) / 400 * 100 = +20%
        assert(t6_full.recommended_adjustment_percentage === 20, 'Test 6.5: Recommended adjustment is +20%', `Got ${t6_full.recommended_adjustment_percentage}%`);
        assert(t6_full.status === 'draft_for_admin_review', 'Test 6.6: Status marked draft_for_admin_review');
        assert(t6_full.is_active_rule === false, 'Test 6.7: is_active_rule is explicitly false');

        // -------------------------------------------------------------------------
        // Test 7: Separation of Recommendations & Customer Pricing (Requirement 7)
        // -------------------------------------------------------------------------
        console.log('\n--- Test 7: Recommendation Separation: Active Customer Price Unchanged (Requirement 7) ---');
        // Active customer pricing for Kollam Electrical must remain base price ₹400 (with 0% fallback)
        // The existence of a recommendation DOES NOT modify pricing
        const kollamCustomerPrice = await calculatePrice({
            categoryId: electrical.id,
            district: 'Kollam',
            city: 'Kollam'
        });
        assert(kollamCustomerPrice.pricing_breakdown.base_price === 400, 'Test 7.1: Base price remains ₹400');
        assert(kollamCustomerPrice.pricing_breakdown.applied_adjustment.value === 0, 'Test 7.2: Active applied adjustment remains 0% default');
        assert(kollamCustomerPrice.pricing_breakdown.final_labour_price === 400, 'Test 7.3: Active customer price remains ₹400, unaffected by market recommendation');

        // -------------------------------------------------------------------------
        // Test 8: Explicit Admin Recommendation Review & Approval (Requirement 7 & 9)
        // -------------------------------------------------------------------------
        console.log('\n--- Test 8: Explicit Admin Review & Approval Flow ---');
        // Admin reviews the +20% suggestion and decides to commit it to pricing_location_adjustments
        const approvedAdj = await pool.query(
            `INSERT INTO pricing_location_adjustments (
                district, city, category_id, adjustment_type, adjustment_value, is_active, notes
            ) VALUES ('Kollam', 'Kollam', $1, 'percentage', $2, TRUE, 'Approved from Wage Benchmark Intelligence')
            RETURNING id, adjustment_value`,
            [electrical.id, t6_full.recommended_adjustment_percentage]
        );
        assert(Number(approvedAdj.rows[0].adjustment_value) === 20, 'Test 8.1: Location adjustment created from approved recommendation (+20%)');

        const kollamAfterApproval = await calculatePrice({
            categoryId: electrical.id,
            district: 'Kollam',
            city: 'Kollam'
        });
        assert(kollamAfterApproval.pricing_breakdown.final_labour_price === 480, 'Test 8.2: Customer price updates to ₹480 ONLY AFTER explicit admin approval and creation', `Got ₹${kollamAfterApproval.pricing_breakdown.final_labour_price}`);

        // Clean up test adjustment and test benchmark records
        await pool.query('DELETE FROM pricing_location_adjustments WHERE id = $1', [approvedAdj.rows[0].id]);
        await pool.query('DELETE FROM pricing_wage_benchmarks WHERE id IN ($1, $2, $3)', [
            partial1.rows[0].id,
            partial2.rows[0].id,
            partial3.rows[0].id
        ]);
        console.log('Cleaned up all temporary test records safely.');

        // -------------------------------------------------------------------------
        // Test 9: Diagnostics API Verification
        // -------------------------------------------------------------------------
        console.log('\n--- Test 9: Diagnostics API Verification (Requirement 2) ---');
        const diag = await getBenchmarkCoverageDiagnostics();
        assert(diag.total_benchmarks_in_db === 0, 'Test 9.1: Correctly reports 0 total benchmarks in database (no fake rows inserted)');
        assert(diag.categories_gap_analysis.length === 13, 'Test 9.2: Reports all 13 active service categories in gap analysis');
        assert(diag.categories_gap_analysis.every(c => c.status === 'insufficient_evidence'), 'Test 9.3: All categories identified as lacking evidence without fabricating numbers');
        assert(Object.keys(diag.districts_summary).length === 14, 'Test 9.4: All 14 Kerala districts monitored in coverage analysis');

        // -------------------------------------------------------------------------
        // Test 10: Final System Immutability Verification (Requirement 1 & 10)
        // -------------------------------------------------------------------------
        console.log('\n--- Test 10: System-Wide Pricing & Booking Immutability Verification ---');
        const finalSystem = await getSystemChecksum();
        assert(finalSystem.hash === initialSystem.hash, 'Test 10.1: System checksum identical (Zero unintended changes to base rates, adjustments, overrides, travel, or bookings)');
        assert(finalSystem.bookingsCount === 49, 'Test 10.2: All 49 historical confirmed bookings preserved intact');

        console.log('\n========================================================================');
        console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
        console.log('========================================================================');

        await pool.end();
        process.exit(passedTests === totalTests ? 0 : 1);
    } catch (err) {
        console.error('Test suite error:', err);
        await pool.end();
        process.exit(1);
    }
}

runBenchmarkTestSuite();
