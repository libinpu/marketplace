const pool = require('../config/database');

// Default benchmark configuration
const DEFAULT_BENCHMARK_CONFIG = {
    min_sample_threshold: 3,
    max_data_age_days: 365,
    target_wage_type: 'service_charge',
    require_verified_only: true
};

/**
 * Retrieves the configurable evidence threshold settings from database or fallback defaults.
 */
async function getBenchmarkConfig() {
    try {
        const res = await pool.query("SELECT value FROM pricing_system_settings WHERE key = 'wage_benchmark_config' LIMIT 1");
        if (res.rows.length > 0 && res.rows[0].value) {
            return {
                ...DEFAULT_BENCHMARK_CONFIG,
                ...res.rows[0].value
            };
        }
    } catch (err) {
        console.warn('Failed to load wage_benchmark_config, using defaults:', err.message);
    }
    return DEFAULT_BENCHMARK_CONFIG;
}

/**
 * Updates the configurable evidence threshold settings.
 */
async function updateBenchmarkConfig(newConfig) {
    const merged = {
        ...DEFAULT_BENCHMARK_CONFIG,
        ...newConfig
    };
    await pool.query(
        `INSERT INTO pricing_system_settings (key, value, description, updated_at)
         VALUES ('wage_benchmark_config', $1, 'Configurable evidence thresholds and filtering criteria for Wage Benchmark Intelligence', CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
        [JSON.stringify(merged)]
    );
    return merged;
}

/**
 * Calculates a recommended percentage adjustment based on verified, fresh, comparable
 * market wage benchmarks only when the minimum configurable evidence threshold is met.
 * 
 * Strict Data Integrity & Audit Rules:
 * 1. Never invents records, percentages, or wages.
 * 2. Excludes unverified records (unless explicitly permitted).
 * 3. Excludes stale records exceeding max_data_age_days.
 * 4. Excludes incomparable wage types (e.g., hourly/daily wages cannot be directly blended into per-job service charge without conversion).
 * 5. Requires sample_count >= min_sample_threshold. Otherwise, returns fallback with detailed reason.
 */
async function getAdjustmentRecommendation({ categoryId, district, city }) {
    const config = await getBenchmarkConfig();
    const minThreshold = Number(config.min_sample_threshold) || 3;
    const maxAgeDays = Number(config.max_data_age_days) || 365;
    const targetWageType = config.target_wage_type || 'service_charge';
    const requireVerified = Boolean(config.require_verified_only);

    // 1. Fetch active base price for the category
    const baseRes = await pool.query(
        'SELECT base_price FROM pricing_base_rates WHERE category_id = $1 AND job_type_id IS NULL AND is_active = TRUE LIMIT 1',
        [categoryId]
    );

    if (baseRes.rows.length === 0) {
        return {
            has_data: false,
            base_price: null,
            threshold_config: { min_sample_threshold: minThreshold, max_data_age_days: maxAgeDays },
            fallback_applied: true,
            recommended_adjustment_percentage: 0,
            recommended_adjustment_formatted: '0% (Configured Default)',
            message: 'No active base price configured for this category.',
            insufficient_reason: 'MISSING_BASE_PRICE'
        };
    }

    const basePrice = Number(baseRes.rows[0].base_price);
    if (!basePrice || basePrice <= 0) {
        return {
            has_data: false,
            base_price: 0,
            threshold_config: { min_sample_threshold: minThreshold, max_data_age_days: maxAgeDays },
            fallback_applied: true,
            recommended_adjustment_percentage: 0,
            recommended_adjustment_formatted: '0% (Configured Default)',
            message: 'Base price is zero or invalid; cannot calculate percentage adjustment.',
            insufficient_reason: 'INVALID_BASE_PRICE'
        };
    }

    // 2. Query market wage benchmarks matching the city or district
    const benchmarkRes = await pool.query(
        `SELECT id, source_name, source_identifier, district, city, category_id, category_name,
                wage_type, reference_price, reference_amount, sample_count, collection_date, effective_date,
                verification_status, created_at, notes
         FROM pricing_wage_benchmarks
         WHERE (category_id = $1 OR category_id IS NULL)
           AND (
               ($2::varchar IS NOT NULL AND LOWER(city) = LOWER($2))
               OR ($3::varchar IS NOT NULL AND LOWER(district) = LOWER($3))
           )
         ORDER BY 
             CASE WHEN $2::varchar IS NOT NULL AND LOWER(city) = LOWER($2) THEN 1 ELSE 2 END ASC,
             verification_status = 'verified' DESC,
             id DESC`,
        [categoryId, city || null, district || null]
    );

    const rawRecords = benchmarkRes.rows;
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (maxAgeDays * 24 * 60 * 60 * 1000));

    // Audit and categorize records
    const excludedRecords = [];
    const validRecords = [];

    for (const r of rawRecords) {
        const refAmount = Number(r.reference_amount ?? r.reference_price);
        const recordDate = r.effective_date ? new Date(r.effective_date) : (r.collection_date ? new Date(r.collection_date) : new Date(r.created_at));

        // Validation check 1: Numeric validity
        if (!Number.isFinite(refAmount) || refAmount <= 0) {
            excludedRecords.push({ id: r.id, source: r.source_name, reason: 'Invalid or missing reference amount' });
            continue;
        }

        // Validation check 2: Verification status
        if (requireVerified && r.verification_status !== 'verified') {
            excludedRecords.push({ id: r.id, source: r.source_name, reason: `Unverified record (status: '${r.verification_status}')` });
            continue;
        }

        // Validation check 3: Stale data check
        if (recordDate < cutoffDate) {
            excludedRecords.push({ id: r.id, source: r.source_name, reason: `Stale data: collected on ${recordDate.toISOString().slice(0, 10)} (exceeds ${maxAgeDays} days limit)` });
            continue;
        }

        // Validation check 4: Wage type comparability (Do not mix hourly or daily wages directly with per-job service charge)
        if (targetWageType && r.wage_type && r.wage_type !== targetWageType) {
            excludedRecords.push({ id: r.id, source: r.source_name, reason: `Incomparable wage type '${r.wage_type}' (expected '${targetWageType}')` });
            continue;
        }

        validRecords.push({
            id: r.id,
            source_name: r.source_name,
            source_identifier: r.source_identifier,
            wage_type: r.wage_type,
            reference_amount: refAmount,
            collection_date: r.collection_date,
            effective_date: r.effective_date,
            verification_status: r.verification_status,
            district: r.district,
            city: r.city
        });
    }

    // Check if threshold is met
    if (validRecords.length < minThreshold) {
        return {
            has_data: false,
            base_price: basePrice,
            fallback_applied: true,
            recommended_adjustment_percentage: 0,
            recommended_adjustment_formatted: '0% (Configured Default)',
            message: `Insufficient local pricing data. Found ${validRecords.length} usable verified record(s), but minimum threshold is ${minThreshold}. The configured default adjustment is being used.`,
            insufficient_reason: 'BELOW_EVIDENCE_THRESHOLD',
            threshold_config: {
                min_sample_threshold: minThreshold,
                max_data_age_days: maxAgeDays,
                target_wage_type: targetWageType,
                require_verified_only: requireVerified
            },
            evidence_summary: {
                total_raw_found: rawRecords.length,
                usable_valid_count: validRecords.length,
                excluded_count: excludedRecords.length,
                excluded_details: excludedRecords
            }
        };
    }

    // Calculate median reference price from strictly valid samples
    const amounts = validRecords.map(r => r.reference_amount).sort((a, b) => a - b);
    const mid = Math.floor(amounts.length / 2);
    const medianReferencePrice = amounts.length % 2 !== 0 ? amounts[mid] : (amounts[mid - 1] + amounts[mid]) / 2;

    const recommendedPercentage = ((medianReferencePrice - basePrice) / basePrice) * 100;
    const roundedPercentage = Math.round(recommendedPercentage * 10) / 10;

    return {
        has_data: true,
        base_price: basePrice,
        median_reference_price: Math.round(medianReferencePrice * 100) / 100,
        recommended_adjustment_percentage: roundedPercentage,
        recommended_adjustment_formatted: `${roundedPercentage >= 0 ? '+' : ''}${roundedPercentage}%`,
        sample_count: validRecords.length,
        status: 'draft_for_admin_review',
        is_active_rule: false, // Explicitly separate recommendations from active rules
        note: 'Market recommendation for administrative review only. Customer pricing remains unchanged until explicitly approved and applied by an administrator.',
        threshold_config: {
            min_sample_threshold: minThreshold,
            max_data_age_days: maxAgeDays
        },
        sources: validRecords,
        excluded_evidence: excludedRecords
    };
}

const OFFICIAL_KERALA_DISTRICTS = [
    'Alappuzha',
    'Ernakulam',
    'Idukki',
    'Kannur',
    'Kasaragod',
    'Kollam',
    'Kottayam',
    'Kozhikode',
    'Malappuram',
    'Palakkad',
    'Pathanamthitta',
    'Thiruvananthapuram',
    'Thrissur',
    'Wayanad'
];

/**
 * Diagnostic analysis across all 14 Kerala districts and active categories,
 * identifying exactly where usable benchmarks exist and where data is insufficient.
 */
async function getBenchmarkCoverageDiagnostics() {
    const config = await getBenchmarkConfig();
    const minThreshold = Number(config.min_sample_threshold) || 3;
    const maxAgeDays = Number(config.max_data_age_days) || 365;
    const targetWageType = config.target_wage_type || 'service_charge';

    // 1. Official 14 Kerala administrative districts
    const districts = OFFICIAL_KERALA_DISTRICTS;

    // 2. Fetch all categories
    const catRes = await pool.query('SELECT id, name FROM categories ORDER BY name ASC');
    const categories = catRes.rows;

    // 3. Fetch all benchmarks
    const benchRes = await pool.query(`
        SELECT id, source_name, district, city, category_id, category_name, wage_type,
               reference_price, reference_amount, collection_date, effective_date, verification_status, created_at
        FROM pricing_wage_benchmarks
    `);

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (maxAgeDays * 24 * 60 * 60 * 1000));

    // Analyze per district and category
    const districtCoverage = {};
    districts.forEach(d => {
        districtCoverage[d] = {
            total_records: 0,
            verified_usable_records: 0,
            unverified_records: 0,
            stale_records: 0,
            incomparable_type_records: 0,
            categories_with_sufficient_data: [],
            categories_lacking_data: []
        };
    });

    // Bucket records
    benchRes.rows.forEach(r => {
        const d = r.district;
        if (!districtCoverage[d]) return;

        districtCoverage[d].total_records++;
        const recordDate = r.effective_date ? new Date(r.effective_date) : (r.collection_date ? new Date(r.collection_date) : new Date(r.created_at));
        const refAmount = Number(r.reference_amount ?? r.reference_price);

        if (r.verification_status !== 'verified') {
            districtCoverage[d].unverified_records++;
        } else if (recordDate < cutoffDate) {
            districtCoverage[d].stale_records++;
        } else if (r.wage_type !== targetWageType) {
            districtCoverage[d].incomparable_type_records++;
        } else if (Number.isFinite(refAmount) && refAmount > 0) {
            districtCoverage[d].verified_usable_records++;
        }
    });

    // Category gap analysis
    const categoryGaps = [];
    for (const cat of categories) {
        const catBenchmarks = benchRes.rows.filter(r => Number(r.category_id) === Number(cat.id));
        const validForCat = catBenchmarks.filter(r => {
            const recordDate = r.effective_date ? new Date(r.effective_date) : (r.collection_date ? new Date(r.collection_date) : new Date(r.created_at));
            const refAmount = Number(r.reference_amount ?? r.reference_price);
            return r.verification_status === 'verified' && recordDate >= cutoffDate && r.wage_type === targetWageType && Number.isFinite(refAmount) && refAmount > 0;
        });

        const districtsWithCatData = new Set(validForCat.map(r => r.district));
        const lackingDistricts = districts.filter(d => !districtsWithCatData.has(d));

        categoryGaps.push({
            category_id: cat.id,
            category_name: cat.name,
            usable_records_count: validForCat.length,
            districts_covered: Array.from(districtsWithCatData),
            districts_lacking: lackingDistricts,
            status: validForCat.length >= minThreshold ? 'partially_covered' : 'insufficient_evidence'
        });
    }

    return {
        threshold_config: {
            min_sample_threshold: minThreshold,
            max_data_age_days: maxAgeDays,
            target_wage_type: targetWageType,
            require_verified_only: true
        },
        total_benchmarks_in_db: benchRes.rows.length,
        districts_summary: districtCoverage,
        categories_gap_analysis: categoryGaps,
        overall_status: benchRes.rows.length === 0 ? 'zero_benchmarks_available' : 'insufficient_coverage'
    };
}

module.exports = {
    getBenchmarkConfig,
    updateBenchmarkConfig,
    getAdjustmentRecommendation,
    getBenchmarkCoverageDiagnostics
};
