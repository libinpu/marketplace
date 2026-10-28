const pool = require('../config/database');

async function migrateWageBenchmarks() {
    console.log('Running Migration 026: Enhance Wage Benchmark Intelligence schema...');
    
    // Add missing metadata fields to pricing_wage_benchmarks if they don't exist
    await pool.query(`
        ALTER TABLE pricing_wage_benchmarks 
        ADD COLUMN IF NOT EXISTS effective_date DATE,
        ADD COLUMN IF NOT EXISTS reference_amount NUMERIC(10, 2),
        ADD COLUMN IF NOT EXISTS notes TEXT,
        ADD COLUMN IF NOT EXISTS evidence_metadata JSONB;
    `);

    // Backfill reference_amount from reference_price if null
    await pool.query(`
        UPDATE pricing_wage_benchmarks
        SET reference_amount = reference_price
        WHERE reference_amount IS NULL AND reference_price IS NOT NULL;
    `);

    // Create system config table for configurable intelligence threshold if not exists
    await pool.query(`
        CREATE TABLE IF NOT EXISTS pricing_system_settings (
            key VARCHAR(100) PRIMARY KEY,
            value JSONB NOT NULL,
            description TEXT,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Insert default benchmark threshold config if missing
    await pool.query(`
        INSERT INTO pricing_system_settings (key, value, description)
        VALUES (
            'wage_benchmark_config',
            jsonb_build_object(
                'min_sample_threshold', 3,
                'max_data_age_days', 365,
                'target_wage_type', 'service_charge',
                'require_verified_only', true
            ),
            'Configurable evidence thresholds and filtering criteria for Wage Benchmark Intelligence'
        )
        ON CONFLICT (key) DO NOTHING;
    `);

    console.log('Migration 026 completed successfully.');
    await pool.end();
}

migrateWageBenchmarks().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
