const pool = require('../config/database');
const { notifyPro } = require('../utils/proSseClients');
const { broadcast } = require('../utils/sseClients');
const { addCustomerClient, removeCustomerClient, notifyCustomer } = require('../utils/customerSseClients');
const { checkAndSend1HourReminders } = require('../services/reminderService');
const { calculatePrice, resolveLocation, calculateTravelCharge } = require('../services/pricingService');

let profilePhotoColumnEnsured = false;
async function ensureProfilePhotoColumn() {
    if (profilePhotoColumnEnsured) return;
    try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo TEXT');
        profilePhotoColumnEnsured = true;
    } catch (err) {
        console.warn('Could not ensure profile_photo column:', err.message);
    }
}

exports.getProfile = async (req, res) => {
    try {
        await ensureProfilePhotoColumn();
        let result;
        try {
            result = await pool.query(
                'SELECT id, name, email, phone, address, profile_photo FROM users WHERE id = $1',
                [req.user.id]
            );
        } catch {
            // Fallback if column still not recognized
            result = await pool.query(
                'SELECT id, name, email, phone, address FROM users WHERE id = $1',
                [req.user.id]
            );
        }
        if (!result.rows[0]) return res.status(404).json({ message: 'Profile not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('getProfile error:', err);
        res.status(500).json({ message: 'Failed to fetch profile' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        await ensureProfilePhotoColumn();
        const { phone, address } = req.body || {};
        let profile_photo = req.body?.profile_photo || null;
        if (req.file) {
            profile_photo = `/uploads/${req.file.filename}`;
        }

        // Fetch current user data to avoid wiping existing values if omitted
        let current = {};
        try {
            const currentRes = await pool.query(
                'SELECT phone, address, profile_photo FROM users WHERE id = $1',
                [req.user.id]
            );
            if (!currentRes.rows[0]) return res.status(404).json({ message: 'Profile not found' });
            current = currentRes.rows[0];
        } catch {
            const currentRes = await pool.query(
                'SELECT phone, address FROM users WHERE id = $1',
                [req.user.id]
            );
            if (!currentRes.rows[0]) return res.status(404).json({ message: 'Profile not found' });
            current = currentRes.rows[0];
        }

        const updatedPhone = (phone !== undefined && phone !== null && String(phone).trim() !== '') 
            ? String(phone).trim() 
            : current.phone;
        const updatedAddress = address !== undefined 
            ? (String(address).trim() || null) 
            : current.address;
        const updatedPhoto = profile_photo !== null 
            ? profile_photo 
            : (current.profile_photo || null);

        let result;
        try {
            result = await pool.query(
                `UPDATE users SET phone = $1, address = $2, profile_photo = $3
                 WHERE id = $4 RETURNING id, name, email, phone, address, profile_photo`,
                [updatedPhone, updatedAddress, updatedPhoto, req.user.id]
            );
        } catch {
            result = await pool.query(
                `UPDATE users SET phone = $1, address = $2
                 WHERE id = $3 RETURNING id, name, email, phone, address`,
                [updatedPhone, updatedAddress, req.user.id]
            );
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('updateProfile error:', err);
        res.status(500).json({ message: 'Failed to update profile' });
    }
};

// GET /api/user/addresses - list all saved addresses for current user
exports.getUserAddresses = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, user_id, address_type, address_line, landmark, city, state, pincode, latitude, longitude, is_default, created_at
             FROM user_addresses
             WHERE user_id = $1
             ORDER BY is_default DESC, id DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('getUserAddresses error:', err);
        res.status(500).json({ message: 'Failed to fetch addresses' });
    }
};

// POST /api/user/addresses - add new address for current user (home, work, other)
exports.addUserAddress = async (req, res) => {
    try {
        const {
            address_type = 'home',
            address_line,
            landmark,
            city = 'Thiruvananthapuram',
            state = 'Kerala',
            pincode,
            latitude,
            longitude,
            is_default = false
        } = req.body;

        if (!address_line?.trim()) {
            return res.status(400).json({ message: 'Address line is required' });
        }

        const validTypes = ['home', 'work', 'other'];
        const normalizedType = validTypes.includes(address_type?.toLowerCase()?.trim())
            ? address_type.toLowerCase().trim()
            : 'other';

        // If this address is set to default, clear default flag for user's other addresses
        if (is_default) {
            await pool.query(
                'UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1',
                [req.user.id]
            );
        }

        const result = await pool.query(
            `INSERT INTO user_addresses (
                user_id, address_type, address_line, landmark, city, state, pincode, latitude, longitude, is_default
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *`,
            [
                req.user.id,
                normalizedType,
                address_line.trim(),
                landmark?.trim() || null,
                city?.trim() || 'Thiruvananthapuram',
                state?.trim() || 'Kerala',
                pincode?.trim() || null,
                latitude ? parseFloat(latitude) : null,
                longitude ? parseFloat(longitude) : null,
                Boolean(is_default)
            ]
        );

        // Also update users.address with latest address
        await pool.query(
            'UPDATE users SET address = $1 WHERE id = $2',
            [address_line.trim(), req.user.id]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('addUserAddress error:', err);
        res.status(500).json({ message: 'Failed to save address' });
    }
};

// PATCH /api/user/addresses/:id - update existing address or set as default
exports.updateUserAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        const {
            address_type,
            address_line,
            landmark,
            city,
            state,
            pincode,
            latitude,
            longitude,
            is_default
        } = req.body;

        if (is_default) {
            await pool.query(
                'UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1',
                [req.user.id]
            );
        }

        const result = await pool.query(
            `UPDATE user_addresses SET
                address_type = COALESCE($1, address_type),
                address_line = COALESCE($2, address_line),
                landmark = COALESCE($3, landmark),
                city = COALESCE($4, city),
                state = COALESCE($5, state),
                pincode = COALESCE($6, pincode),
                latitude = COALESCE($7, latitude),
                longitude = COALESCE($8, longitude),
                is_default = COALESCE($9, is_default)
             WHERE id = $10 AND user_id = $11
             RETURNING *`,
            [
                address_type?.toLowerCase()?.trim() || null,
                address_line?.trim() || null,
                landmark !== undefined ? (landmark?.trim() || null) : null,
                city?.trim() || null,
                state?.trim() || null,
                pincode?.trim() || null,
                latitude !== undefined ? parseFloat(latitude) : null,
                longitude !== undefined ? parseFloat(longitude) : null,
                is_default !== undefined ? Boolean(is_default) : null,
                addressId,
                req.user.id
            ]
        );

        if (!result.rows[0]) {
            return res.status(404).json({ message: 'Address not found or unauthorized' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('updateUserAddress error:', err);
        res.status(500).json({ message: 'Failed to update address' });
    }
};

// DELETE /api/user/addresses/:id - remove saved address
exports.deleteUserAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        const result = await pool.query(
            'DELETE FROM user_addresses WHERE id = $1 AND user_id = $2 RETURNING id',
            [addressId, req.user.id]
        );
        if (!result.rows[0]) {
            return res.status(404).json({ message: 'Address not found or unauthorized' });
        }
        res.json({ message: 'Address deleted successfully', id: addressId });
    } catch (err) {
        console.error('deleteUserAddress error:', err);
        res.status(500).json({ message: 'Failed to delete address' });
    }
};

const CATEGORY_ALIASES = {
    'AC & Appliances': ['AC & Appliances'],
    'Cleaning': ['Cleaning'],
    'Pest Control': ['Pest Control'],
    'Home Improvement': ['Home Improvement'],
    'Vehicle': ['Vehicle'],
    'Personal & Daily Help': ['Personal & Daily Help', 'Personal Care'],
    'CCTV & Security': ['CCTV & Security'],
    'Plumbing': ['Plumbing'],
    'Electrical': ['Electrical'],
    'Gardening & Landscaping': ['Gardening & Landscaping'],
    'Computer & Mobile Repair': ['Computer & Mobile Repair'],
    'Photography & Videography': ['Photography & Videography']
};

const KERALA_DISTRICTS = [
    'Kasaragod', 'Kannur', 'Wayanad', 'Kozhikode', 'Malappuram',
    'Palakkad', 'Thrissur', 'Ernakulam', 'Idukki', 'Kottayam',
    'Alappuzha', 'Pathanamthitta', 'Kollam', 'Thiruvananthapuram'
];

const DISTRICT_ALIASES = {
    'trivandrum': 'Thiruvananthapuram',
    'thiruvananthapuram': 'Thiruvananthapuram',
    'kochi': 'Ernakulam',
    'cochin': 'Ernakulam',
    'ernakulam': 'Ernakulam',
    'calicut': 'Kozhikode',
    'kozhikode': 'Kozhikode',
    'alleppey': 'Alappuzha',
    'alappuzha': 'Alappuzha',
    'trichur': 'Thrissur',
    'thrissur': 'Thrissur',
    'palghat': 'Palakkad',
    'palakkad': 'Palakkad',
    'kollam': 'Kollam',
    'quilon': 'Kollam',
    'kottayam': 'Kottayam',
    'malappuram': 'Malappuram',
    'kasaragod': 'Kasaragod',
    'kasargod': 'Kasaragod',
    'pathanamthitta': 'Pathanamthitta',
    'idukki': 'Idukki',
    'wayanad': 'Wayanad',
    'kannur': 'Kannur'
};

const DISTRICT_CENTERS = {
    'Kasaragod': { lat: 12.5102, lon: 75.0000 },
    'Kannur': { lat: 11.8745, lon: 75.3704 },
    'Wayanad': { lat: 11.6103, lon: 76.0827 },
    'Kozhikode': { lat: 11.2588, lon: 75.7804 },
    'Malappuram': { lat: 11.0510, lon: 76.0711 },
    'Palakkad': { lat: 10.7867, lon: 76.6548 },
    'Thrissur': { lat: 10.5276, lon: 76.2144 },
    'Ernakulam': { lat: 9.9816, lon: 76.2999 },
    'Idukki': { lat: 9.8497, lon: 76.9806 },
    'Kottayam': { lat: 9.5916, lon: 76.5222 },
    'Alappuzha': { lat: 9.4981, lon: 76.3388 },
    'Pathanamthitta': { lat: 9.2648, lon: 76.7870 },
    'Kollam': { lat: 8.8932, lon: 76.6141 },
    'Thiruvananthapuram': { lat: 8.5241, lon: 76.9366 }
};

function normalizeDistrict(name) {
    if (!name || typeof name !== 'string') return null;
    const lower = name.trim().toLowerCase();
    return DISTRICT_ALIASES[lower] || null;
}

function detectDistrict(text, lat, lon) {
    if (text && typeof text === 'string') {
        const lower = text.toLowerCase();
        for (const [alias, standard] of Object.entries(DISTRICT_ALIASES)) {
            const regex = new RegExp(`\\b${alias}\\b`, 'i');
            if (regex.test(lower)) {
                return standard;
            }
        }
    }
    const numLat = Number(lat);
    const numLon = Number(lon);
    if (Number.isFinite(numLat) && Number.isFinite(numLon)) {
        let closestDistrict = null;
        let minDistance = Infinity;
        for (const [dist, coords] of Object.entries(DISTRICT_CENTERS)) {
            const dLat = (coords.lat - numLat) * Math.PI / 180;
            const dLon = (coords.lon - numLon) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(numLat * Math.PI / 180) * Math.cos(coords.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
            const d = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            if (d < minDistance) {
                minDistance = d;
                closestDistrict = dist;
            }
        }
        if (closestDistrict && minDistance <= 80) {
            return closestDistrict;
        }
    }
    return null;
}

const KERALA_CITIES_MAP = {
    'ottappalam': { city: 'Ottappalam', district: 'Palakkad' },
    'palakkad': { city: 'Palakkad', district: 'Palakkad' },
    'chittur': { city: 'Chittur', district: 'Palakkad' },
    'mannarkkad': { city: 'Mannarkkad', district: 'Palakkad' },
    'pattambi': { city: 'Pattambi', district: 'Palakkad' },
    'shoranur': { city: 'Shoranur', district: 'Palakkad' },
    'kottayam': { city: 'Kottayam', district: 'Kottayam' },
    'changanassery': { city: 'Changanassery', district: 'Kottayam' },
    'pala': { city: 'Pala', district: 'Kottayam' },
    'vaikom': { city: 'Vaikom', district: 'Kottayam' },
    'erattupetta': { city: 'Erattupetta', district: 'Kottayam' },
    'kochi': { city: 'Kochi', district: 'Ernakulam' },
    'cochin': { city: 'Kochi', district: 'Ernakulam' },
    'ernakulam': { city: 'Kochi', district: 'Ernakulam' },
    'aluva': { city: 'Aluva', district: 'Ernakulam' },
    'thrissur': { city: 'Thrissur', district: 'Thrissur' },
    'trichur': { city: 'Thrissur', district: 'Thrissur' },
    'chalakudy': { city: 'Chalakudy', district: 'Thrissur' },
    'guruvayur': { city: 'Guruvayur', district: 'Thrissur' },
    'thiruvananthapuram': { city: 'Thiruvananthapuram', district: 'Thiruvananthapuram' },
    'trivandrum': { city: 'Thiruvananthapuram', district: 'Thiruvananthapuram' },
    'kazhakkoottam': { city: 'Kazhakkoottam', district: 'Thiruvananthapuram' },
    'attingal': { city: 'Attingal', district: 'Thiruvananthapuram' },
    'kozhikode': { city: 'Kozhikode', district: 'Kozhikode' },
    'calicut': { city: 'Kozhikode', district: 'Kozhikode' },
    'kollam': { city: 'Kollam', district: 'Kollam' },
    'quilon': { city: 'Kollam', district: 'Kollam' },
    'alappuzha': { city: 'Alappuzha', district: 'Alappuzha' },
    'alleppey': { city: 'Alappuzha', district: 'Alappuzha' },
    'kannur': { city: 'Kannur', district: 'Kannur' },
    'malappuram': { city: 'Malappuram', district: 'Malappuram' },
    'kasaragod': { city: 'Kasaragod', district: 'Kasaragod' },
    'pathanamthitta': { city: 'Pathanamthitta', district: 'Pathanamthitta' },
    'thodupuzha': { city: 'Thodupuzha', district: 'Idukki' },
    'kalpetta': { city: 'Kalpetta', district: 'Wayanad' }
};

function detectCityAndDistrict(text, lat, lon) {
    if (text && typeof text === 'string') {
        const lower = text.toLowerCase();
        for (const [key, val] of Object.entries(KERALA_CITIES_MAP)) {
            const regex = new RegExp(`\\b${key}\\b`, 'i');
            if (regex.test(lower)) {
                return val;
            }
        }
    }
    const detectedDist = detectDistrict(text, lat, lon);
    if (detectedDist) {
        return { city: detectedDist, district: detectedDist };
    }
    return { city: null, district: null };
}

// GET /api/user/pricing/lookup - Dynamic authoritative lookup for service price breakdown
exports.lookupServicePrice = async (req, res) => {
    try {
        const { city, district, locality, category, category_id, job_type_id, professional_id, latitude, longitude } = req.query;

        let targetCity = city && typeof city === 'string' && city.trim() ? city.trim() : null;
        let targetDistrict = district && typeof district === 'string' && district.trim() ? district.trim() : null;
        let targetLocality = locality && typeof locality === 'string' && locality.trim() ? locality.trim() : null;
        let targetCategory = category && typeof category === 'string' && category.trim() ? category.trim() : null;
        let targetCategoryId = category_id ? Number(category_id) : null;
        let proLat = null;
        let proLon = null;

        // If city was provided without district, resolve from kerala_locations or alias map
        if (targetCity && !targetDistrict) {
            const locRes = await pool.query(
                'SELECT district, city FROM kerala_locations WHERE LOWER(city) = LOWER($1) LIMIT 1',
                [targetCity]
            );
            if (locRes.rows.length > 0) {
                targetCity = locRes.rows[0].city;
                targetDistrict = locRes.rows[0].district;
            } else {
                const found = KERALA_CITIES_MAP[targetCity.toLowerCase()];
                if (found) {
                    targetCity = found.city;
                    targetDistrict = found.district;
                }
            }
        }

        // If professional_id is specified, validate provider coverage and coordinates
        if (professional_id && professional_id !== 'undefined' && professional_id !== 'null') {
            const proRes = await pool.query(
                `SELECT id, full_name, category, city, district, address, work_location_name, work_radius,
                        COALESCE(current_latitude, registered_latitude) AS pro_lat,
                        COALESCE(current_longitude, registered_longitude) AS pro_lon
                 FROM professionals WHERE id = $1`,
                [professional_id]
            );
            if (proRes.rows.length > 0) {
                const pro = proRes.rows[0];
                if (!targetCategory && !targetCategoryId) targetCategory = pro.category;
                proLat = pro.pro_lat;
                proLon = pro.pro_lon;

                // Validate provider service location / coverage
                if (targetCity) {
                    const servesCity = (
                        (pro.city && pro.city.toLowerCase() === targetCity.toLowerCase()) ||
                        (pro.district && targetDistrict && pro.district.toLowerCase() === targetDistrict.toLowerCase()) ||
                        (pro.address && pro.address.toLowerCase().includes(targetCity.toLowerCase()))
                    );
                    if (!servesCity) {
                        return res.status(400).json({
                            available: false,
                            coverageMismatch: true,
                            message: `Selected provider ${pro.full_name} does not serve ${targetCity}.`
                        });
                    }
                } else {
                    targetCity = pro.city || targetCity;
                    targetDistrict = pro.district || targetDistrict;
                }
            }
        }

        const pricingResult = await calculatePrice({
            categoryId: targetCategoryId,
            categoryName: targetCategory,
            jobTypeId: job_type_id ? Number(job_type_id) : null,
            district: targetDistrict,
            city: targetCity,
            locality: targetLocality,
            providerLat: proLat,
            providerLon: proLon,
            serviceLat: latitude,
            serviceLon: longitude
        });

        if (!pricingResult.available) {
            return res.status(200).json({
                available: false,
                city: targetCity,
                district: targetDistrict,
                category: targetCategory,
                message: pricingResult.message || 'Pricing is not configured for this service location. Please contact support.'
            });
        }

        const breakdown = pricingResult.pricing_breakdown;
        res.json({
            available: true,
            id: pricingResult.location?.id,
            district: pricingResult.location?.district,
            city: pricingResult.location?.city,
            locality: pricingResult.location?.locality,
            category_id: pricingResult.category_id,
            category_name: pricingResult.category_name,
            job_type_id: pricingResult.job_type_id,
            price: breakdown.final_labour_price,
            base_price: breakdown.base_price,
            applied_adjustment: breakdown.applied_adjustment,
            exact_override: breakdown.exact_override,
            travel: breakdown.travel,
            estimated_total: breakdown.estimated_total,
            currency: breakdown.currency,
            formatted_price: `₹${breakdown.final_labour_price.toFixed(0)}`,
            pricing_breakdown: breakdown
        });
    } catch (err) {
        console.error('lookupServicePrice error:', err);
        res.status(500).json({ available: false, message: 'Failed to look up service price' });
    }
};

// GET /api/user/pricing/locations - Return verified districts and cities configured
exports.getPricingLocations = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, district, city, locality, location_type, pincode, latitude, longitude, verification_status
            FROM kerala_locations
            WHERE is_active = TRUE
            ORDER BY district ASC, city ASC
        `);
        const districtMap = {};
        result.rows.forEach(r => {
            if (!districtMap[r.district]) districtMap[r.district] = [];
            if (!districtMap[r.district].includes(r.city)) districtMap[r.district].push(r.city);
        });
        res.json({
            locations: result.rows,
            districts: Object.keys(districtMap),
            citiesByDistrict: districtMap,
            total_locations: result.rows.length
        });
    } catch (err) {
        console.error('getPricingLocations error:', err);
        res.status(500).json({ message: 'Failed to fetch pricing locations' });
    }
};


// GET /api/user/district-pricing - list all Kerala district pricing tiers
exports.getDistrictPricing = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT district, markup_percentage, tier_name
            FROM district_pricing_tiers
            ORDER BY markup_percentage ASC, district ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('getDistrictPricing error:', err);
        res.status(500).json({ message: 'Failed to fetch district pricing' });
    }
};

// GET /api/user/categories - list all service categories with dynamic location pricing
exports.getCategories = async (req, res) => {
    try {
        const { lang, city, district } = req.query;
        let selectQuery = `
            SELECT id, name, description, price_estimate, name AS original_name,
                   (SELECT COUNT(*)::int FROM professionals p 
                    WHERE (p.category = categories.name 
                           OR (categories.name = 'Personal & Daily Help' AND p.category = 'Personal Care')
                          ) 
                      AND p.verification_status = 'verified') as professional_count
            FROM categories ORDER BY name ASC
        `;
        if (lang === 'ml') {
            selectQuery = `
                SELECT id, COALESCE(name_ml, name) AS name, COALESCE(description_ml, description) AS description, price_estimate, categories.name AS original_name,
                       (SELECT COUNT(*)::int FROM professionals p 
                        WHERE (p.category = categories.name 
                               OR (categories.name = 'Personal & Daily Help' AND p.category = 'Personal Care')
                              ) 
                          AND p.verification_status = 'verified') as professional_count
                FROM categories ORDER BY name ASC
            `;
        }
        const result = await pool.query(selectQuery);
        let rows = result.rows;

        if (city || district) {
            rows = await Promise.all(rows.map(async (cat) => {
                try {
                    const priceRes = await calculatePrice({
                        categoryName: cat.original_name || cat.name,
                        city: city || null,
                        district: district || null
                    });
                    if (priceRes.available && priceRes.pricing_breakdown?.final_labour_price) {
                        return {
                            ...cat,
                            price_estimate: `From ₹${Math.round(priceRes.pricing_breakdown.final_labour_price)}`
                        };
                    }
                } catch (e) {
                    // keep default estimate
                }
                return cat;
            }));
        }

        res.json(rows);
    } catch (err) {
        console.error('getCategories error:', err);
        res.status(500).json({ message: 'Failed to fetch categories' });
    }
};

exports.getSubcategories = async (req, res) => {
    try {
        const { category, lang, city, district } = req.query;
        let query = 'SELECT id, category_id, category_name, name, image_url, price_estimate FROM subcategories';
        if (lang === 'ml') {
            query = 'SELECT id, category_id, COALESCE(category_name_ml, category_name) AS category_name, COALESCE(name_ml, name) AS name, image_url, price_estimate FROM subcategories';
        }
        const params = [];
        if (category) {
            query += ' WHERE LOWER(category_name) = LOWER($1)';
            params.push(category);
        }
        query += ' ORDER BY category_name ASC, id ASC';
        const result = await pool.query(query, params);
        let rows = result.rows;

        if (city || district) {
            rows = await Promise.all(rows.map(async (sub) => {
                try {
                    const priceRes = await calculatePrice({
                        categoryName: sub.category_name,
                        jobTypeId: sub.id,
                        city: city || null,
                        district: district || null
                    });
                    if (priceRes.available && priceRes.pricing_breakdown?.final_labour_price) {
                        return {
                            ...sub,
                            price_estimate: `From ₹${Math.round(priceRes.pricing_breakdown.final_labour_price)}`
                        };
                    }
                } catch (e) {
                    // keep default estimate
                }
                return sub;
            }));
        }

        res.json(rows);
    } catch (err) {
        console.error('getSubcategories error:', err);
        res.status(500).json({ message: 'Failed to fetch subcategories' });
    }
};

// GET /api/user/professionals?category=Plumbing&district=Ernakulam - list verified professionals from destination area
exports.getProfessionals = async (req, res) => {
    try {
        const { category, latitude, longitude, district, city } = req.query;
        const params = [];
        let where = "WHERE p.verification_status = 'verified'";
        if (category) {
            const aliases = CATEGORY_ALIASES[category] || [category];
            params.push(aliases);
            where += ` AND p.category = ANY($${params.length}::varchar[])`;
        }

        const normalizedDist = district ? normalizeDistrict(district) || district.trim() : null;
        if (normalizedDist) {
            params.push(`%${normalizedDist}%`);
            where += ` AND (p.district ILIKE $${params.length} OR p.city ILIKE $${params.length} OR p.address ILIKE $${params.length})`;
        }

        const query = `
            SELECT p.id, p.full_name, p.category, p.sub_category, p.experience_years, p.bio,
                   p.district, p.city, p.state, p.transport_mode, p.verified_at,
                   p.registered_latitude, p.registered_longitude,
                   p.current_latitude, p.current_longitude,
                   p.work_latitude, p.work_longitude, p.work_radius, p.work_location_name,
                   COALESCE(p.current_latitude, p.registered_latitude) AS effective_latitude,
                   COALESCE(p.current_longitude, p.registered_longitude) AS effective_longitude,
                   CASE WHEN p.profile_photo IS NOT NULL
                        THEN '/uploads/' || p.profile_photo
                        ELSE NULL END AS profile_photo,
                   (SELECT COUNT(*)
                      FROM service_offers so
                      JOIN service_requests sr ON sr.id = so.request_id
                     WHERE so.professional_id = p.id AND sr.status = 'completed') AS completed_requests,
                   (SELECT ROUND(AVG(r.rating)::numeric, 1)
                      FROM professional_reviews r
                     WHERE r.professional_id = p.id) AS avg_rating,
                   (SELECT COUNT(*)
                      FROM professional_reviews r
                     WHERE r.professional_id = p.id) AS review_count
            FROM professionals p
            ${where}
            ORDER BY p.experience_years DESC, p.full_name ASC
        `;
        let result = await pool.query(query, params);

        // If a specific district filter was requested but returned 0 results, fallback to all verified in category
        if (result.rows.length === 0 && normalizedDist && category) {
            const fallbackParams = [CATEGORY_ALIASES[category] || [category]];
            const fallbackResult = await pool.query(`
                SELECT p.id, p.full_name, p.category, p.sub_category, p.experience_years, p.bio,
                       p.district, p.city, p.state, p.transport_mode, p.verified_at,
                       p.registered_latitude, p.registered_longitude,
                       p.current_latitude, p.current_longitude,
                       p.work_latitude, p.work_longitude, p.work_radius, p.work_location_name,
                       COALESCE(p.current_latitude, p.registered_latitude) AS effective_latitude,
                       COALESCE(p.current_longitude, p.registered_longitude) AS effective_longitude,
                       CASE WHEN p.profile_photo IS NOT NULL
                            THEN '/uploads/' || p.profile_photo
                            ELSE NULL END AS profile_photo,
                       (SELECT COUNT(*)
                          FROM service_offers so
                          JOIN service_requests sr ON sr.id = so.request_id
                         WHERE so.professional_id = p.id AND sr.status = 'completed') AS completed_requests,
                       (SELECT ROUND(AVG(r.rating)::numeric, 1)
                          FROM professional_reviews r
                         WHERE r.professional_id = p.id) AS avg_rating,
                       (SELECT COUNT(*)
                          FROM professional_reviews r
                         WHERE r.professional_id = p.id) AS review_count
                FROM professionals p
                WHERE p.verification_status = 'verified' AND p.category = ANY($1::varchar[])
                ORDER BY p.experience_years DESC, p.full_name ASC
            `, fallbackParams);
            result = fallbackResult;
        }

        const userLat = Number(latitude);
        const userLon = Number(longitude);
        const hasCoords = Number.isFinite(userLat) && Number.isFinite(userLon);

        const mapped = result.rows.map(p => {
            let distance = null;
            const proLat = Number(p.work_latitude || p.effective_latitude);
            const proLon = Number(p.work_longitude || p.effective_longitude);
            if (hasCoords && Number.isFinite(proLat) && Number.isFinite(proLon)) {
                const dLat = (proLat - userLat) * Math.PI / 180;
                const dLon = (proLon - userLon) * Math.PI / 180;
                const lat1 = userLat * Math.PI / 180;
                const lat2 = proLat * Math.PI / 180;
                const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
                distance = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
            }
            return {
                ...p,
                distance_from_user: distance
            };
        });

        // Compute accurate local wage for each professional based on their location or requested city/district
        const enriched = await Promise.all(mapped.map(async (p) => {
            const targetCity = city || p.city;
            const targetDist = district || p.district;
            let wage = 200 + Math.min(Number(p.experience_years) || 0, 12) * 25;
            let formattedWage = `₹${wage}`;

            if (p.category && (targetCity || targetDist)) {
                try {
                    const priceRes = await calculatePrice({
                        categoryName: p.category,
                        city: targetCity,
                        district: targetDist
                    });
                    if (priceRes.available && priceRes.pricing_breakdown?.final_labour_price) {
                        wage = priceRes.pricing_breakdown.final_labour_price;
                        formattedWage = `₹${Math.round(wage)}`;
                    }
                } catch (calcErr) {
                    // Fall back to base wage
                }
            }

            return {
                ...p,
                hourly_rate: wage,
                formatted_hourly_rate: formattedWage
            };
        }));

        if (hasCoords) {
            enriched.sort((a, b) => {
                if (a.distance_from_user != null && b.distance_from_user != null) {
                    return a.distance_from_user - b.distance_from_user;
                }
                return (b.experience_years || 0) - (a.experience_years || 0);
            });
        }

        res.json(enriched);
    } catch (err) {
        console.error('getProfessionals error:', err);
        res.status(500).json({ message: 'Failed to fetch professionals' });
    }
};

// POST /api/user/requests - create a new service request
exports.createRequest = async (req, res) => {
    try {
        const {
            title,
            description,
            requested_at,
            location,
            district: rawDistrict,
            pricing_markup_percentage: rawMarkup,
            latitude,
            longitude,
            professional_id,
            category,
            payment_status,
            payment_method,
            transaction_id,
            wage
        } = req.body;
        const photos = (req.files?.photos || []).map(file => `/uploads/${file.filename}`);
        const video = req.files?.video?.[0] ? `/uploads/${req.files.video[0].filename}` : null;
        const voice = req.files?.voice?.[0] ? `/uploads/${req.files.voice[0].filename}` : null;
        const customerId = req.user.id;

        if (!title || !location || !category || !requested_at) {
            return res.status(400).json({ message: 'Title, location, category, and expected professional arrival time are required' });
        }
        if (!Number.isFinite(new Date(requested_at).getTime()) || new Date(requested_at).getTime() <= Date.now()) {
            return res.status(400).json({ message: 'Expected professional arrival time must be in the future' });
        }

        // Resolve destination city & district from input, provider, or reverse-geocoding
        const rawCity = (req.body.city || req.body.service_city || '').trim();
        const detected = detectCityAndDistrict(location, latitude, longitude);
        let destinationCity = rawCity || (detected ? detected.city : null);
        let destinationDistrict = rawDistrict
            ? (normalizeDistrict(rawDistrict) || rawDistrict.trim())
            : (detected ? detected.district : detectDistrict(location, latitude, longitude));

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await client.query('ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)');
            await client.query('ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100)');
            await client.query('ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS district VARCHAR(100)');
            await client.query('ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS service_city VARCHAR(100)');
            await client.query('ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS pricing_source VARCHAR(50) DEFAULT \'city_category_pricing\'');
            await client.query('ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS base_price NUMERIC');
            await client.query('ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS pricing_markup_percentage NUMERIC DEFAULT 0');

            const categoryAliases = CATEGORY_ALIASES[category] || [category];

            // If a specific professional was selected, validate provider coverage & service location
            let selectedProfessional = null;
            if (professional_id && professional_id !== 'undefined' && professional_id !== 'null') {
                const proResult = await client.query('SELECT * FROM professionals WHERE id = $1', [professional_id]);
                if (proResult.rows.length > 0) {
                    selectedProfessional = proResult.rows[0];

                    // Provider coverage validation:
                    // If a specific service city was explicitly selected by the customer
                    if (rawCity) {
                        const servesCity = (
                            (selectedProfessional.city && selectedProfessional.city.toLowerCase() === rawCity.toLowerCase()) ||
                            (selectedProfessional.district && destinationDistrict && selectedProfessional.district.toLowerCase() === destinationDistrict.toLowerCase()) ||
                            (selectedProfessional.address && selectedProfessional.address.toLowerCase().includes(rawCity.toLowerCase()))
                        );
                        if (!servesCity) {
                            await client.query('ROLLBACK');
                            return res.status(400).json({
                                message: `The selected professional (${selectedProfessional.full_name}) does not serve ${rawCity}. Please select a supported service location.`
                            });
                        }
                    } else {
                        // Business rule: use the selected provider's service city & district
                        destinationCity = selectedProfessional.city || destinationCity;
                        destinationDistrict = selectedProfessional.district || destinationDistrict;
                    }
                }
            }

            // AUTHORITATIVE BACKEND PRICING CALCULATION
            // Uses calculatePrice to apply base rate, location adjustment, exact overrides, and separate travel charges
            const pricingResult = await calculatePrice({
                categoryName: category,
                district: destinationDistrict,
                city: destinationCity,
                locality: req.body.locality || null,
                providerLat: selectedProfessional ? (selectedProfessional.current_latitude || selectedProfessional.registered_latitude) : null,
                providerLon: selectedProfessional ? (selectedProfessional.current_longitude || selectedProfessional.registered_longitude) : null,
                serviceLat: latitude,
                serviceLon: longitude
            });

            if (!pricingResult.available) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    message: pricingResult.message || 'Pricing is not configured for this service location. Please contact support.'
                });
            }

            const pb = pricingResult.pricing_breakdown;
            const finalLabourWage = pb.final_labour_price;
            const travelFee = pb.travel?.travel_charge || 0;
            const finalAmount = pb.estimated_total;
            const basePrice = pb.base_price;

            // Immutable pricing snapshot saved with historical booking record
            const pricingSnapshot = {
                service_location: {
                    city: pricingResult.location?.city || destinationCity,
                    district: pricingResult.location?.district || destinationDistrict,
                    locality: pricingResult.location?.locality || null,
                    location_type: pricingResult.location?.location_type || 'town'
                },
                category: category,
                category_id: pricingResult.category_id,
                base_price: basePrice,
                applied_adjustment: pb.applied_adjustment,
                exact_override: pb.exact_override,
                labour_price: finalLabourWage,
                travel_charge: travelFee,
                travel_details: pb.travel,
                final_amount: finalAmount,
                currency: pb.currency,
                confirmed_at: new Date().toISOString()
            };

            // Fetch online verified professionals for category & destination area
            const professionals = await client.query(
                `SELECT p.id, p.full_name, p.district, p.city, p.address,
                        p.registered_latitude, p.registered_longitude,
                        p.current_latitude, p.current_longitude,
                        COALESCE(p.current_latitude, p.registered_latitude) AS effective_latitude,
                        COALESCE(p.current_longitude, p.registered_longitude) AS effective_longitude,
                        p.is_online
                 FROM professionals p
                 WHERE p.category = ANY($1::varchar[]) AND p.verification_status = 'verified'
                     AND COALESCE(p.is_online, false) = true
                     AND ($2::bigint IS NULL OR p.id = $2)
                     AND NOT EXISTS (
                             SELECT 1
                             FROM service_offers active_offer
                             JOIN service_requests active_request ON active_request.id = active_offer.request_id
                             WHERE active_offer.professional_id = p.id
                                 AND active_offer.status = 'accepted'
                                 AND active_request.status IN ('accepted', 'in_progress')
                     )`,
                [categoryAliases, professional_id && professional_id !== 'undefined' && professional_id !== 'null' ? professional_id : null]
            );

            const userLatitude = Number(latitude);
            const userLongitude = Number(longitude);
            const hasCoords = Number.isFinite(userLatitude) && Number.isFinite(userLongitude);

            let nearbyProfessionals = [];
            if (professional_id && professional_id !== 'undefined' && professional_id !== 'null') {
                nearbyProfessionals = professionals.rows;
            } else {
                // 1. First priority: match professionals nearest to destination coordinates (within 35 km)
                if (hasCoords) {
                    const withDist = professionals.rows.map(professional => {
                        const proLat = Number(professional.effective_latitude);
                        const proLon = Number(professional.effective_longitude);
                        if (Number.isFinite(proLat) && Number.isFinite(proLon)) {
                            const latitudeDelta = (proLat - userLatitude) * Math.PI / 180;
                            const longitudeDelta = (proLon - userLongitude) * Math.PI / 180;
                            const latitude1 = userLatitude * Math.PI / 180;
                            const latitude2 = proLat * Math.PI / 180;
                            const haversine = Math.sin(latitudeDelta / 2) ** 2
                                + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2;
                            const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
                            return { ...professional, distanceKm };
                        }
                        return { ...professional, distanceKm: null };
                    });

                    const withinRange = withDist.filter(p => p.distanceKm !== null && p.distanceKm <= 35);
                    if (withinRange.length > 0) {
                        nearbyProfessionals = withinRange;
                    }
                }

                // 2. Second priority: match professionals in the destination district or city
                if (!nearbyProfessionals.length && (destinationCity || destinationDistrict)) {
                    const targetDist = (destinationDistrict || '').toLowerCase();
                    const targetCityLower = (destinationCity || '').toLowerCase();
                    const districtMatches = professionals.rows.filter(p => {
                        const pDist = (p.district || '').toLowerCase();
                        const pCity = (p.city || '').toLowerCase();
                        const pAddr = (p.address || '').toLowerCase();
                        return (targetCityLower && (pCity.includes(targetCityLower) || pAddr.includes(targetCityLower))) ||
                               (targetDist && (pDist.includes(targetDist) || pAddr.includes(targetDist)));
                    });
                    if (districtMatches.length > 0) {
                        nearbyProfessionals = districtMatches;
                    }
                }

                // 3. Fallback: all online verified pros in category
                if (!nearbyProfessionals.length) {
                    nearbyProfessionals = professionals.rows;
                }
            }

            if (!nearbyProfessionals.length) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    message: destinationCity
                        ? `No available online professionals found in ${destinationCity} at the moment. Please try again shortly.`
                        : 'No available online professionals were found in your destination area at the moment. Please try again shortly.'
                });
            }

            const result = await client.query(
                `INSERT INTO service_requests (
                    customer_id, title, description, requested_at, location, latitude, longitude,
                    photo_urls, video_url, voice_url, status, payment_status, payment_method, transaction_id, 
                    wage, labour_price, travel_fee, base_price, final_amount, district, service_city, 
                    pricing_source, pricing_markup_percentage, pricing_snapshot
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'location_pricing_engine', $21, $22) RETURNING *`,
                [
                    customerId,
                    title,
                    description || null,
                    requested_at,
                    location,
                    Number.isFinite(Number(latitude)) ? latitude : null,
                    Number.isFinite(Number(longitude)) ? longitude : null,
                    photos,
                    video,
                    voice,
                    payment_status || 'pending',
                    payment_method || 'cash',
                    transaction_id || null,
                    finalLabourWage,
                    finalLabourWage,
                    travelFee,
                    basePrice,
                    finalAmount,
                    pricingResult.location?.district || destinationDistrict,
                    pricingResult.location?.city || destinationCity,
                    pb.applied_adjustment?.value || 0,
                    JSON.stringify(pricingSnapshot)
                ]
            );
            const request = result.rows[0];
            for (const professional of nearbyProfessionals) {
                await client.query(
                    `INSERT INTO service_offers (request_id, professional_id, status)
                     VALUES ($1, $2, 'pending')`,
                    [request.id, professional.id]
                );
            }
            await client.query('COMMIT');

            nearbyProfessionals.forEach(professional => notifyPro(Number(professional.id), 'new_service_request', {
                request_id: request.id,
                customer_name: req.user.name || 'A customer',
                title: request.title,
                category: request.category || category,
                requested_at: request.requested_at,
                location: request.location,
                district: request.district,
                timestamp: new Date().toISOString()
            }));
            broadcast('service_request_created', {
                id: request.id,
                professional_count: nearbyProfessionals.length,
                status: request.status,
                category: request.category || category,
                requested_at: request.requested_at,
                location: request.location,
                district: request.district,
                pricing_markup_percentage: request.pricing_markup_percentage,
                timestamp: new Date().toISOString()
            });

            res.status(201).json({ message: `Request sent to ${nearbyProfessionals.length} nearby professionals`, request });

            // Check if reminder is due for this booking
            checkAndSend1HourReminders().catch(e => console.error('Reminder check error on create:', e.message));
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('createRequest error:', err);
        res.status(500).json({ message: 'Failed to create request', error: err.message });
    }
};

// GET /api/user/requests - get all requests for the logged in user
exports.getMyRequests = async (req, res) => {
    try {
        const customerId = req.user.id;
        const result = await pool.query(
                    `SELECT sr.id, sr.title, sr.description, sr.requested_at, sr.location, sr.district, sr.pricing_markup_percentage, sr.latitude, sr.longitude, sr.photo_urls, sr.video_url, sr.voice_url, sr.status, sr.journey_status, sr.journey_updated_at, sr.created_at, sr.otp, sr.is_otp_verified, sr.otp_verified_at, sr.wage, sr.wage_description, sr.payment_status,
                        offer_summary.offer_count,
                        offer_summary.pending_offer_count,
                    p.full_name AS professional_name,
                    p.category AS professional_category,
                    p.profile_photo AS professional_profile_photo,
                    prof_user.phone AS professional_phone,
                    p.current_latitude AS professional_latitude,
                    p.current_longitude AS professional_longitude,
                    (SELECT ROUND(AVG(pr.rating)::numeric, 1) FROM professional_reviews pr WHERE pr.professional_id = p.id) AS professional_avg_rating,
                    (SELECT COUNT(*) FROM professional_reviews pr WHERE pr.professional_id = p.id) AS professional_review_count,
                    review.id AS review_id,
                    review.rating AS review_rating,
                    review.comment AS review_comment
                 FROM service_requests sr
                      LEFT JOIN LATERAL (
                          SELECT COUNT(*)::int AS offer_count,
                                    COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_offer_count
                          FROM service_offers
                          WHERE request_id = sr.id
                      ) offer_summary ON true
                      LEFT JOIN LATERAL (
                          SELECT professional_id
                          FROM service_offers
                          WHERE request_id = sr.id
                            AND (status = 'accepted' OR offer_summary.offer_count = 1)
                          ORDER BY CASE WHEN status = 'accepted' THEN 0 ELSE 1 END, id
                          LIMIT 1
                      ) selected_offer ON true
                     LEFT JOIN professionals p ON p.id = selected_offer.professional_id
                     LEFT JOIN users prof_user ON prof_user.id = p.user_id
                     LEFT JOIN LATERAL (
                         SELECT id, rating, comment
                         FROM professional_reviews
                         WHERE request_id = sr.id AND customer_id = $1
                         LIMIT 1
                     ) review ON true
             WHERE sr.customer_id = $1
                 ORDER BY sr.created_at DESC`,
            [customerId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('getMyRequests error:', err);
        res.status(500).json({ message: 'Failed to fetch your requests' });
    }
};

// POST /api/user/requests/:id/cancel - cancel a service booking before OTP verification
exports.cancelRequest = async (req, res) => {
    const customerId = req.user.id;
    const requestId = Number(req.params.id);

    if (!Number.isInteger(requestId)) {
        return res.status(400).json({ message: 'A valid request ID is required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Fetch request and check customer ownership
        const requestRes = await client.query(
            `SELECT sr.id, sr.customer_id, sr.title, sr.status, sr.journey_status, sr.is_otp_verified
             FROM service_requests sr
             WHERE sr.id = $1 AND sr.customer_id = $2
             FOR UPDATE`,
            [requestId, customerId]
        );

        if (!requestRes.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Service booking not found' });
        }

        const request = requestRes.rows[0];

        if (request.status === 'cancelled') {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'This service booking is already cancelled' });
        }

        if (request.status === 'completed') {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Completed services cannot be cancelled' });
        }

        // Check if OTP has already been verified before starting the service
        const isOtpVerified = request.is_otp_verified === true ||
            ['arrived', 'working', 'awaiting_payment', 'completed'].includes(request.journey_status);

        if (isOtpVerified) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                message: 'Cannot cancel service after OTP has been verified and job has started'
            });
        }

        // Cancel the service request
        const updateRes = await client.query(
            `UPDATE service_requests
             SET status = 'cancelled',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [requestId]
        );

        // Cancel any pending or accepted offers associated with this request
        const offersRes = await client.query(
            `UPDATE service_offers
             SET status = 'rejected'
             WHERE request_id = $1 AND status IN ('pending', 'accepted')
             RETURNING professional_id`,
            [requestId]
        );

        await client.query('COMMIT');

        // Notify assigned or pending professionals that this request was cancelled
        offersRes.rows.forEach(({ professional_id }) => {
            if (professional_id) {
                notifyPro(Number(professional_id), 'request_cancelled', {
                    requestId,
                    message: `Booking #${requestId} has been cancelled by the customer.`
                });
            }
        });

        // Notify customer via SSE
        notifyCustomer(customerId, 'requestUpdate', {
            requestId,
            newStatus: 'cancelled',
            journeyStatus: request.journey_status,
            message: 'Your service booking has been cancelled.'
        });

        // Broadcast to admin dashboard
        broadcast('service_request_updated', {
            id: requestId,
            status: 'cancelled',
            timestamp: new Date().toISOString()
        });

        res.json({
            message: 'Service booking cancelled successfully',
            request: updateRes.rows[0]
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('cancelRequest error:', err);
        res.status(500).json({ message: 'Failed to cancel service booking' });
    } finally {
        client.release();
    }
};

// POST /api/user/requests/:id/review - rate and review a completed service (1-5 stars)
exports.createReview = async (req, res) => {
    const customerId = req.user.id;
    const requestId = Number(req.params.id);
    const rating = Number(req.body.rating);
    const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : null;

    if (!Number.isInteger(requestId) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'A rating from 1 to 5 stars is required (1 = poor, 5 = excellent)' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO professional_reviews (request_id, customer_id, professional_id, rating, comment, created_at)
             SELECT sr.id, sr.customer_id, COALESCE(accepted_offer.professional_id, any_offer.professional_id), $3, $4, CURRENT_TIMESTAMP
             FROM service_requests sr
             LEFT JOIN LATERAL (
                 SELECT professional_id
                 FROM service_offers
                 WHERE request_id = sr.id AND status = 'accepted'
                 LIMIT 1
             ) accepted_offer ON true
             LEFT JOIN LATERAL (
                 SELECT professional_id
                 FROM service_offers
                 WHERE request_id = sr.id
                 ORDER BY id DESC
                 LIMIT 1
             ) any_offer ON true
             WHERE sr.id = $1 AND sr.customer_id = $2
               AND (sr.status = 'completed' OR sr.journey_status = 'completed')
             ON CONFLICT (request_id) DO UPDATE
             SET rating = EXCLUDED.rating,
                 comment = EXCLUDED.comment,
                 created_at = CURRENT_TIMESTAMP
             RETURNING id, request_id, professional_id, rating, comment, created_at`,
            [requestId, customerId, rating, comment || null]
        );

        if (!result.rows.length) {
            return res.status(400).json({ message: 'This service is not eligible for review. It must be completed first.' });
        }

        const review = result.rows[0];

        broadcast('review_submitted', {
            id: review.id,
            request_id: requestId,
            professional_id: review.professional_id,
            rating: review.rating,
            timestamp: new Date().toISOString()
        });
        res.status(201).json({ message: 'Review submitted successfully', review });
    } catch (err) {
        console.error('createReview error:', err);
        res.status(500).json({ message: 'Failed to submit review' });
    }
};

// GET /api/user/reviews?category=Plumbing - reviews for professionals in a category
exports.getCategoryReviews = async (req, res) => {
    try {
        const { category } = req.query;
        if (!category) {
            return res.status(400).json({ message: 'Category is required' });
        }

        const [reviewsResult, breakdownResult, summaryResult] = await Promise.all([
            pool.query(
                `SELECT r.rating, r.comment, r.created_at,
                        u.name AS customer_name,
                        p.full_name AS professional_name
                 FROM professional_reviews r
                 JOIN professionals p ON p.id = r.professional_id
                 JOIN users u ON u.id = r.customer_id
                 WHERE p.category = $1 AND p.verification_status = 'verified'
                 ORDER BY r.created_at DESC
                 LIMIT 10`,
                [category]
            ),
            pool.query(
                `SELECT r.rating, COUNT(*)::int AS count
                 FROM professional_reviews r
                 JOIN professionals p ON p.id = r.professional_id
                 WHERE p.category = $1 AND p.verification_status = 'verified'
                 GROUP BY r.rating
                 ORDER BY r.rating DESC`,
                [category]
            ),
            pool.query(
                `SELECT ROUND(AVG(r.rating)::numeric, 1) AS avg_rating,
                        COUNT(*)::int AS total_reviews
                 FROM professional_reviews r
                 JOIN professionals p ON p.id = r.professional_id
                 WHERE p.category = $1 AND p.verification_status = 'verified'`,
                [category]
            ),
        ]);

        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        breakdownResult.rows.forEach(row => {
            breakdown[row.rating] = row.count;
        });
        const total = Object.values(breakdown).reduce((sum, n) => sum + n, 0);
        const percentages = {};
        [5, 4, 3, 2, 1].forEach(star => {
            percentages[star] = total > 0 ? Math.round((breakdown[star] / total) * 100) : 0;
        });

        res.json({
            reviews: reviewsResult.rows,
            avg_rating: summaryResult.rows[0]?.avg_rating || null,
            total_reviews: summaryResult.rows[0]?.total_reviews || 0,
            breakdown,
            percentages,
        });
    } catch (err) {
        console.error('getCategoryReviews error:', err);
        res.status(500).json({ message: 'Failed to fetch reviews' });
    }
};

// GET /api/user/notifications/stream - SSE connection for real-time customer updates
exports.streamNotifications = (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const customerId = req.user.id;
    addCustomerClient(customerId, res);

    const keepAlive = setInterval(() => {
        try {
            res.write(': keepalive\n\n');
        } catch {
            clearInterval(keepAlive);
        }
    }, 15000);

    req.on('close', () => {
        clearInterval(keepAlive);
        removeCustomerClient(customerId, res);
    });
};

// POST /api/user/requests/:id/confirm-payment
exports.confirmPayment = async (req, res) => {
    const customerId = req.user.id;
    const requestId = Number(req.params.id);

    if (!Number.isInteger(requestId)) {
        return res.status(400).json({ message: 'Invalid request ID' });
    }

    try {
        const result = await pool.query(
            `UPDATE service_requests
             SET payment_status = 'paid',
                 status = 'completed',
                 journey_status = 'completed',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND customer_id = $2 AND payment_status = 'awaiting_payment'
             RETURNING *`,
            [requestId, customerId]
        );

        if (!result.rows.length) {
            return res.status(404).json({ message: 'Request not found or payment already confirmed' });
        }

        const { broadcast: broadcastSse } = require('../utils/sseClients');
        broadcastSse('payment_confirmed', {
            id: requestId,
            customer_id: customerId,
            payment_status: 'paid',
            timestamp: new Date().toISOString()
        });

        res.json({ message: 'Payment confirmed successfully', request: result.rows[0] });
    } catch (err) {
        console.error('confirmPayment error:', err);
        res.status(500).json({ message: 'Failed to confirm payment' });
    }
};

// GET /api/user/notifications - Real-time notification list for customer
exports.getNotifications = async (req, res) => {
    try {
        const customerId = req.user.id;
        const result = await pool.query(
            `SELECT sr.id as request_id, sr.title, sr.status, sr.journey_status, sr.created_at, sr.updated_at, sr.otp,
                    p.full_name as professional_name, prof_user.phone as professional_phone, p.category as professional_category, p.profile_photo as professional_photo,
                    COALESCE(n.is_read, false) as is_read_completed,
                    COALESCE(na.is_read, false) as is_read_accepted
             FROM service_requests sr
             LEFT JOIN LATERAL (
                 SELECT professional_id FROM service_offers WHERE request_id = sr.id AND status = 'accepted' LIMIT 1
             ) so ON true
             LEFT JOIN professionals p ON p.id = so.professional_id
             LEFT JOIN users prof_user ON prof_user.id = p.user_id
             LEFT JOIN notifications n ON n.user_id = sr.customer_id AND n.request_id = sr.id AND n.type = 'task_completed'
             LEFT JOIN notifications na ON na.user_id = sr.customer_id AND na.request_id = sr.id AND na.type = 'request_accepted'
             WHERE sr.customer_id = $1
             ORDER BY sr.updated_at DESC
             LIMIT 30`,
            [customerId]
        );

        const notifications = [];
        for (const row of result.rows) {
            if (row.status === 'completed' || row.journey_status === 'completed') {
                notifications.push({
                    id: `notif_${row.request_id}_completed`,
                    type: 'task_completed',
                    request_id: row.request_id,
                    title: 'Task Completed! 🎉',
                    message: `${row.professional_name || 'Specialist'} has completed "${row.title}". Tap to view invoice & rate your experience.`,
                    timestamp: row.updated_at || row.created_at,
                    is_read: Boolean(row.is_read_completed),
                    metadata: {
                        requestId: row.request_id,
                        professionalName: row.professional_name,
                        serviceTitle: row.title,
                    }
                });
            } else if (['accepted', 'in_progress'].includes(row.status)) {
                notifications.push({
                    id: `notif_${row.request_id}_accepted`,
                    type: 'request_accepted',
                    request_id: row.request_id,
                    title: 'Service Accepted! 🛠️',
                    message: `${row.professional_name || 'A specialist'} has accepted your "${row.title}" request! Arrival OTP: ${row.otp || '****'}`,
                    timestamp: row.updated_at || row.created_at,
                    is_read: Boolean(row.is_read_accepted),
                    metadata: {
                        requestId: row.request_id,
                        professionalName: row.professional_name,
                        professionalPhone: row.professional_phone,
                        professionalCategory: row.professional_category,
                        serviceTitle: row.title,
                        otp: row.otp
                    }
                });
            } else if (row.status === 'pending') {
                notifications.push({
                    id: `notif_${row.request_id}_pending`,
                    type: 'booking_created',
                    request_id: row.request_id,
                    title: 'Booking Placed 📋',
                    message: `Your booking for "${row.title}" is being matched with certified specialists nearby.`,
                    timestamp: row.created_at,
                    is_read: true,
                    metadata: {
                        requestId: row.request_id,
                        serviceTitle: row.title
                    }
                });
            }
        }

        // Fetch stored 1-hour reminder notifications from the database
        const dbReminders = await pool.query(
            `SELECT id, request_id, type, title, message, is_read, created_at, metadata
             FROM notifications
             WHERE user_id = $1 AND type = 'service_reminder_customer'
             ORDER BY created_at DESC
             LIMIT 30`,
            [customerId]
        );

        for (const rem of dbReminders.rows) {
            notifications.push({
                id: `notif_${rem.id}`,
                db_id: rem.id,
                type: 'service_reminder_customer',
                request_id: rem.request_id,
                title: rem.title,
                message: rem.message,
                timestamp: rem.created_at,
                is_read: Boolean(rem.is_read),
                metadata: rem.metadata || {}
            });
        }

        // Sort notifications with newest first
        notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json({
            notifications,
            unreadCount: notifications.filter(n => !n.is_read).length
        });
    } catch (err) {
        console.error('getNotifications error:', err);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
};

exports.markNotificationRead = async (req, res) => {
    try {
        const customerId = req.user.id;
        const rawId = String(req.params.id || '');

        let requestId = null;
        let notifType = null;

        const match = rawId.match(/^notif_(\d+)_(completed|accepted|.*)$/);
        if (match) {
            requestId = parseInt(match[1], 10);
            notifType = match[2] === 'completed' ? 'task_completed' : (match[2] === 'accepted' ? 'request_accepted' : match[2]);
        } else if (/^notif_(\d+)$/.test(rawId)) {
            const notifDbId = parseInt(rawId.replace('notif_', ''), 10);
            await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [notifDbId, customerId]);
            return res.json({ success: true });
        } else if (/^\d+$/.test(rawId)) {
            const notifRow = await pool.query('SELECT request_id, type FROM notifications WHERE id = $1', [parseInt(rawId, 10)]);
            if (notifRow.rows[0]) {
                requestId = notifRow.rows[0].request_id;
                notifType = notifRow.rows[0].type;
            }
        }

        if (requestId && notifType) {
            await pool.query(
                `INSERT INTO notifications (user_id, request_id, type, title, message, is_read, created_at)
                 VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP)
                 ON CONFLICT (user_id, request_id, type)
                 DO UPDATE SET is_read = true`,
                [
                    customerId,
                    requestId,
                    notifType,
                    notifType === 'task_completed' ? 'Task Completed! 🎉' : 'Service Accepted!',
                    `Notification for request #${requestId}`
                ]
            );
        } else if (/^\d+$/.test(rawId)) {
            await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [parseInt(rawId, 10), customerId]);
        }

        res.json({ success: true });
    } catch (err) {
        console.error('markNotificationRead error:', err);
        res.status(500).json({ message: 'Failed to mark notification as read' });
    }
};

