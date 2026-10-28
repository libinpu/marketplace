const pool = require("../config/database");
const { broadcast } = require("../utils/sseClients");
const { calculatePrice, calculateTravelCharge } = require("../services/pricingService");
const { 
    getAdjustmentRecommendation, 
    getBenchmarkCoverageDiagnostics, 
    getBenchmarkConfig, 
    updateBenchmarkConfig 
} = require("../services/wageRecommendationService");


const getDashboard = async (req, res) => {
    try {
        const users = await pool.query(
            `SELECT COUNT(*) FROM users u
             WHERE NOT EXISTS (SELECT 1 FROM professionals p WHERE p.user_id = u.id)`
        );

        const professionals = await pool.query(
            "SELECT COUNT(*) FROM professionals WHERE verification_status = 'verified'"
        );

        const pendingVerification = await pool.query(
            "SELECT COUNT(*) FROM professionals WHERE verification_status = 'pending'"
        );

        const serviceRequests = await pool.query(
            "SELECT COUNT(*) FROM service_requests"
        );

        const payments = await pool.query(
            `SELECT
                COUNT(*) FILTER (WHERE payment_state = 'awaiting_payment')::int AS awaiting_payment,
                COUNT(*) FILTER (WHERE payment_state = 'paid')::int AS paid_payments,
                COALESCE(SUM(wage) FILTER (WHERE payment_state = 'paid'), 0) AS confirmed_payment_value
             FROM (
                SELECT wage, status,
                       CASE
                           WHEN payment_status = 'paid' OR (wage IS NOT NULL AND status = 'completed') THEN 'paid'
                           WHEN payment_status = 'awaiting_payment' OR (wage IS NOT NULL AND status = 'in_progress') THEN 'awaiting_payment'
                           ELSE payment_status
                       END AS payment_state
                FROM service_requests
                WHERE wage IS NOT NULL
             ) payment_records`
        );

        res.json({
            users: Number(users.rows[0].count),
            professionals: Number(professionals.rows[0].count),
            pendingVerification: Number(
                pendingVerification.rows[0].count
            ),
            serviceRequests: Number(
                serviceRequests.rows[0].count
            ),
            awaitingPayments: payments.rows[0].awaiting_payment,
            paidPayments: payments.rows[0].paid_payments,
            confirmedPaymentValue: Number(payments.rows[0].confirmed_payment_value)
        });
    } catch (error) {
        console.error("Dashboard error:", error);

        res.status(500).json({
            message: "Failed to load dashboard"
        });
    }
};
const getUsers = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.name, u.email, u.phone, u.created_at,
                   COUNT(sr.id)::int AS service_request_count
            FROM users u
            LEFT JOIN professionals p ON p.user_id = u.id
            LEFT JOIN service_requests sr ON sr.customer_id = u.id
            WHERE p.id IS NULL
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
};

const getPendingVerifications = async (req, res) => {
    try {
        const query = `
            SELECT 
                p.id, p.full_name, p.category, p.sub_category, p.experience_years, 
                p.bio, p.verification_status, p.created_at, p.profile_photo, 
                p.identity_photo, p.identity_type, p.date_of_birth, p.address, 
                p.pincode, p.transport_mode, u.email, u.phone,
                json_agg(
                    json_build_object(
                        'type', d.document_type,
                        'url', d.document_url
                    )
                ) as documents
            FROM professionals p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN professional_documents d ON p.id = d.professional_id
            WHERE p.verification_status IN ('pending', 'under_review')
            GROUP BY p.id, u.id
            ORDER BY p.created_at ASC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching pending verifications:", error);
        res.status(500).json({ message: "Failed to fetch verifications" });
    }
};

const approveProfessional = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(
            "UPDATE professionals SET verification_status = 'verified', verified_at = CURRENT_TIMESTAMP WHERE id = $1",
            [id]
        );
        await pool.query(
            "UPDATE professional_documents SET verification_status = 'verified', verified_at = CURRENT_TIMESTAMP WHERE professional_id = $1",
            [id]
        );
        res.json({ message: "Professional approved successfully" });
    } catch (error) {
        console.error("Error approving professional:", error);
        res.status(500).json({ message: "Failed to approve professional" });
    }
};

const rejectProfessional = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        await pool.query(
            "UPDATE professionals SET verification_status = 'rejected', rejection_reason = $2 WHERE id = $1",
            [id, reason]
        );
        await pool.query(
            "UPDATE professional_documents SET verification_status = 'rejected', rejection_reason = $2 WHERE professional_id = $1",
            [id, reason]
        );
        res.json({ message: "Professional rejected successfully" });
    } catch (error) {
        console.error("Error rejecting professional:", error);
        res.status(500).json({ message: "Failed to reject professional" });
    }
};

const getVerifiedProfessionals = async (req, res) => {
    try {
        const query = `
            SELECT id, full_name, category, experience_years, bio, city, state, verified_at, created_at
            FROM professionals
            WHERE verification_status = 'verified'
            ORDER BY verified_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching verified professionals:", error);
        res.status(500).json({ message: "Failed to fetch professionals" });
    }
};

