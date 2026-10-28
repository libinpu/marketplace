-- Migration 026: Enhance Wage Benchmark Intelligence schema and configurable evidence threshold
ALTER TABLE pricing_wage_benchmarks 
ADD COLUMN IF NOT EXISTS effective_date DATE,
ADD COLUMN IF NOT EXISTS reference_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS evidence_metadata JSONB;

UPDATE pricing_wage_benchmarks
SET reference_amount = reference_price
WHERE reference_amount IS NULL AND reference_price IS NOT NULL;

CREATE TABLE IF NOT EXISTS pricing_system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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
