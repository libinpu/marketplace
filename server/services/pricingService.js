const pool = require('../config/database');

/**
 * Calculates straight-line distance in kilometers between two lat/lon points
 * using the Haversine formula.
 */
function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
    if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
        return null;
    }
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = 6371 * c;
    return Math.round(d * 10) / 10;
}

/**
 * Resolves location details from database or text/coordinates
 */
async function resolveLocation({ locationId, district, city, locality, latitude, longitude }) {
    if (locationId) {
        const res = await pool.query('SELECT * FROM kerala_locations WHERE id = $1', [locationId]);
        if (res.rows.length > 0) return res.rows[0];
    }

    if (city) {
        const query = locality
            ? 'SELECT * FROM kerala_locations WHERE LOWER(city) = LOWER($1) AND (locality IS NULL OR LOWER(locality) = LOWER($2)) ORDER BY locality NULLS LAST LIMIT 1'
            : 'SELECT * FROM kerala_locations WHERE LOWER(city) = LOWER($1) ORDER BY id ASC LIMIT 1';
        const params = locality ? [city.trim(), locality.trim()] : [city.trim()];
        const res = await pool.query(query, params);
        if (res.rows.length > 0) return res.rows[0];
    }

    if (district) {
        const res = await pool.query(
            'SELECT * FROM kerala_locations WHERE LOWER(district) = LOWER($1) ORDER BY location_type = \'corporation\' DESC, id ASC LIMIT 1',
            [district.trim()]
        );
        if (res.rows.length > 0) return res.rows[0];
    }

    // Coordinates fallback
    if (Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
        const res = await pool.query(
            `SELECT *, 
              (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) + sin(radians($1)) * sin(radians(latitude)))) AS dist_km
             FROM kerala_locations
             WHERE latitude IS NOT NULL AND longitude IS NOT NULL
             ORDER BY dist_km ASC
             LIMIT 1`,
            [Number(latitude), Number(longitude)]
        );
        if (res.rows.length > 0 && res.rows[0].dist_km <= 50) {
            return res.rows[0];
        }
    }

    return null;
}

/**
 * Calculates authoritative travel charge.
 * Note: Travel expenses have been disabled per requirement so users are charged only for the local labour wage.
 */
async function calculateTravelCharge({ district, providerLat, providerLon, serviceLat, serviceLon }) {
    return {
        travel_charge: 0,
        distance_km: null,
        billable_km: 0,
        free_radius_km: 0,
        per_km_rate: 0,
        visit_fee: 0,
        rule_applied: 'Travel Charge Waived',
        status: 'waived'
    };
}

/**
 * Authoritative backend pricing calculation engine.
 * Computes base price -> location adjustment (priority: locality > city > district > default) -> exact manual override -> travel fee.
 */