const getAllVerifications = async (req, res) => {
    try {
        const query = `
            SELECT 
                p.id, p.full_name, p.category, p.sub_category, p.experience_years, 
                p.bio, p.verification_status, p.rejection_reason, p.verified_at, 
                p.created_at, p.profile_photo, p.identity_photo, p.identity_type, 
                p.date_of_birth, p.address, p.pincode, p.transport_mode, 
                u.email, u.phone,
                json_agg(
                    json_build_object(
                        'type', d.document_type,
                        'url', d.document_url
                    )
                ) as documents
            FROM professionals p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN professional_documents d ON p.id = d.professional_id
            GROUP BY p.id, u.id
            ORDER BY p.created_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching all verifications:", error);
        res.status(500).json({ message: "Failed to fetch verification history" });
    }
};

const getCategories = async (req, res) => {
    try {
        const query = `
            SELECT
                c.id,
                c.name,
                c.description,
                c.price_estimate,
                c.created_at,
                COUNT(DISTINCT p.id) FILTER (WHERE p.verification_status = 'verified') AS verified_count,
                COUNT(DISTINCT p.id) AS total_professionals,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', s.id,
                                'category_id', s.category_id,
                                'category_name', s.category_name,
                                'name', s.name,
                                'image_url', s.image_url,
                                'price_estimate', s.price_estimate,
                                'created_at', s.created_at,
                                'updated_at', s.updated_at
                            ) ORDER BY s.id ASC
                        )
                        FROM subcategories s
                        WHERE s.category_id = c.id OR LOWER(s.category_name) = LOWER(c.name)
                    ),
                    '[]'::json
                ) AS subcategories
            FROM categories c
            LEFT JOIN professionals p ON p.category = c.name
            GROUP BY c.id
            ORDER BY c.name ASC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Failed to fetch categories' });
    }
};

const updateCategoryPrice = async (req, res) => {
    try {
        const { id } = req.params;
        const { price_estimate } = req.body;

        if (!price_estimate || typeof price_estimate !== 'string' || !price_estimate.trim()) {
            return res.status(400).json({ message: 'Valid price_estimate string is required' });
        }

        const cleanPrice = price_estimate.trim();
        const result = await pool.query(
            `UPDATE categories
             SET price_estimate = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING id, name, description, price_estimate, updated_at`,
            [cleanPrice, id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ message: 'Category not found' });
        }

        const updatedCategory = result.rows[0];

        // Broadcast real-time event to SSE clients
        broadcast('category_price_updated', {
            type: 'category',
            id: updatedCategory.id,
            name: updatedCategory.name,
            price_estimate: updatedCategory.price_estimate,
            timestamp: new Date().toISOString()
        });

        res.json({
            message: `Price updated for category "${updatedCategory.name}" successfully`,
            category: updatedCategory
        });
    } catch (error) {
        console.error('Error updating category price:', error);
        res.status(500).json({ message: 'Failed to update category price' });
    }
};

const updateSubcategoryPrice = async (req, res) => {
    try {
        const { id } = req.params;
        const { price_estimate } = req.body;

        if (!price_estimate || typeof price_estimate !== 'string' || !price_estimate.trim()) {
            return res.status(400).json({ message: 'Valid price_estimate string is required' });
        }

        const cleanPrice = price_estimate.trim();
        const result = await pool.query(
            `UPDATE subcategories
             SET price_estimate = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING id, category_id, category_name, name, image_url, price_estimate, updated_at`,
            [cleanPrice, id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ message: 'Subcategory not found' });
        }

        const updatedSubcategory = result.rows[0];

        // Broadcast real-time event to SSE clients
        broadcast('subcategory_price_updated', {
            type: 'subcategory',
            id: updatedSubcategory.id,
            category_name: updatedSubcategory.category_name,
            name: updatedSubcategory.name,
            price_estimate: updatedSubcategory.price_estimate,
            timestamp: new Date().toISOString()
        });

        res.json({
            message: `Price updated for subcategory "${updatedSubcategory.name}" successfully`,
            subcategory: updatedSubcategory
        });
    } catch (error) {
        console.error('Error updating subcategory price:', error);
        res.status(500).json({ message: 'Failed to update subcategory price' });
    }
};

const getServiceRequests = async (req, res) => {
    try {
        const { status } = req.query; // optional filter: pending | accepted | rejected | completed | cancelled
        const params = [];
        let whereClause = '';

        if (status) {
            params.push(status);
            whereClause = `WHERE sr.status = $1`;
        }

        const query = `
            SELECT
                sr.id,
                sr.status,
                sr.title,
                sr.description,
                sr.location,
                sr.district,
                sr.pricing_markup_percentage,
                sr.requested_at,
                sr.created_at,
                sr.updated_at,
                sr.wage,
                sr.wage_description,
                CASE
                    WHEN sr.payment_status = 'paid' OR (sr.wage IS NOT NULL AND sr.status = 'completed') THEN 'paid'
                    WHEN sr.payment_status = 'awaiting_payment' OR (sr.wage IS NOT NULL AND sr.status = 'in_progress') THEN 'awaiting_payment'
                    ELSE sr.payment_status
                END AS payment_status,
                u.name   AS user_name,
                u.email  AS user_email,
                offer_summary.offer_count,
                offer_summary.pending_offer_count,
                offer_summary.rejected_professionals,
                p.full_name AS professional_name,
                p.category  AS professional_category
            FROM service_requests sr
            LEFT JOIN users u ON sr.customer_id = u.id
            LEFT JOIN LATERAL (
                SELECT professional_id
                FROM service_offers
                WHERE request_id = sr.id AND status = 'accepted'
                LIMIT 1
            ) target_offer ON true
            LEFT JOIN professionals p ON target_offer.professional_id = p.id
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::int AS offer_count,
                      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_offer_count,
                      STRING_AGG(professional.full_name, ', ' ORDER BY professional.full_name)
                        FILTER (WHERE service_offers.status = 'rejected') AS rejected_professionals
                FROM service_offers
                  JOIN professionals professional ON professional.id = service_offers.professional_id
                WHERE request_id = sr.id
            ) offer_summary ON true
            ${whereClause}
            ORDER BY sr.created_at DESC
        `;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching service requests:', error);
        res.status(500).json({ message: 'Failed to fetch service requests' });
    }
};

const getReviews = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                r.id,
                r.rating,
                r.comment,
                r.created_at,
                sr.id AS request_id,
                sr.title AS request_title,
                customer.name AS customer_name,
                professional.full_name AS professional_name
            FROM professional_reviews r
            JOIN service_requests sr ON sr.id = r.request_id
            JOIN users customer ON customer.id = r.customer_id
            JOIN professionals professional ON professional.id = r.professional_id
            ORDER BY r.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ message: 'Failed to fetch reviews' });
    }
};

