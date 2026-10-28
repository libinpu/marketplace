-- Migration 024: Category-Wise and City-Wise Dynamic Pricing Table

CREATE TABLE IF NOT EXISTS location_category_prices (
    id SERIAL PRIMARY KEY,
    district VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    category_name VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) DEFAULT 'admin',
    CONSTRAINT uq_location_category_prices UNIQUE (district, city, category_id)
);

CREATE INDEX IF NOT EXISTS idx_lcp_district_city ON location_category_prices(district, city);
CREATE INDEX IF NOT EXISTS idx_lcp_category_id ON location_category_prices(category_id);
CREATE INDEX IF NOT EXISTS idx_lcp_active ON location_category_prices(is_active);

-- Add service_city to service_requests for auditing & pricing snapshots
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS service_city VARCHAR(100);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS pricing_source VARCHAR(50) DEFAULT 'city_category_pricing';

-- Seed core test scenario prices and initial records
-- 1. Ottappalam, Palakkad - Plumbing: ₹140
INSERT INTO location_category_prices (district, city, category_id, category_name, price, currency, is_active)
SELECT 'Palakkad', 'Ottappalam', c.id, c.name, 140.00, 'INR', TRUE
FROM categories c WHERE LOWER(c.name) = 'plumbing'
ON CONFLICT (district, city, category_id) DO UPDATE
SET price = EXCLUDED.price, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP;

-- 2. Kottayam, Kottayam - Plumbing: ₹200
INSERT INTO location_category_prices (district, city, category_id, category_name, price, currency, is_active)
SELECT 'Kottayam', 'Kottayam', c.id, c.name, 200.00, 'INR', TRUE
FROM categories c WHERE LOWER(c.name) = 'plumbing'
ON CONFLICT (district, city, category_id) DO UPDATE
SET price = EXCLUDED.price, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP;

-- 3. Kottayam, Kottayam - Electrical: ₹250
INSERT INTO location_category_prices (district, city, category_id, category_name, price, currency, is_active)
SELECT 'Kottayam', 'Kottayam', c.id, c.name, 250.00, 'INR', TRUE
FROM categories c WHERE LOWER(c.name) = 'electrical'
ON CONFLICT (district, city, category_id) DO UPDATE
SET price = EXCLUDED.price, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP;

-- 4. Kottayam, Kottayam - Gardening & Landscaping: ₹180
INSERT INTO location_category_prices (district, city, category_id, category_name, price, currency, is_active)
SELECT 'Kottayam', 'Kottayam', c.id, c.name, 180.00, 'INR', TRUE
FROM categories c WHERE LOWER(c.name) = 'gardening & landscaping'
ON CONFLICT (district, city, category_id) DO UPDATE
SET price = EXCLUDED.price, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP;

-- 5. Thrissur, Thrissur - Plumbing: ₹160
INSERT INTO location_category_prices (district, city, category_id, category_name, price, currency, is_active)
SELECT 'Thrissur', 'Thrissur', c.id, c.name, 160.00, 'INR', TRUE
FROM categories c WHERE LOWER(c.name) = 'plumbing'
ON CONFLICT (district, city, category_id) DO UPDATE
SET price = EXCLUDED.price, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP;

-- 6. Palakkad, Ottappalam - Other Categories
INSERT INTO location_category_prices (district, city, category_id, category_name, price, currency, is_active)
SELECT 'Palakkad', 'Ottappalam', c.id, c.name, 
    CASE 
        WHEN LOWER(c.name) = 'electrical' THEN 210.00
        WHEN LOWER(c.name) = 'cleaning' THEN 250.00
        WHEN LOWER(c.name) = 'ac & appliances' THEN 850.00
        WHEN LOWER(c.name) = 'gardening & landscaping' THEN 160.00
        ELSE 299.00
    END, 'INR', TRUE
FROM categories c WHERE LOWER(c.name) NOT IN ('plumbing')
ON CONFLICT (district, city, category_id) DO NOTHING;

-- 7. Kottayam, Kottayam - Other Categories
INSERT INTO location_category_prices (district, city, category_id, category_name, price, currency, is_active)
SELECT 'Kottayam', 'Kottayam', c.id, c.name, 
    CASE 
        WHEN LOWER(c.name) = 'cleaning' THEN 300.00
        WHEN LOWER(c.name) = 'ac & appliances' THEN 950.00
        WHEN LOWER(c.name) = 'cctv & security' THEN 350.00
        WHEN LOWER(c.name) = 'vehicle' THEN 200.00
        ELSE 299.00
    END, 'INR', TRUE
FROM categories c WHERE LOWER(c.name) NOT IN ('plumbing', 'electrical', 'gardening & landscaping')
ON CONFLICT (district, city, category_id) DO NOTHING;

