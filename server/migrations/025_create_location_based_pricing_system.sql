-- Migration 025: Unified Location-Based Pricing System for Kerala
-- Replaces old fragmented pricing structures with a hierarchical, scalable pricing engine.

-- 1. Kerala Locations Table (Cities, Towns, Municipalities, Service Areas)
CREATE TABLE IF NOT EXISTS kerala_locations (
    id SERIAL PRIMARY KEY,
    state VARCHAR(100) NOT NULL DEFAULT 'Kerala',
    district VARCHAR(100) NOT NULL,
    city VARCHAR(150) NOT NULL,
    locality VARCHAR(150),
    pincode VARCHAR(20),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    location_type VARCHAR(50) NOT NULL DEFAULT 'town', -- 'corporation', 'municipality', 'town', 'panchayath', 'locality'
    parent_location_id INTEGER REFERENCES kerala_locations(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'verified', -- 'verified', 'pending', 'unverified'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_kerala_location UNIQUE (district, city, locality)
);

CREATE INDEX IF NOT EXISTS idx_kerala_locations_district ON kerala_locations(district);
CREATE INDEX IF NOT EXISTS idx_kerala_locations_city ON kerala_locations(city);
CREATE INDEX IF NOT EXISTS idx_kerala_locations_active ON kerala_locations(is_active);

-- 2. Base Labour Prices (Category / Job Type)
CREATE TABLE IF NOT EXISTS pricing_base_rates (
    id SERIAL PRIMARY KEY,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    job_type_id INTEGER REFERENCES subcategories(id) ON DELETE CASCADE,
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) DEFAULT 'admin',
    CONSTRAINT uq_pricing_base_rate UNIQUE (category_id, job_type_id)
);

CREATE INDEX IF NOT EXISTS idx_pricing_base_rates_cat_job ON pricing_base_rates(category_id, job_type_id);
CREATE INDEX IF NOT EXISTS idx_pricing_base_rates_active ON pricing_base_rates(is_active);

-- 3. Location Adjustments (Locality, City, or District scoped)
CREATE TABLE IF NOT EXISTS pricing_location_adjustments (
    id SERIAL PRIMARY KEY,
    location_id INTEGER REFERENCES kerala_locations(id) ON DELETE CASCADE,
    district VARCHAR(100),
    city VARCHAR(150),
    locality VARCHAR(150),
    category_id BIGINT REFERENCES categories(id) ON DELETE CASCADE,
    job_type_id INTEGER REFERENCES subcategories(id) ON DELETE CASCADE,
    adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('percentage', 'fixed')),
    adjustment_value NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) DEFAULT 'admin'
);

CREATE INDEX IF NOT EXISTS idx_pla_location ON pricing_location_adjustments(location_id, district, city);
CREATE INDEX IF NOT EXISTS idx_pla_cat_job ON pricing_location_adjustments(category_id, job_type_id);
CREATE INDEX IF NOT EXISTS idx_pla_active ON pricing_location_adjustments(is_active);

-- 4. Exact Manual Price Overrides
CREATE TABLE IF NOT EXISTS pricing_manual_overrides (
    id SERIAL PRIMARY KEY,
    location_id INTEGER REFERENCES kerala_locations(id) ON DELETE CASCADE,
    district VARCHAR(100),
    city VARCHAR(150),
    locality VARCHAR(150),
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    job_type_id INTEGER REFERENCES subcategories(id) ON DELETE CASCADE,
    exact_price NUMERIC(10, 2) NOT NULL CHECK (exact_price >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) DEFAULT 'admin'
);

CREATE INDEX IF NOT EXISTS idx_pmo_location ON pricing_manual_overrides(location_id, district, city);
CREATE INDEX IF NOT EXISTS idx_pmo_cat_job ON pricing_manual_overrides(category_id, job_type_id);
CREATE INDEX IF NOT EXISTS idx_pmo_active ON pricing_manual_overrides(is_active);

-- 5. Travel Pricing Rules
CREATE TABLE IF NOT EXISTS pricing_travel_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL DEFAULT 'Standard Travel Rate',
    district VARCHAR(100), -- optional district-specific travel rule, null = statewide
    fixed_visit_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    free_radius_km NUMERIC(6, 2) NOT NULL DEFAULT 5.00,
    per_km_rate NUMERIC(10, 2) NOT NULL DEFAULT 10.00,
    min_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    max_fee NUMERIC(10, 2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed default statewide travel rule if not exists
INSERT INTO pricing_travel_rules (rule_name, fixed_visit_fee, free_radius_km, per_km_rate, min_fee, max_fee, is_active)
SELECT 'Kerala Default Travel Rule', 0.00, 5.00, 10.00, 0.00, 300.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM pricing_travel_rules);

-- 6. Wage Data & Market Benchmarks for Recommendations
CREATE TABLE IF NOT EXISTS pricing_wage_benchmarks (
    id SERIAL PRIMARY KEY,
    source_name VARCHAR(150) NOT NULL,
    source_identifier VARCHAR(150),
    district VARCHAR(100) NOT NULL,
    city VARCHAR(150),
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    category_name VARCHAR(100) NOT NULL,
    wage_type VARCHAR(50) NOT NULL DEFAULT 'service_charge', -- 'daily_wage', 'hourly', 'service_charge'
    reference_price NUMERIC(10, 2) NOT NULL,
    sample_count INTEGER DEFAULT 1,
    collection_date DATE,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'verified'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Pricing Audit Log
CREATE TABLE IF NOT EXISTS pricing_audit_logs (
    id SERIAL PRIMARY KEY,
    admin_id VARCHAR(100) NOT NULL DEFAULT 'admin',
    action_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'toggle', 'bulk_update'
    entity_type VARCHAR(50) NOT NULL, -- 'base_price', 'adjustment', 'override', 'travel_rule', 'location'
    entity_id INTEGER,
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Add immutable pricing snapshot columns to service_requests (Preserve all historical requests)
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS pricing_snapshot JSONB;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS labour_price NUMERIC(10, 2);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS applied_adjustment_type VARCHAR(20);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS applied_adjustment_value NUMERIC(10, 2);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS has_exact_override BOOLEAN DEFAULT FALSE;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS travel_distance_km NUMERIC(8, 2);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS service_location_id INTEGER REFERENCES kerala_locations(id) ON DELETE SET NULL;

-- 9. Backfill historical service_requests pricing snapshots from existing final_amount & wage
UPDATE service_requests
SET pricing_snapshot = jsonb_build_object(
    'service_city', COALESCE(service_city, location),
    'district', district,
    'base_price', COALESCE(base_price, wage, final_amount, 0),
    'labour_price', COALESCE(wage, final_amount, 0),
    'travel_fee', COALESCE(travel_fee, 0),
    'final_amount', COALESCE(final_amount, wage, 0),
    'pricing_source', COALESCE(pricing_source, 'historical_migration'),
    'confirmed_at', COALESCE(requested_at, created_at)
),
labour_price = COALESCE(wage, final_amount, 0)
WHERE pricing_snapshot IS NULL;