// ─────────────────────────────────────────────────────────────
// 1. LOCATION MANAGEMENT (CRUD, CSV Import, Verification)
// ─────────────────────────────────────────────────────────────

// GET /api/admin/locations
const getLocations = async (req, res) => {
    try {
        const { district, search, location_type, verification_status, is_active } = req.query;
        let query = 'SELECT * FROM kerala_locations WHERE 1=1';
        const params = [];

        if (district && district !== 'all') {
            params.push(district.trim());
            query += ` AND LOWER(district) = LOWER($${params.length})`;
        }
        if (location_type && location_type !== 'all') {
            params.push(location_type.trim());
            query += ` AND location_type = $${params.length}`;
        }
        if (verification_status && verification_status !== 'all') {
            params.push(verification_status.trim());
            query += ` AND verification_status = $${params.length}`;
        }
        if (is_active !== undefined && is_active !== 'all' && is_active !== '') {
            params.push(is_active === 'true' || is_active === true);
            query += ` AND is_active = $${params.length}`;
        }
        if (search && search.trim()) {
            params.push(`%${search.trim().toLowerCase()}%`);
            query += ` AND (LOWER(city) LIKE $${params.length} OR LOWER(district) LIKE $${params.length} OR LOWER(COALESCE(locality, '')) LIKE $${params.length})`;
        }

        query += ' ORDER BY district ASC, city ASC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('getLocations error:', err);
        res.status(500).json({ message: 'Failed to fetch locations' });
    }
};

// POST /api/admin/locations
const createLocation = async (req, res) => {
    try {
        const { district, city, locality, pincode, latitude, longitude, location_type = 'town', verification_status = 'verified' } = req.body;
        if (!district?.trim() || !city?.trim()) {
            return res.status(400).json({ message: 'District and City/Town are required' });
        }

        const insertRes = await pool.query(
            `INSERT INTO kerala_locations 
              (district, city, locality, pincode, latitude, longitude, location_type, verification_status, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
             ON CONFLICT (district, city, locality) DO UPDATE
             SET pincode = COALESCE(EXCLUDED.pincode, kerala_locations.pincode),
                 latitude = COALESCE(EXCLUDED.latitude, kerala_locations.latitude),
                 longitude = COALESCE(EXCLUDED.longitude, kerala_locations.longitude),
                 location_type = EXCLUDED.location_type,
                 verification_status = EXCLUDED.verification_status,
                 is_active = TRUE,
                 updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [
                district.trim(),
                city.trim(),
                locality?.trim() || null,
                pincode?.trim() || null,
                latitude ? Number(latitude) : null,
                longitude ? Number(longitude) : null,
                location_type || 'town',
                verification_status || 'verified'
            ]
        );

        const loc = insertRes.rows[0];
        await pool.query(
            `INSERT INTO pricing_audit_logs (admin_id, action_type, entity_type, entity_id, new_value, reason)
             VALUES ('admin', 'create', 'location', $1, $2, 'Location created or updated')`,
            [loc.id, JSON.stringify(loc)]
        );

        res.status(201).json({ message: `Location ${loc.city}, ${loc.district} saved`, location: loc });
    } catch (err) {
        console.error('createLocation error:', err);
        res.status(500).json({ message: 'Failed to create location' });
    }
};

// PUT /api/admin/locations/:id
const updateLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { district, city, locality, pincode, latitude, longitude, location_type, verification_status, is_active } = req.body;

        const oldRes = await pool.query('SELECT * FROM kerala_locations WHERE id = $1', [id]);
        if (oldRes.rows.length === 0) return res.status(404).json({ message: 'Location not found' });
        const oldVal = oldRes.rows[0];

        const updateRes = await pool.query(
            `UPDATE kerala_locations
             SET district = COALESCE($1, district),
                 city = COALESCE($2, city),
                 locality = $3,
                 pincode = COALESCE($4, pincode),
                 latitude = COALESCE($5, latitude),
                 longitude = COALESCE($6, longitude),
                 location_type = COALESCE($7, location_type),
                 verification_status = COALESCE($8, verification_status),
                 is_active = COALESCE($9, is_active),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $10
             RETURNING *`,
            [
                district ? district.trim() : null,
                city ? city.trim() : null,
                locality !== undefined ? (locality ? locality.trim() : null) : oldVal.locality,
                pincode ? pincode.trim() : null,
                latitude !== undefined ? (latitude ? Number(latitude) : null) : oldVal.latitude,
                longitude !== undefined ? (longitude ? Number(longitude) : null) : oldVal.longitude,
                location_type || null,
                verification_status || null,
                is_active !== undefined ? Boolean(is_active) : null,
                id
            ]
        );

        const updated = updateRes.rows[0];
        await pool.query(
            `INSERT INTO pricing_audit_logs (admin_id, action_type, entity_type, entity_id, old_value, new_value, reason)
             VALUES ('admin', 'update', 'location', $1, $2, $3, 'Updated location properties')`,
            [id, JSON.stringify(oldVal), JSON.stringify(updated)]
        );

        res.json({ message: 'Location updated successfully', location: updated });
    } catch (err) {
        console.error('updateLocation error:', err);
        res.status(500).json({ message: 'Failed to update location' });
    }
};

// POST /api/admin/locations/import - CSV or Batch Location Import
const importLocations = async (req, res) => {
    try {
        const { locations } = req.body; // Array of location objects
        if (!Array.isArray(locations) || locations.length === 0) {
            return res.status(400).json({ message: 'A non-empty locations array is required for import' });
        }

        let importedCount = 0;
        let updatedCount = 0;

        for (const loc of locations) {
            if (!loc.district || !loc.city) continue;
            const resInsert = await pool.query(
                `INSERT INTO kerala_locations 
                  (district, city, locality, pincode, latitude, longitude, location_type, verification_status, is_active)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
                 ON CONFLICT (district, city, locality) DO UPDATE
                 SET pincode = COALESCE(EXCLUDED.pincode, kerala_locations.pincode),
                     latitude = COALESCE(EXCLUDED.latitude, kerala_locations.latitude),
                     longitude = COALESCE(EXCLUDED.longitude, kerala_locations.longitude),
                     location_type = EXCLUDED.location_type,
                     is_active = TRUE,
                     updated_at = CURRENT_TIMESTAMP
                 RETURNING (xmax = 0) AS is_insert`,
                [
                    loc.district.trim(),
                    loc.city.trim(),
                    loc.locality?.trim() || null,
                    loc.pincode?.trim() || null,
                    loc.latitude ? Number(loc.latitude) : null,
                    loc.longitude ? Number(loc.longitude) : null,
                    loc.location_type || 'town',
                    loc.verification_status || 'verified'
                ]
            );

            if (resInsert.rows[0]?.is_insert) importedCount++;
            else updatedCount++;
        }

        await pool.query(
            `INSERT INTO pricing_audit_logs (admin_id, action_type, entity_type, new_value, reason)
             VALUES ('admin', 'bulk_update', 'location', $1, 'Bulk imported locations')`,
            [JSON.stringify({ imported: importedCount, updated: updatedCount })]
        );

        res.json({
            message: `Import complete: ${importedCount} added, ${updatedCount} updated.`,
            imported: importedCount,
            updated: updatedCount
        });
    } catch (err) {
        console.error('importLocations error:', err);
        res.status(500).json({ message: 'Failed to import locations' });
    }
};

// DELETE /api/admin/locations/:id
const deleteLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await pool.query('SELECT * FROM kerala_locations WHERE id = $1', [id]);
        if (existing.rows.length === 0) return res.status(404).json({ message: 'Location not found' });
        const loc = existing.rows[0];

        await pool.query('DELETE FROM kerala_locations WHERE id = $1', [id]);
        await pool.query(
            `INSERT INTO pricing_audit_logs (admin_id, action_type, entity_type, entity_id, old_value, reason)
             VALUES ('admin', 'delete', 'location', $1, $2, 'Location deleted')`,
            [id, JSON.stringify(loc)]
        );
        res.json({ message: `Location ${loc.city}, ${loc.district} deleted` });
    } catch (err) {
        console.error('deleteLocation error:', err);
        res.status(500).json({ message: 'Failed to delete location' });
    }
};

// PATCH /api/admin/locations/:id/toggle - Toggle active/inactive status
const toggleLocationActive = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await pool.query('SELECT * FROM kerala_locations WHERE id = $1', [id]);
        if (existing.rows.length === 0) return res.status(404).json({ message: 'Location not found' });
        const loc = existing.rows[0];
        const newActive = !loc.is_active;

        const updated = await pool.query(
            'UPDATE kerala_locations SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [newActive, id]
        );
        await pool.query(
            `INSERT INTO pricing_audit_logs (admin_id, action_type, entity_type, entity_id, old_value, new_value, reason)
             VALUES ('admin', 'update', 'location', $1, $2, $3, $4)`,
            [id, JSON.stringify({ is_active: loc.is_active }), JSON.stringify({ is_active: newActive }), newActive ? 'Activated location' : 'Deactivated location']
        );
        res.json({ message: `Location ${loc.city} ${newActive ? 'activated' : 'deactivated'}`, location: updated.rows[0] });
    } catch (err) {
        console.error('toggleLocationActive error:', err);
        res.status(500).json({ message: 'Failed to toggle location status' });
    }
};

// GET /api/admin/locations/stats - Summary counts for header
const getLocationStats = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE is_active = TRUE) AS active,
                COUNT(*) FILTER (WHERE is_active = FALSE) AS inactive,
                COUNT(*) FILTER (WHERE verification_status = 'verified') AS verified,
                COUNT(DISTINCT district) AS districts
            FROM kerala_locations
        `);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('getLocationStats error:', err);
        res.status(500).json({ message: 'Failed to fetch location stats' });
    }
};