async function calculatePrice({
    categoryId,
    categoryName,
    jobTypeId,
    locationId,
    district,
    city,
    locality,
    providerLat,
    providerLon,
    serviceLat,
    serviceLon
}) {
    // 1. Resolve Category
    let resolvedCategoryId = categoryId ? Number(categoryId) : null;
    let resolvedCategoryName = categoryName ? categoryName.trim() : null;

    if (!resolvedCategoryId && resolvedCategoryName) {
        const catRes = await pool.query(
            'SELECT id, name FROM categories WHERE LOWER(name) = LOWER($1) LIMIT 1',
            [resolvedCategoryName]
        );
        if (catRes.rows.length > 0) {
            resolvedCategoryId = Number(catRes.rows[0].id);
            resolvedCategoryName = catRes.rows[0].name;
        }
    } else if (resolvedCategoryId && !resolvedCategoryName) {
        const catRes = await pool.query('SELECT id, name FROM categories WHERE id = $1', [resolvedCategoryId]);
        if (catRes.rows.length > 0) {
            resolvedCategoryName = catRes.rows[0].name;
        }
    }

    if (!resolvedCategoryId) {
        return {
            available: false,
            error_code: 'CATEGORY_NOT_FOUND',
            message: 'A valid service category is required to determine pricing.'
        };
    }

    // 2. Resolve Service Location
    const location = await resolveLocation({
        locationId,
        district,
        city,
        locality,
        latitude: serviceLat,
        longitude: serviceLon
    });

    const targetDistrict = (district && typeof district === 'string' && district.trim()) ? district.trim() : (location?.district || null);
    const targetCity = (city && typeof city === 'string' && city.trim()) ? city.trim() : (location?.city || null);
    const targetLocality = (locality && typeof locality === 'string' && locality.trim()) ? locality.trim() : (location?.locality || null);

    if (!targetDistrict && !targetCity) {
        return {
            available: false,
            error_code: 'LOCATION_NOT_FOUND',
            message: 'A valid service location (district or city) in Kerala is required to determine pricing.'
        };
    }

    // 3. Step 3: Find Applicable Base Rate
    // Priority: Specific job_type_id base price, else category-level base price
    const baseRes = await pool.query(
        `SELECT * FROM pricing_base_rates
         WHERE category_id = $1
           AND is_active = TRUE
           AND (
               ($2::int IS NOT NULL AND job_type_id = $2)
               OR job_type_id IS NULL
           )
         ORDER BY job_type_id NULLS LAST
         LIMIT 1`,
        [resolvedCategoryId, jobTypeId ? Number(jobTypeId) : null]
    );

    if (baseRes.rows.length === 0) {
        return {
            available: false,
            error_code: 'BASE_PRICE_MISSING',
            category_id: resolvedCategoryId,
            category_name: resolvedCategoryName,
            city: targetCity,
            district: targetDistrict,
            message: `Base price is not configured for ${resolvedCategoryName}.`
        };
    }

    const baseRecord = baseRes.rows[0];
    const basePrice = Math.round(Number(baseRecord.base_price) * 100) / 100;
    const currency = baseRecord.currency || 'INR';

    // 4. Step 4: Find the Most Specific Applicable Location Adjustment
    // Priority order:
    // 1. Exact locality/category/job type
    // 2. City or town/category/job type
    // 3. District/category/job type
    // 4. Configured default adjustment (0%)
    const adjRes = await pool.query(
        `SELECT * FROM pricing_location_adjustments
         WHERE is_active = TRUE
           AND (category_id IS NULL OR category_id = $1)
           AND (job_type_id IS NULL OR job_type_id = $2)
           AND (
               -- 1. Locality specific adjustment
               ($3::varchar IS NOT NULL AND locality IS NOT NULL AND LOWER(locality) = LOWER($3)
                AND (city IS NULL OR LOWER(city) = LOWER($4))
                AND (district IS NULL OR LOWER(district) = LOWER($5)))
               OR
               -- 2. City specific adjustment (applies when no locality rule or outside specified locality)
               (locality IS NULL AND city IS NOT NULL AND $4::varchar IS NOT NULL AND LOWER(city) = LOWER($4)
                AND (district IS NULL OR LOWER(district) = LOWER($5)))
               OR
               -- 3. District specific adjustment (applies to cities without specific city adjustment)
               (locality IS NULL AND city IS NULL AND district IS NOT NULL AND $5::varchar IS NOT NULL AND LOWER(district) = LOWER($5))
               OR
               -- 4. Statewide default adjustment
               (locality IS NULL AND city IS NULL AND district IS NULL)
           )
         ORDER BY
             CASE 
                 WHEN $3::varchar IS NOT NULL AND locality IS NOT NULL AND LOWER(locality) = LOWER($3) THEN 1
                 WHEN $4::varchar IS NOT NULL AND city IS NOT NULL AND LOWER(city) = LOWER($4) THEN 2
                 WHEN $5::varchar IS NOT NULL AND district IS NOT NULL AND LOWER(district) = LOWER($5) THEN 3
                 ELSE 4
             END ASC,
             category_id NULLS LAST,
             job_type_id NULLS LAST
         LIMIT 1`,
        [
            resolvedCategoryId,
            jobTypeId ? Number(jobTypeId) : null,
            targetLocality || null,
            targetCity || null,
            targetDistrict || null
        ]
    );

    let appliedAdjustment = null;
    let adjustedLabourPrice = basePrice;

    if (adjRes.rows.length > 0) {
        const adj = adjRes.rows[0];
        const val = Number(adj.adjustment_value);
        if (adj.adjustment_type === 'percentage') {
            adjustedLabourPrice = basePrice * (1 + (val / 100));
        } else {
            adjustedLabourPrice = basePrice + val;
        }
        appliedAdjustment = {
            id: adj.id,
            type: adj.adjustment_type,
            value: val,
            formatted: adj.adjustment_type === 'percentage' 
                ? `${val >= 0 ? '+' : ''}${val}%` 
                : `${val >= 0 ? '+₹' : '-₹'}${Math.abs(val)}`,
            scope: adj.locality ? 'locality' : (adj.city ? 'city' : (adj.district ? 'district' : 'default'))
        };
    } else {
        // Fallback default adjustment: 0%
        appliedAdjustment = {
            id: null,
            type: 'percentage',
            value: 0,
            formatted: '0% (Standard)',
            scope: 'default'
        };
    }

    // Ensure non-negative labour price
    adjustedLabourPrice = Math.max(0, Math.round(adjustedLabourPrice * 100) / 100);

    // 5. Step 5: Check for Exact Manual Override (Takes Highest Priority over calculated labour price)
    const overrideRes = await pool.query(
        `SELECT * FROM pricing_manual_overrides
         WHERE is_active = TRUE
           AND category_id = $1
           AND (job_type_id IS NULL OR job_type_id = $2)
           AND (
               -- 1. Locality specific override
               ($3::varchar IS NOT NULL AND locality IS NOT NULL AND LOWER(locality) = LOWER($3)
                AND (city IS NULL OR LOWER(city) = LOWER($4))
                AND (district IS NULL OR LOWER(district) = LOWER($5)))
               OR
               -- 2. City specific override
               (locality IS NULL AND city IS NOT NULL AND $4::varchar IS NOT NULL AND LOWER(city) = LOWER($4)
                AND (district IS NULL OR LOWER(district) = LOWER($5)))
               OR
               -- 3. District specific override
               (locality IS NULL AND city IS NULL AND district IS NOT NULL AND $5::varchar IS NOT NULL AND LOWER(district) = LOWER($5))
           )
         ORDER BY
             CASE 
                 WHEN $3::varchar IS NOT NULL AND locality IS NOT NULL AND LOWER(locality) = LOWER($3) THEN 1
                 WHEN $4::varchar IS NOT NULL AND city IS NOT NULL AND LOWER(city) = LOWER($4) THEN 2
                 WHEN $5::varchar IS NOT NULL AND district IS NOT NULL AND LOWER(district) = LOWER($5) THEN 3
                 ELSE 4
             END ASC,
             job_type_id NULLS LAST
         LIMIT 1`,
        [
            resolvedCategoryId,
            jobTypeId ? Number(jobTypeId) : null,
            targetLocality || null,
            targetCity || null,
            targetDistrict || null
        ]
    );

    let finalLabourPrice = adjustedLabourPrice;
    let exactOverrideApplied = null;

    if (overrideRes.rows.length > 0) {
        const ovr = overrideRes.rows[0];
        finalLabourPrice = Math.max(0, Math.round(Number(ovr.exact_price) * 100) / 100);
        exactOverrideApplied = {
            id: ovr.id,
            exact_price: finalLabourPrice,
            reason: ovr.reason,
            scope: ovr.locality ? 'locality' : (ovr.city ? 'city' : (ovr.district ? 'district' : 'global'))
        };
    }

    // 6. Step 6: Travel Pricing Calculation
    const travelCalc = await calculateTravelCharge({
        district: targetDistrict,
        providerLat,
        providerLon,
        serviceLat: serviceLat || location?.latitude,
        serviceLon: serviceLon || location?.longitude
    });

    const travelFee = travelCalc.travel_charge || 0;
    const estimatedTotal = Math.round((finalLabourPrice + travelFee) * 100) / 100;

    return {
        available: true,
        category_id: resolvedCategoryId,
        category_name: resolvedCategoryName,
        job_type_id: jobTypeId ? Number(jobTypeId) : null,
        location: {
            id: location?.id || null,
            district: targetDistrict,
            city: targetCity,
            locality: targetLocality || null,
            location_type: location?.location_type || 'town',
            verification_status: location?.verification_status || 'verified'
        },
        pricing_breakdown: {
            base_price: basePrice,
            currency,
            applied_adjustment: appliedAdjustment,
            adjusted_labour_price: adjustedLabourPrice,
            exact_override: exactOverrideApplied,
            final_labour_price: finalLabourPrice,
            travel: travelCalc,
            estimated_total: estimatedTotal,
            is_unverified_default: appliedAdjustment.scope === 'default' && !exactOverrideApplied
        }
    };
}

module.exports = {
    calculatePrice,
    calculateTravelCharge,
    resolveLocation,
    calculateHaversineDistanceKm
};
