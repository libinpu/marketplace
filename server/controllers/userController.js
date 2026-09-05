const pool = require('../config/database');
const { notifyPro } = require('../utils/proSseClients');
const { broadcast } = require('../utils/sseClients');
const { addCustomerClient, removeCustomerClient } = require('../utils/customerSseClients');
const {
    getNotificationsByUserId,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
    NOTIFICATION_TYPES
} = require('../utils/notifications');

exports.getProfile = async (req, res) => {
    try {
        const userId = Number(req.user.id);
        if (!Number.isInteger(userId)) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }
        const result = await pool.query(
            'SELECT id, name, email, phone, address FROM users WHERE id = $1',
            [userId]
        );
        if (!result.rows[0]) return res.status(404).json({ message: 'Profile not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('getProfile error:', err);
        res.status(500).json({ message: 'Failed to fetch profile' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { phone, address } = req.body;
        const userId = Number(req.user.id);
        if (!Number.isInteger(userId)) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }
        if (!phone?.trim()) return res.status(400).json({ message: 'Phone number is required' });

        const result = await pool.query(
            `UPDATE users SET phone = $1, address = $2
             WHERE id = $3 RETURNING id, name, email, phone, address`,
            [phone.trim(), address?.trim() || null, userId]
        );
        if (!result.rows[0]) return res.status(404).json({ message: 'Profile not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('updateProfile error:', err);
        res.status(500).json({ message: 'Failed to update profile' });
    }
};

// GET /api/user/categories - list all service categories
exports.getCategories = async (req, res) => {
    try {
        const { lang } = req.query;
        let selectQuery = 'SELECT id, name, description FROM categories ORDER BY name ASC';
        if (lang === 'ml') {
            selectQuery = 'SELECT id, COALESCE(name_ml, name) AS name, COALESCE(description_ml, description) AS description FROM categories ORDER BY name ASC';
        }
        const result = await pool.query(selectQuery);
        res.json(result.rows);
    } catch (err) {
        console.error('getCategories error:', err);
        res.status(500).json({ message: 'Failed to fetch categories' });
    }
};

// GET /api/user/subcategories - list all subcategories or filter by ?category=...
exports.getSubcategories = async (req, res) => {
    try {
        const { category, lang } = req.query;
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
        res.json(result.rows);
    } catch (err) {
        console.error('getSubcategories error:', err);
        res.status(500).json({ message: 'Failed to fetch subcategories' });
    }
};


// GET /api/user/professionals?category=Plumbing - list verified professionals, optionally filtered by category
exports.getProfessionals = async (req, res) => {
    try {
        const { category, latitude, longitude } = req.query;
        const params = [];
        let where = "WHERE p.verification_status = 'verified'";
        if (category) {
            params.push(category);
            where += ` AND p.category = $${params.length}`;
        }
        const query = `
                 SELECT p.id, p.full_name, p.category, p.experience_years, p.bio, p.city, p.state,
                     p.registered_latitude, p.registered_longitude,
                     p.current_latitude, p.current_longitude,
                     COALESCE(p.current_latitude, p.registered_latitude) AS effective_latitude,
                     COALESCE(p.current_longitude, p.registered_longitude) AS effective_longitude,
                     p.location_updated_at,
                     (SELECT COUNT(*)
                        FROM service_offers so
                        JOIN service_requests sr ON sr.id = so.request_id
                       WHERE so.professional_id = p.id AND sr.status = 'completed') AS completed_requests
            FROM professionals p
            ${where}
            ORDER BY experience_years DESC
        `;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('getProfessionals error:', err);
        res.status(500).json({ message: 'Failed to fetch professionals' });
    }
};

// POST /api/user/requests - create a new service request
exports.createRequest = async (req, res) => {
    try {
        const { title, description, requested_at, location, latitude, longitude, professional_id, category } = req.body;
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

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const categoryClause = "p.category = $1";

            const professionals = await client.query(
                                `SELECT p.id, p.full_name,
                                        p.registered_latitude, p.registered_longitude,
                                        p.current_latitude, p.current_longitude,
                                        COALESCE(p.current_latitude, p.registered_latitude) AS effective_latitude,
                                        COALESCE(p.current_longitude, p.registered_longitude) AS effective_longitude
                                 FROM professionals p
                                 WHERE ${categoryClause} AND p.verification_status = 'verified'
                                     AND ($2::bigint IS NULL OR p.id = $2)
                                     AND ($2::bigint IS NOT NULL OR (
                                         COALESCE(p.current_latitude, p.registered_latitude) IS NOT NULL AND
                                         COALESCE(p.current_longitude, p.registered_longitude) IS NOT NULL
                                     ))
                                     AND NOT EXISTS (
                                             SELECT 1
                                             FROM service_offers active_offer
                                             JOIN service_requests active_request ON active_request.id = active_offer.request_id
                                             WHERE active_offer.professional_id = p.id
                                                 AND active_offer.status = 'accepted'
                                                 AND active_request.status IN ('accepted', 'in_progress')
                                     )`,
                [category, professional_id && professional_id !== 'undefined' ? professional_id : null]
            );
            const userLatitude = Number(latitude);
            const userLongitude = Number(longitude);
            const nearbyProfessionals = professional_id && professional_id !== 'undefined'
                ? professionals.rows.map(p => ({ ...p, distance_km: null }))
                : professionals.rows.map(professional => {
                    const proLat = Number(professional.effective_latitude);
                    const proLng = Number(professional.effective_longitude);
                    if (!Number.isFinite(proLat) || !Number.isFinite(proLng)) return null;

                    const latitudeDelta = (proLat - userLatitude) * Math.PI / 180;
                    const longitudeDelta = (proLng - userLongitude) * Math.PI / 180;
                    const latitude1 = userLatitude * Math.PI / 180;
                    const latitude2 = proLat * Math.PI / 180;
                    const haversine = Math.sin(latitudeDelta / 2) ** 2
                        + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2;
                    const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
                    if (Number.isFinite(distanceKm) && distanceKm <= 15) {
                        return { ...professional, distance_km: Math.round(distanceKm * 10) / 10 };
                    }
                    return null;
                }).filter(Boolean);
            if (!nearbyProfessionals.length) {
                await client.query('ROLLBACK');
                return res.status(404).json({ message: 'No available professionals were found within a 15 km radius of your location. Professionals will receive new requests near their current location after completing their current jobs.' });
            }

            const result = await client.query(
                `INSERT INTO service_requests (customer_id, title, description, requested_at, location, latitude, longitude, photo_urls, video_url, voice_url, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending') RETURNING *`,
                [customerId, title, description || null, requested_at, location, Number.isFinite(Number(latitude)) ? latitude : null, Number.isFinite(Number(longitude)) ? longitude : null, photos, video, voice]
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
                distance_km: professional.distance_km,
                timestamp: new Date().toISOString()
            }));
            broadcast('service_request_created', {
                id: request.id,
                professional_count: nearbyProfessionals.length,
                status: request.status,
                timestamp: new Date().toISOString()
            });

            res.status(201).json({ message: `Request sent to ${nearbyProfessionals.length} nearby professionals`, request });
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
                    `SELECT sr.id, sr.title, sr.description, sr.requested_at, sr.location, sr.latitude, sr.longitude, sr.photo_urls, sr.video_url, sr.voice_url, sr.status, sr.journey_status, sr.journey_updated_at, sr.created_at, sr.otp, sr.wage, sr.wage_description, sr.payment_status,
                        offer_summary.offer_count,
                        offer_summary.pending_offer_count,
                    p.full_name AS professional_name,
                    p.current_latitude AS professional_latitude,
                    p.current_longitude AS professional_longitude,
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

// POST /api/user/requests/:id/review - review a paid service
exports.createReview = async (req, res) => {
    const customerId = req.user.id;
    const requestId = Number(req.params.id);
    const rating = Number(req.body.rating);
    const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : null;

    if (!Number.isInteger(requestId) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'A rating from 1 to 5 is required' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO professional_reviews (request_id, customer_id, professional_id, rating, comment)
             SELECT sr.id, sr.customer_id, accepted_offer.professional_id, $3, $4
             FROM service_requests sr
             JOIN LATERAL (
                 SELECT professional_id
                 FROM service_offers
                 WHERE request_id = sr.id AND status = 'accepted'
                 LIMIT 1
             ) accepted_offer ON true
             WHERE sr.id = $1 AND sr.customer_id = $2
               AND sr.payment_status = 'paid'
               AND sr.status = 'completed'
             ON CONFLICT (request_id) DO NOTHING
             RETURNING id, request_id, rating, comment, created_at`,
            [requestId, customerId, rating, comment || null]
        );

        if (!result.rows.length) {
            return res.status(409).json({ message: 'This service is not eligible for review or has already been reviewed' });
        }

        broadcast('review_submitted', {
            id: result.rows[0].id,
            request_id: requestId,
            rating: result.rows[0].rating,
            timestamp: new Date().toISOString()
        });
        res.status(201).json({ message: 'Review submitted successfully', review: result.rows[0] });
    } catch (err) {
        console.error('createReview error:', err);
        res.status(500).json({ message: 'Failed to submit review' });
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

        const completedRequest = result.rows[0];

        // Update the professional's current location to the completed service location
        if (Number.isFinite(Number(completedRequest.latitude)) && Number.isFinite(Number(completedRequest.longitude))) {
            await pool.query(
                `UPDATE professionals p
                 SET current_latitude = $1,
                     current_longitude = $2,
                     location_updated_at = CURRENT_TIMESTAMP
                 FROM service_offers so
                 WHERE so.request_id = $3
                   AND so.status = 'accepted'
                   AND p.id = so.professional_id`,
                [completedRequest.latitude, completedRequest.longitude, requestId]
            );
        }

        const { broadcast: broadcastSse } = require('../utils/sseClients');
        broadcastSse('payment_confirmed', {
            id: requestId,
            customer_id: customerId,
            payment_status: 'paid',
            timestamp: new Date().toISOString()
        });

        res.json({ message: 'Payment confirmed successfully', request: completedRequest });
    } catch (err) {
        console.error('confirmPayment error:', err);
        res.status(500).json({ message: 'Failed to confirm payment' });
    }
};

// GET /api/user/notifications - get all notifications for the logged in user
exports.getNotifications = async (req, res) => {
    try {
        const customerId = req.user.id;
        const { limit, offset, unreadOnly } = req.query;

        const notifications = await getNotificationsByUserId(customerId, {
            limit: limit ? parseInt(limit) : 50,
            offset: offset ? parseInt(offset) : 0,
            unreadOnly: unreadOnly === 'true'
        });

        const unreadCount = await getUnreadCount(customerId);

        res.json({ notifications, unreadCount });
    } catch (err) {
        console.error('getNotifications error:', err);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
};

// GET /api/user/notifications/unread-count - get unread notification count
exports.getUnreadNotificationCount = async (req, res) => {
    try {
        const customerId = req.user.id;
        const unreadCount = await getUnreadCount(customerId);
        res.json({ unreadCount });
    } catch (err) {
        console.error('getUnreadNotificationCount error:', err);
        res.status(500).json({ message: 'Failed to fetch unread count' });
    }
};

// PATCH /api/user/notifications/:id/read - mark a notification as read
exports.markNotificationAsRead = async (req, res) => {
    try {
        const customerId = req.user.id;
        const notificationId = Number(req.params.id);

        if (!Number.isInteger(notificationId)) {
            return res.status(400).json({ message: 'Invalid notification ID' });
        }

        const notification = await markAsRead(notificationId, customerId);
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json({ message: 'Notification marked as read', notification });
    } catch (err) {
        console.error('markNotificationAsRead error:', err);
        res.status(500).json({ message: 'Failed to mark notification as read' });
    }
};

// PATCH /api/user/notifications/read-all - mark all notifications as read
exports.markAllNotificationsAsRead = async (req, res) => {
    try {
        const customerId = req.user.id;
        await markAllAsRead(customerId);
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        console.error('markAllNotificationsAsRead error:', err);
        res.status(500).json({ message: 'Failed to mark all notifications as read' });
    }
};

// DELETE /api/user/notifications/:id - delete a notification
exports.deleteNotification = async (req, res) => {
    try {
        const customerId = req.user.id;
        const notificationId = Number(req.params.id);

        if (!Number.isInteger(notificationId)) {
            return res.status(400).json({ message: 'Invalid notification ID' });
        }

        const deleted = await deleteNotification(notificationId, customerId);
        if (!deleted) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json({ message: 'Notification deleted' });
    } catch (err) {
        console.error('deleteNotification error:', err);
        res.status(500).json({ message: 'Failed to delete notification' });
    }
};