// ─────────────────────────────────────────────────────────────
// 2. BASE LABOUR RATES (Category & Job Type)
// ─────────────────────────────────────────────────────────────

// GET /api/admin/pricing/base-rates
const getBaseRates = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT pbr.*, c.name AS category_name, s.name AS job_type_name
            FROM pricing_base_rates pbr
            JOIN categories c ON c.id = pbr.category_id
            LEFT JOIN subcategories s ON s.id = pbr.job_type_id
            ORDER BY c.name ASC, s.name ASC NULLS FIRST
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('getBaseRates error:', err);
        res.status(500).json({ message: 'Failed to fetch base rates' });
    }
};

// POST /api/admin/pricing/base-rates
const saveBaseRate = async (req, res) => {
    try {
        const { category_id, job_type_id, base_price, notes } = req.body;
        const numPrice = Number(base_price);
        if (!category_id || !Number.isFinite(numPrice) || numPrice < 0) {
            return res.status(400).json({ message: 'Category ID and non-negative base price are required' });
        }

        const oldRes = await pool.query(
            'SELECT * FROM pricing_base_rates WHERE category_id = $1 AND (job_type_id = $2 OR (job_type_id IS NULL AND $2 IS NULL))',
            [category_id, job_type_id || null]
        );
        const oldVal = oldRes.rows[0] || null;

        const result = await pool.query(
            `INSERT INTO pricing_base_rates (category_id, job_type_id, base_price, is_active, notes, updated_at)
             VALUES ($1, $2, $3, TRUE, $4, CURRENT_TIMESTAMP)
             ON CONFLICT (category_id, job_type_id) DO UPDATE
             SET base_price = EXCLUDED.base_price,
                 is_active = TRUE,
                 notes = COALESCE(EXCLUDED.notes, pricing_base_rates.notes),
                 updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [category_id, job_type_id || null, numPrice, notes || null]
        );

        const saved = result.rows[0];
        await pool.query(
            `INSERT INTO pricing_audit_logs (admin_id, action_type, entity_type, entity_id, old_value, new_value, reason)
             VALUES ('admin', $1, 'base_price', $2, $3, $4, 'Saved base rate')`,
            [oldVal ? 'update' : 'create', saved.id, JSON.stringify(oldVal), JSON.stringify(saved)]
        );

        broadcast('base_rate_updated', saved);
        res.json({ message: 'Base price saved successfully', base_rate: saved });
    } catch (err) {
        console.error('saveBaseRate error:', err);
        res.status(500).json({ message: 'Failed to save base price' });
    }
};

// ─────────────────────────────────────────────────────────────
// 3. LOCATION ADJUSTMENTS (Locality, City, or District scoped)
// ─────────────────────────────────────────────────────────────

// GET /api/admin/pricing/adjustments
const getAdjustments = async (req, res) => {
    try {
        const { district, city, category_id } = req.query;
        let query = `
            SELECT pla.*, c.name AS category_name, s.name AS job_type_name
            FROM pricing_location_adjustments pla
            LEFT JOIN categories c ON c.id = pla.category_id
            LEFT JOIN subcategories s ON s.id = pla.job_type_id
            WHERE 1=1
        `;
        const params = [];

        if (district && district !== 'all') {
            params.push(district.trim());
            query += ` AND LOWER(pla.district) = LOWER($${params.length})`;
        }
        if (city && city !== 'all') {
            params.push(city.trim());
            query += ` AND LOWER(pla.city) = LOWER($${params.length})`;
        }
        if (category_id && category_id !== 'all') {
            params.push(category_id);
            query += ` AND pla.category_id = $${params.length}`;
        }

        query += ' ORDER BY pla.district ASC, pla.city ASC, pla.id DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('getAdjustments error:', err);
        res.status(500).json({ message: 'Failed to fetch adjustments' });
    }
};

// POST /api/admin/pricing/adjustments
const saveAdjustment = async (req, res) => {
    try {
        const { location_id, district, city, locality, category_id, job_type_id, adjustment_type, adjustment_value, notes } = req.body;
        const numVal = Number(adjustment_value);

        if (!adjustment_type || !['percentage', 'fixed'].includes(adjustment_type) || !Number.isFinite(numVal)) {
            return res.status(400).json({ message: 'Valid adjustment_type (percentage/fixed) and numeric adjustment_value required' });
        }

        const insertRes = await pool.query(
            `INSERT INTO pricing_location_adjustments 
              (location_id, district, city, locality, category_id, job_type_id, adjustment_type, adjustment_value, is_active, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9)
             RETURNING *`,
            [
                location_id || null,
                district?.trim() || null,
                city?.trim() || null,
                locality?.trim() || null,
                category_id ? Number(category_id) : null,
                job_type_id ? Number(job_type_id) : null,
                adjustment_type,
                numVal,
                notes || null
            ]
        );

        const saved = insertRes.rows[0];
        await pool.query(
            `INSERT INTO pricing_audit_logs (admin_id, action_type, entity_type, entity_id, new_value, reason)
             VALUES ('admin', 'create', 'adjustment', $1, $2, 'Added location adjustment')`,
            [saved.id, JSON.stringify(saved)]
        );

        broadcast('pricing_adjustment_created', saved);
        res.status(201).json({ message: 'Adjustment saved successfully', adjustment: saved });
    } catch (err) {
        console.error('saveAdjustment error:', err);
        res.status(500).json({ message: 'Failed to save location adjustment' });
    }
};

// DELETE /api/admin/pricing/adjustments/:id
const deleteAdjustment = async (req, res) => {
    try {
        const { id } = req.params;
        const oldRes = await pool.query('SELECT * FROM pricing_location_adjustments WHERE id = $1', [id]);
        if (oldRes.rows.length === 0) return res.status(404).json({ message: 'Adjustment not found' });

        await pool.query('DELETE FROM pricing_location_adjustments WHERE id = $1', [id]);
        await pool.query(
            `INSERT INTO pricing_audit_logs (admin_id, action_type, entity_type, entity_id, old_value, reason)
             VALUES ('admin', 'delete', 'adjustment', $1, $2, 'Deleted location adjustment')`,
            [id, JSON.stringify(oldRes.rows[0])]
        );

        res.json({ message: 'Adjustment deleted successfully' });
    } catch (err) {
        console.error('deleteAdjustment error:', err);
        res.status(500).json({ message: 'Failed to delete adjustment' });
    }
};

// PATCH /api/admin/pricing/adjustments/:id/toggle
const toggleAdjustmentActive = async (req, res) => {
    try {
        const { id } = req.params;
        const cur = await pool.query('SELECT * FROM pricing_location_adjustments WHERE id = $1', [id]);
        if (cur.rows.length === 0) return res.status(404).json({ message: 'Adjustment not found' });
        const newStatus = !cur.rows[0].is_active;
        const updated = await pool.query(
            'UPDATE pricing_location_adjustments SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [newStatus, id]
        );
        await pool.query(
            `INSERT INTO pricing_audit_logs (admin_id, action_type, entity_type, entity_id, new_value, reason)
             VALUES ('admin', 'toggle_active', 'adjustment', $1, $2, $3)`,
            [id, JSON.stringify(updated.rows[0]), `Toggled adjustment active status to ${newStatus}`]
        );
        broadcast('pricing_adjustment_updated', updated.rows[0]);
        res.json({ message: `Adjustment ${newStatus ? 'activated' : 'deactivated'} successfully`, adjustment: updated.rows[0] });
    } catch (err) {
        console.error('toggleAdjustmentActive error:', err);
        res.status(500).json({ message: 'Failed to toggle adjustment status' });
    }
};

// POST /api/admin/pricing/adjustments/bulk - Bulk apply adjustments to multiple locations
const bulkApplyAdjustments = async (req, res) => {
    try {
        const { location_ids, district, category_id, adjustment_type, adjustment_value, notes } = req.body;
        const numVal = Number(adjustment_value);

        if (!adjustment_type || !['percentage', 'fixed'].includes(adjustment_type) || !Number.isFinite(numVal)) {
            return res.status(400).json({ message: 'Valid adjustment_type and numeric adjustment_value required' });
        }

        let targetLocations = [];
        if (Array.isArray(location_ids) && location_ids.length > 0) {
            const locRes = await pool.query('SELECT id, district, city, locality FROM kerala_locations WHERE id = ANY($1)', [location_ids]);
            targetLocations = locRes.rows;
        } else if (district && district !== 'all') {
            const locRes = await pool.query('SELECT id, district, city, locality FROM kerala_locations WHERE LOWER(district) = LOWER($1)', [district.trim()]);
            targetLocations = locRes.rows;
        }

        if (targetLocations.length === 0) {
            return res.status(400).json({ message: 'No matching locations found for bulk adjustment' });
        }

        let count = 0;
        for (const loc of targetLocations) {
            await pool.query(
                `INSERT INTO pricing_location_adjustments 
                  (location_id, district, city, locality, category_id, adjustment_type, adjustment_value, is_active, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8)`,
                [loc.id, loc.district, loc.city, loc.locality, category_id || null, adjustment_type, numVal, notes || 'Bulk applied adjustment']
            );
            count++;
        }

        await pool.query(
            `INSERT INTO pricing_audit_logs (admin_id, action_type, entity_type, new_value, reason)
             VALUES ('admin', 'bulk_update', 'adjustment', $1, $2)`,
            [JSON.stringify({ count, adjustment_type, adjustment_value, category_id }), notes || 'Bulk adjustment applied']
        );

        res.json({ message: `Bulk adjustment applied to ${count} locations`, count });
    } catch (err) {
        console.error('bulkApplyAdjustments error:', err);
        res.status(500).json({ message: 'Failed to apply bulk adjustments' });
    }
};

// ─────────────────────────────────────────────────────────────
// 4. EXACT MANUAL OVERRIDES (Highest priority override)
// ─────────────────────────────────────────────────────────────

// GET /api/admin/pricing/overrides
const getManualOverrides = async (req, res) => {
    try {
        const { district, city, category_id } = req.query;
        let query = `
            SELECT pmo.*, c.name AS category_name, s.name AS job_type_name
            FROM pricing_manual_overrides pmo
            JOIN categories c ON c.id = pmo.category_id
            LEFT JOIN subcategories s ON s.id = pmo.job_type_id
            WHERE 1=1
        `;
        const params = [];

        if (district && district !== 'all') {
            params.push(district.trim());
            query += ` AND LOWER(pmo.district) = LOWER($${params.length})`;
        }
        if (city && city !== 'all') {
            params.push(city.trim());
            query += ` AND LOWER(pmo.city) = LOWER($${params.length})`;
        }
        if (category_id && category_id !== 'all') {
            params.push(category_id);
            query += ` AND pmo.category_id = $${params.length}`;
        }

        query += ' ORDER BY pmo.district ASC, pmo.city ASC, pmo.id DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('getManualOverrides error:', err);
        res.status(500).json({ message: 'Failed to fetch manual overrides' });
    }
};

// POST /api/admin/pricing/overrides
const saveManualOverride = async (req, res) => {
    try {
        const { location_id, district, city, locality, category_id, job_type_id, exact_price, reason } = req.body;
        const numPrice = Number(exact_price);

        if (!category_id || !Number.isFinite(numPrice) || numPrice < 0) {
            return res.status(400).json({ message: 'Category ID and valid non-negative exact price are required' });
        }

        const insertRes = await pool.query(
            `INSERT INTO pricing_manual_overrides 
              (location_id, district, city, locality, category_id, job_type_id, exact_price, currency, is_active, reason)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'INR', TRUE, $8)
             RETURNING *`,
            [
                location_id || null,
                district?.trim() || null,
                city?.trim() || null,
                locality?.trim() || null,
                Number(category_id),
                job_type_id ? Number(job_type_id) : null,
                numPrice,
                reason || null
            ]
        );

        const saved = insertRes.rows[0];
        await pool.query(
            `INSERT INTO pricing_audit_logs (admin_id, action_type, entity_type, entity_id, new_value, reason)
             VALUES ('admin', 'create', 'override', $1, $2, $3)`,
            [saved.id, JSON.stringify(saved), reason || 'Exact override added']
        );

        broadcast('manual_override_created', saved);
        res.status(201).json({ message: 'Manual override saved successfully', override: saved });
    } catch (err) {
        console.error('saveManualOverride error:', err);
        res.status(500).json({ message: 'Failed to save manual override' });
    }
};

// DELETE /api/admin/pricing/overrides/:id
const deleteManualOverride = async (req, res) => {
    try {
        const { id } = req.params;
        const oldRes = await pool.query('SELECT * FROM pricing_manual_overrides WHERE id = $1', [id]);
        if (oldRes.rows.length === 0) return res.status(404).json({ message: 'Override not found' });

        await pool.query('DELETE FROM pricing_manual_overrides WHERE id = $1', [id]);
        await pool.query(
            `INSERT INTO pricing_audit_logs (admin_id, action_type, entity_type, entity_id, old_value, reason)
             VALUES ('admin', 'delete', 'override', $1, $2, 'Deleted manual override')`,
            [id, JSON.stringify(oldRes.rows[0])]
        );

        res.json({ message: 'Manual override deleted successfully' });
    } catch (err) {
        console.error('deleteManualOverride error:', err);
        res.status(500).json({ message: 'Failed to delete manual override' });
    }
};

// PATCH /api/admin/pricing/overrides/:id/toggle
const toggleManualOverrideActive = async (req, res) => {
    try {
        const { id } = req.params;
        const cur = await pool.query('SELECT * FROM pricing_manual_overrides WHERE id = $1', [id]);
        if (cur.rows.length === 0) return res.status(404).json({ message: 'Override not found' });
        const newStatus = !cur.rows[0].is_active;
        const updated = await pool.query(
            'UPDATE pricing_manual_overrides SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [newStatus, id]
        );
        await pool.query(
            `INSERT INTO pricing_audit_logs (admin_id, action_type, entity_type, entity_id, new_value, reason)
             VALUES ('admin', 'toggle_active', 'override', $1, $2, $3)`,
            [id, JSON.stringify(updated.rows[0]), `Toggled override active status to ${newStatus}`]
        );
        broadcast('manual_override_updated', updated.rows[0]);
        res.json({ message: `Override ${newStatus ? 'activated' : 'deactivated'} successfully`, override: updated.rows[0] });
    } catch (err) {
        console.error('toggleManualOverrideActive error:', err);
        res.status(500).json({ message: 'Failed to toggle override status' });
    }
};

// ─────────────────────────────────────────────────────────────
// 5. TRAVEL PRICING RULES
// ─────────────────────────────────────────────────────────────

// GET /api/admin/pricing/travel-rules
const getTravelRules = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pricing_travel_rules ORDER BY district NULLS LAST, id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('getTravelRules error:', err);
        res.status(500).json({ message: 'Failed to fetch travel rules' });
    }
};

// POST /api/admin/pricing/travel-rules
const saveTravelRule = async (req, res) => {
    try {
        const { rule_name, district, fixed_visit_fee, free_radius_km, per_km_rate, min_fee, max_fee, is_active } = req.body;

        const result = await pool.query(
            `INSERT INTO pricing_travel_rules
              (rule_name, district, fixed_visit_fee, free_radius_km, per_km_rate, min_fee, max_fee, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                rule_name || 'Travel Rule',
                district?.trim() || null,
                Number(fixed_visit_fee) || 0,
                Number(free_radius_km) || 0,
                Number(per_km_rate) || 0,
                min_fee != null ? Number(min_fee) : 0,
                max_fee != null ? Number(max_fee) : null,
                is_active !== undefined ? Boolean(is_active) : true
            ]
        );

        const saved = result.rows[0];
        await pool.query(
            `INSERT INTO pricing_audit_logs (admin_id, action_type, entity_type, entity_id, new_value, reason)
             VALUES ('admin', 'create', 'travel_rule', $1, $2, 'Saved travel rule')`,
            [saved.id, JSON.stringify(saved)]
        );

        res.status(201).json({ message: 'Travel rule saved successfully', travel_rule: saved });
    } catch (err) {
        console.error('saveTravelRule error:', err);
        res.status(500).json({ message: 'Failed to save travel rule' });
    }
};