-- 8. Thrissur, Thrissur - Other Categories
INSERT INTO location_category_prices (district, city, category_id, category_name, price, currency, is_active)
SELECT 'Thrissur', 'Thrissur', c.id, c.name, 
    CASE 
        WHEN LOWER(c.name) = 'electrical' THEN 230.00
        WHEN LOWER(c.name) = 'cleaning' THEN 280.00
        WHEN LOWER(c.name) = 'ac & appliances' THEN 900.00
        ELSE 299.00
    END, 'INR', TRUE
FROM categories c WHERE LOWER(c.name) NOT IN ('plumbing')
ON CONFLICT (district, city, category_id) DO NOTHING;

-- 9. Seed other major Kerala cities for active categories so existing services remain functional
INSERT INTO location_category_prices (district, city, category_id, category_name, price, currency, is_active)
SELECT 'Ernakulam', 'Kochi', c.id, c.name,
    CASE 
        WHEN LOWER(c.name) = 'plumbing' THEN 250.00
        WHEN LOWER(c.name) = 'electrical' THEN 290.00
        WHEN LOWER(c.name) = 'cleaning' THEN 350.00
        WHEN LOWER(c.name) = 'ac & appliances' THEN 1100.00
        ELSE 349.00
    END, 'INR', TRUE
FROM categories c
ON CONFLICT (district, city, category_id) DO NOTHING;

INSERT INTO location_category_prices (district, city, category_id, category_name, price, currency, is_active)
SELECT 'Thiruvananthapuram', 'Thiruvananthapuram', c.id, c.name,
    CASE 
        WHEN LOWER(c.name) = 'plumbing' THEN 220.00
        WHEN LOWER(c.name) = 'electrical' THEN 260.00
        WHEN LOWER(c.name) = 'cleaning' THEN 320.00
        WHEN LOWER(c.name) = 'ac & appliances' THEN 1000.00
        ELSE 299.00
    END, 'INR', TRUE
FROM categories c
ON CONFLICT (district, city, category_id) DO NOTHING;

INSERT INTO location_category_prices (district, city, category_id, category_name, price, currency, is_active)
SELECT 'Kozhikode', 'Kozhikode', c.id, c.name,
    CASE 
        WHEN LOWER(c.name) = 'plumbing' THEN 210.00
        WHEN LOWER(c.name) = 'electrical' THEN 240.00
        WHEN LOWER(c.name) = 'cleaning' THEN 290.00
        ELSE 280.00
    END, 'INR', TRUE
FROM categories c
ON CONFLICT (district, city, category_id) DO NOTHING;

INSERT INTO location_category_prices (district, city, category_id, category_name, price, currency, is_active)
SELECT 'Kollam', 'Kollam', c.id, c.name,
    CASE 
        WHEN LOWER(c.name) = 'plumbing' THEN 180.00
        WHEN LOWER(c.name) = 'electrical' THEN 220.00
        WHEN LOWER(c.name) = 'cleaning' THEN 260.00
        ELSE 260.00
    END, 'INR', TRUE
FROM categories c
ON CONFLICT (district, city, category_id) DO NOTHING;

-- Ensure a verified provider exists for Palakkad / Ottappalam for Plumbing test scenario
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM professionals WHERE district = 'Palakkad' AND city = 'Ottappalam') THEN
        INSERT INTO professionals (
            user_id, full_name, category, district, city, state, address, 
            experience_years, verification_status, is_online, registered_latitude, registered_longitude,
            current_latitude, current_longitude, work_radius
        )
        SELECT 
            u.id, 'Manoj Kumar', 'Plumbing', 'Palakkad', 'Ottappalam', 'Kerala', 
            'Main Road, Ottappalam, Palakkad, Kerala - 679101', 6, 'verified', true,
            10.7738, 76.3797, 10.7738, 76.3797, 15
        FROM users u WHERE email = 'test@example.com' OR id = 42
        LIMIT 1;
        
        -- If no such user, use any user
        IF NOT FOUND THEN
            INSERT INTO professionals (
                user_id, full_name, category, district, city, state, address, 
                experience_years, verification_status, is_online, registered_latitude, registered_longitude,
                current_latitude, current_longitude, work_radius
            )
            SELECT 
                id, 'Manoj Kumar', 'Plumbing', 'Palakkad', 'Ottappalam', 'Kerala', 
                'Main Road, Ottappalam, Palakkad, Kerala - 679101', 6, 'verified', true,
                10.7738, 76.3797, 10.7738, 76.3797, 15
            FROM users
            ORDER BY id ASC
            LIMIT 1;
        END IF;
    END IF;
END $$;