// ── Phone-wide notification sync (POST /api/user/phone-notifications) ──

exports.syncPhoneNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { events } = req.body;

        if (!Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ message: 'No events provided' });
        }

        // Cap batch size to prevent abuse
        const batch = events.slice(0, 100);
        let synced = 0;
        let duplicates = 0;

        for (const ev of batch) {
            if (!ev.eventId || !ev.packageName) continue;
            try {
                await pool.query(
                    `INSERT INTO phone_notification_events
                        (user_id, event_id, notification_key, package_name, app_name, title, text, timestamp, category, event_type, sync_status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'synced')
                     ON CONFLICT (user_id, event_id) DO NOTHING`,
                    [
                        userId,
                        ev.eventId,
                        ev.notificationKey || null,
                        ev.packageName,
                        ev.appName || null,
                        ev.title || null,
                        ev.text || null,
                        ev.timestamp || null,
                        ev.category || null,
                        ev.eventType || 'posted'
                    ]
                );
                synced++;
            } catch (insertErr) {
                if (insertErr.code === '23505') {
                    duplicates++;
                } else {
                    console.error('Phone notif insert error:', insertErr.message);
                }
            }
        }

        res.json({ success: true, synced, duplicates, total: batch.length });
    } catch (err) {
        console.error('syncPhoneNotifications error:', err);
        res.status(500).json({ message: 'Failed to sync phone notifications' });
    }
};

// ── Get synced phone notifications (GET /api/user/phone-notifications) ──

exports.getPhoneNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const offset = parseInt(req.query.offset) || 0;

        const result = await pool.query(
            `SELECT id, event_id, notification_key, package_name, app_name,
                    title, text, timestamp, category, event_type, sync_status, created_at
             FROM phone_notification_events
             WHERE user_id = $1
             ORDER BY timestamp DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        const countResult = await pool.query(
            'SELECT COUNT(*)::int as total FROM phone_notification_events WHERE user_id = $1',
            [userId]
        );

        res.json({
            notifications: result.rows,
            total: countResult.rows[0]?.total || 0,
            limit,
            offset
        });
    } catch (err) {
        console.error('getPhoneNotifications error:', err);
        res.status(500).json({ message: 'Failed to fetch phone notifications' });
    }
};

// ── Delete phone notification data (DELETE /api/user/phone-notifications) ──

exports.deletePhoneNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        await pool.query('DELETE FROM phone_notification_events WHERE user_id = $1', [userId]);
        res.json({ success: true, message: 'Phone notification data cleared' });
    } catch (err) {
        console.error('deletePhoneNotifications error:', err);
        res.status(500).json({ message: 'Failed to delete phone notifications' });
    }
};