// ─────────────────────────────────────────────────────────────
// 6. PRICING PREVIEW & SIMULATION
// ─────────────────────────────────────────────────────────────

// POST /api/admin/pricing/preview
const previewPriceCalculation = async (req, res) => {
    try {
        const { category_id, category_name, job_type_id, district, city, locality, provider_lat, provider_lon, service_lat, service_lon } = req.body;

        const previewResult = await calculatePrice({
            categoryId: category_id,
            categoryName: category_name,
            jobTypeId: job_type_id,
            district,
            city,
            locality,
            providerLat: provider_lat,
            providerLon: provider_lon,
            serviceLat: service_lat,
            serviceLon: service_lon
        });

        // Also fetch wage recommendation if available
        let recommendation = null;
        if (previewResult.category_id) {
            recommendation = await getAdjustmentRecommendation({
                categoryId: previewResult.category_id,
                district,
                city
            });
        }

        res.json({
            ...previewResult,
            recommendation
        });
    } catch (err) {
        console.error('previewPriceCalculation error:', err);
        res.status(500).json({ message: 'Failed to simulate pricing' });
    }
};

// ─────────────────────────────────────────────────────────────
// 7. WAGE DATA RECOMMENDATIONS & BENCHMARK INTELLIGENCE
// ─────────────────────────────────────────────────────────────

// GET /api/admin/pricing/recommendations
const getWageRecommendations = async (req, res) => {
    try {
        const { category_id, district, city } = req.query;
        if (!category_id) return res.status(400).json({ message: 'category_id is required' });

        const rec = await getAdjustmentRecommendation({
            categoryId: Number(category_id),
            district,
            city
        });
        res.json(rec);
    } catch (err) {
        console.error('getWageRecommendations error:', err);
        res.status(500).json({ message: 'Failed to get wage recommendations' });
    }
};

// GET /api/admin/pricing/benchmarks/diagnostics
const getWageBenchmarkDiagnostics = async (req, res) => {
    try {
        const diagnostics = await getBenchmarkCoverageDiagnostics();
        res.json(diagnostics);
    } catch (err) {
        console.error('getWageBenchmarkDiagnostics error:', err);
        res.status(500).json({ message: 'Failed to get benchmark diagnostics' });
    }
};

// GET /api/admin/pricing/benchmarks/config
const getWageBenchmarkConfig = async (req, res) => {
    try {
        const config = await getBenchmarkConfig();
        res.json(config);
    } catch (err) {
        console.error('getWageBenchmarkConfig error:', err);
        res.status(500).json({ message: 'Failed to get benchmark config' });
    }
};

// POST /api/admin/pricing/benchmarks/config
const updateWageBenchmarkConfig = async (req, res) => {
    try {
        const { min_sample_threshold, max_data_age_days, target_wage_type, require_verified_only } = req.body;
        const updated = await updateBenchmarkConfig({
            min_sample_threshold: min_sample_threshold !== undefined ? Number(min_sample_threshold) : undefined,
            max_data_age_days: max_data_age_days !== undefined ? Number(max_data_age_days) : undefined,
            target_wage_type: target_wage_type || undefined,
            require_verified_only: require_verified_only !== undefined ? Boolean(require_verified_only) : undefined
        });

        await pool.query(
            `INSERT INTO pricing_audit_logs (admin_id, action_type, entity_type, entity_id, new_value, reason)
             VALUES ('admin', 'update', 'benchmark_config', 0, $1, 'Updated wage benchmark evidence thresholds')`,
            [JSON.stringify(updated)]
        );

        res.json({ message: 'Benchmark configuration updated successfully', config: updated });
    } catch (err) {
        console.error('updateWageBenchmarkConfig error:', err);
        res.status(500).json({ message: 'Failed to update benchmark config' });
    }
};


// ─────────────────────────────────────────────────────────────
// 8. PRICING AUDIT LOGS
// ─────────────────────────────────────────────────────────────

// GET /api/admin/pricing/audit-logs
const getPricingAuditLogs = async (req, res) => {
    try {
        const { entity_type, limit = 100 } = req.query;
        let query = 'SELECT * FROM pricing_audit_logs WHERE 1=1';
        const params = [];

        if (entity_type && entity_type !== 'all') {
            params.push(entity_type);
            query += ` AND entity_type = $${params.length}`;
        }
        params.push(Math.min(500, Math.max(1, Number(limit))));
        query += ` ORDER BY created_at DESC LIMIT $${params.length}`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('getPricingAuditLogs error:', err);
        res.status(500).json({ message: 'Failed to fetch pricing audit logs' });
    }
};

// Backward-compatibility wrapper for existing location list endpoints
const getPricingLocations = async (req, res) => {
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
    } catch (error) {
        console.error('Error fetching pricing locations:', error);
        res.status(500).json({ message: 'Failed to fetch pricing locations' });
    }
};

// Backward-compatibility query for existing admin dashboard
const getLocationPricing = async (req, res) => {
    try {
        const { district, city, category_id, search, is_active } = req.query;
        let query = `
            SELECT 
                lcp.id,
                lcp.district,
                lcp.city,
                lcp.category_id,
                COALESCE(c.name, lcp.category_name) AS category_name,
                lcp.price,
                lcp.currency,
                lcp.is_active,
                lcp.created_at,
                lcp.updated_at,
                lcp.updated_by
            FROM location_category_prices lcp
            LEFT JOIN categories c ON c.id = lcp.category_id
            WHERE 1=1
        `;
        const params = [];

        if (district && district !== 'all') {
            params.push(district);
            query += ` AND LOWER(lcp.district) = LOWER($${params.length})`;
        }
        if (city && city !== 'all') {
            params.push(city);
            query += ` AND LOWER(lcp.city) = LOWER($${params.length})`;
        }
        if (category_id && category_id !== 'all') {
            params.push(category_id);
            query += ` AND lcp.category_id = $${params.length}`;
        }
        if (is_active !== undefined && is_active !== 'all' && is_active !== '') {
            params.push(is_active === 'true' || is_active === true);
            query += ` AND lcp.is_active = $${params.length}`;
        }
        if (search && search.trim()) {
            params.push(`%${search.trim().toLowerCase()}%`);
            query += ` AND (
                LOWER(lcp.city) LIKE $${params.length} OR 
                LOWER(lcp.district) LIKE $${params.length} OR 
                LOWER(lcp.category_name) LIKE $${params.length} OR
                LOWER(COALESCE(c.name, '')) LIKE $${params.length}
            )`;
        }

        query += ` ORDER BY lcp.district ASC, lcp.city ASC, lcp.category_name ASC`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching location pricing:', error);
        res.status(500).json({ message: 'Failed to fetch location pricing' });
    }
};

const createLocationPricing = async (req, res) => {
    try {
        const { district, city, category_id, price, currency = 'INR', is_active = true } = req.body;
        const numericPrice = Number(price);

        const catRes = await pool.query('SELECT name FROM categories WHERE id = $1', [category_id]);
        const categoryName = catRes.rows[0]?.name || 'Service';

        const insertRes = await pool.query(
            `INSERT INTO location_category_prices (
                district, city, category_id, category_name, price, currency, is_active, updated_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'admin')
            ON CONFLICT (district, city, category_id) DO UPDATE
            SET price = EXCLUDED.price, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP
            RETURNING *`,
            [district.trim(), city.trim(), category_id, categoryName, numericPrice, currency, Boolean(is_active)]
        );

        res.status(201).json({ message: 'Pricing saved', pricing: insertRes.rows[0] });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const updateLocationPricing = async (req, res) => {
    try {
        const { id } = req.params;
        const { price, is_active, district, city } = req.body;
        const updateRes = await pool.query(
            `UPDATE location_category_prices
             SET price = COALESCE($1, price),
                 is_active = COALESCE($2, is_active),
                 district = COALESCE($3, district),
                 city = COALESCE($4, city),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5
             RETURNING *`,
            [price != null ? Number(price) : null, is_active != null ? Boolean(is_active) : null, district, city, id]
        );
        res.json({ message: 'Updated', pricing: updateRes.rows[0] });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const toggleLocationPricingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `UPDATE location_category_prices SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
            [id]
        );
        res.json({ pricing: result.rows[0] });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const deleteLocationPricing = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM location_category_prices WHERE id = $1 RETURNING *', [id]);
        res.json({ message: 'Deleted', pricing: result.rows[0] });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    getDashboard,
    getUsers,
    getPendingVerifications,
    approveProfessional,
    rejectProfessional,
    getVerifiedProfessionals,
    getAllVerifications,
    getCategories,
    updateCategoryPrice,
    updateSubcategoryPrice,
    getServiceRequests,
    getReviews,
    // Modern Location & Pricing System Handlers
    getLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    toggleLocationActive,
    getLocationStats,
    importLocations,
    getBaseRates,
    saveBaseRate,
    getAdjustments,
    saveAdjustment,
    deleteAdjustment,
    toggleAdjustmentActive,
    bulkApplyAdjustments,
    getManualOverrides,
    saveManualOverride,
    deleteManualOverride,
    toggleManualOverrideActive,
    getTravelRules,
    saveTravelRule,
    previewPriceCalculation,
    getWageRecommendations,
    getWageBenchmarkDiagnostics,
    getWageBenchmarkConfig,
    updateWageBenchmarkConfig,
    getPricingAuditLogs,
    // Backwards-compatible pricing handlers
    getLocationPricing,
    createLocationPricing,
    updateLocationPricing,
    toggleLocationPricingStatus,
    deleteLocationPricing,
    getPricingLocations
};

