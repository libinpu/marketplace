export const API_URL = import.meta.env.DEV
    ? "http://localhost:5000/api"
    : "https://service-marketplace-af7p.onrender.com/api";

export const getDashboard = async () => {
    const response = await fetch(`${API_URL}/admin/dashboard`);
    if (!response.ok) throw new Error("Failed to load dashboard");
    return response.json();
};

export const getAdminCategories = async () => {
    const res = await fetch(`${API_URL}/admin/categories`);
    if (!res.ok) throw new Error('Failed to load categories');
    return res.json();
};

// ─────────────────────────────────────────────────────────────
// 1. LOCATION MANAGEMENT APIS
// ─────────────────────────────────────────────────────────────

export const getAdminLocations = async (params = {}) => {
    const query = new URLSearchParams();
    if (params.district && params.district !== 'all') query.append('district', params.district);
    if (params.location_type && params.location_type !== 'all') query.append('location_type', params.location_type);
    if (params.verification_status && params.verification_status !== 'all') query.append('verification_status', params.verification_status);
    if (params.is_active !== undefined && params.is_active !== 'all') query.append('is_active', params.is_active);
    if (params.search) query.append('search', params.search);

    const res = await fetch(`${API_URL}/admin/locations?${query.toString()}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load locations');
    }
    return res.json();
};

export const createAdminLocation = async (data) => {
    const res = await fetch(`${API_URL}/admin/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || 'Failed to save location');
    return result;
};

export const updateAdminLocation = async (id, data) => {
    const res = await fetch(`${API_URL}/admin/locations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || 'Failed to update location');
    return result;
};

export const deleteAdminLocation = async (id) => {
    const res = await fetch(`${API_URL}/admin/locations/${id}`, {
        method: 'DELETE'
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || 'Failed to delete location');
    return result;
};

export const toggleAdminLocation = async (id) => {
    const res = await fetch(`${API_URL}/admin/locations/${id}/toggle`, {
        method: 'PATCH'
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || 'Failed to toggle location status');
    return result;
};

export const getAdminLocationStats = async () => {
    const res = await fetch(`${API_URL}/admin/locations/stats`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load location stats');
    }
    return res.json();
};

export const importAdminLocations = async (locations) => {
    const res = await fetch(`${API_URL}/admin/locations/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations })
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || 'Failed to import locations');
    return result;
};

// ─────────────────────────────────────────────────────────────
// 2. BASE LABOUR RATES APIS
// ─────────────────────────────────────────────────────────────

export const getBaseRates = async () => {
    const res = await fetch(`${API_URL}/admin/pricing/base-rates`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load base rates');
    }
    return res.json();
};

export const saveBaseRate = async (data) => {
    const res = await fetch(`${API_URL}/admin/pricing/base-rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || 'Failed to save base rate');
    return result;
};

// ─────────────────────────────────────────────────────────────
// 3. LOCATION ADJUSTMENTS APIS
// ─────────────────────────────────────────────────────────────

export const getAdjustments = async (params = {}) => {
    const query = new URLSearchParams();
    if (params.district && params.district !== 'all') query.append('district', params.district);
    if (params.city && params.city !== 'all') query.append('city', params.city);
    if (params.category_id && params.category_id !== 'all') query.append('category_id', params.category_id);

    const res = await fetch(`${API_URL}/admin/pricing/adjustments?${query.toString()}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load adjustments');
    }
    return res.json();
};

export const saveAdjustment = async (data) => {
    const res = await fetch(`${API_URL}/admin/pricing/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || 'Failed to save adjustment');
    return result;
};

export const deleteAdjustment = async (id) => {
    const res = await fetch(`${API_URL}/admin/pricing/adjustments/${id}`, {
        method: 'DELETE'
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
        const error = new Error(result.message || 'Failed to delete adjustment');
        error.status = res.status;
        throw error;
    }
    return result;
};

export const toggleAdjustment = async (id) => {
    const res = await fetch(`${API_URL}/admin/pricing/adjustments/${id}/toggle`, {
        method: 'PATCH'
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || 'Failed to toggle adjustment status');
    return result;
};

export const bulkApplyAdjustments = async (data) => {
    const res = await fetch(`${API_URL}/admin/pricing/adjustments/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || 'Failed to bulk apply adjustments');
    return result;
};

// ─────────────────────────────────────────────────────────────
// 4. EXACT MANUAL OVERRIDES APIS
// ─────────────────────────────────────────────────────────────

export const getManualOverrides = async (params = {}) => {
    const query = new URLSearchParams();
    if (params.district && params.district !== 'all') query.append('district', params.district);
    if (params.city && params.city !== 'all') query.append('city', params.city);
    if (params.category_id && params.category_id !== 'all') query.append('category_id', params.category_id);

    const res = await fetch(`${API_URL}/admin/pricing/overrides?${query.toString()}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load manual overrides');
    }
    return res.json();
};

export const saveManualOverride = async (data) => {
    const res = await fetch(`${API_URL}/admin/pricing/overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || 'Failed to save manual override');
    return result;
};

export const deleteManualOverride = async (id) => {
    const res = await fetch(`${API_URL}/admin/pricing/overrides/${id}`, {
        method: 'DELETE'
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || 'Failed to delete override');
    return result;
};

export const toggleManualOverride = async (id) => {
    const res = await fetch(`${API_URL}/admin/pricing/overrides/${id}/toggle`, {
        method: 'PATCH'
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || 'Failed to toggle override status');
    return result;
};

// ─────────────────────────────────────────────────────────────
// 5. TRAVEL PRICING RULES APIS
// ─────────────────────────────────────────────────────────────

export const getTravelRules = async () => {
    const res = await fetch(`${API_URL}/admin/pricing/travel-rules`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load travel rules');
    }
    return res.json();
};

export const saveTravelRule = async (data) => {
    const res = await fetch(`${API_URL}/admin/pricing/travel-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || 'Failed to save travel rule');
    return result;
};

// ─────────────────────────────────────────────────────────────
// 6. PRICING PREVIEW & SIMULATION API
// ─────────────────────────────────────────────────────────────

export const previewPriceCalculation = async (data) => {
    const res = await fetch(`${API_URL}/admin/pricing/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || 'Failed to calculate preview');
    return result;
};

// ─────────────────────────────────────────────────────────────
// 7. WAGE RECOMMENDATIONS API
// ─────────────────────────────────────────────────────────────

export const getWageRecommendations = async (params = {}) => {
    const query = new URLSearchParams();
    if (params.category_id) query.append('category_id', params.category_id);
    if (params.district) query.append('district', params.district);
    if (params.city) query.append('city', params.city);

    const res = await fetch(`${API_URL}/admin/pricing/recommendations?${query.toString()}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load wage recommendations');
    }
    return res.json();
};

export const getWageBenchmarkDiagnostics = async () => {
    const res = await fetch(`${API_URL}/admin/pricing/benchmarks/diagnostics`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load benchmark diagnostics');
    }
    return res.json();
};

export const getWageBenchmarkConfig = async () => {
    const res = await fetch(`${API_URL}/admin/pricing/benchmarks/config`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load benchmark configuration');
    }
    return res.json();
};

export const updateWageBenchmarkConfig = async (config) => {
    const res = await fetch(`${API_URL}/admin/pricing/benchmarks/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update benchmark configuration');
    }
    return res.json();
};


// ─────────────────────────────────────────────────────────────
// 8. PRICING AUDIT LOGS API
// ─────────────────────────────────────────────────────────────

export const getPricingAuditLogs = async (params = {}) => {
    const query = new URLSearchParams();
    if (params.entity_type && params.entity_type !== 'all') query.append('entity_type', params.entity_type);
    if (params.limit) query.append('limit', params.limit);

    const res = await fetch(`${API_URL}/admin/pricing/audit-logs?${query.toString()}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load audit logs');
    }
    return res.json();
};

// ─────────────────────────────────────────────────────────────
// BACKWARD-COMPATIBILITY EXPORTS
// ─────────────────────────────────────────────────────────────

export const getLocationPricing = async (params = {}) => {
    const query = new URLSearchParams();
    if (params.district && params.district !== 'all') query.append('district', params.district);
    if (params.city && params.city !== 'all') query.append('city', params.city);
    if (params.category_id && params.category_id !== 'all') query.append('category_id', params.category_id);
    if (params.is_active !== undefined && params.is_active !== 'all') query.append('is_active', params.is_active);
    if (params.search) query.append('search', params.search);

    const res = await fetch(`${API_URL}/admin/pricing?${query.toString()}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load location pricing');
    }
    return res.json();
};

export const createLocationPricing = async (data) => {
    const res = await fetch(`${API_URL}/admin/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || 'Failed to create pricing record');
    return result;
};

export const updateLocationPricing = async (id, data) => {
    const res = await fetch(`${API_URL}/admin/pricing/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || 'Failed to update pricing record');
    return result;
};

export const toggleLocationPricingStatus = async (id) => {
    const res = await fetch(`${API_URL}/admin/pricing/${id}/toggle`, {
        method: 'PATCH'
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || 'Failed to toggle status');
    return result;
};

export const deleteLocationPricing = async (id) => {
    const res = await fetch(`${API_URL}/admin/pricing/${id}`, {
        method: 'DELETE'
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || 'Failed to delete pricing record');
    return result;
};

export const getPricingLocations = async () => {
    const res = await fetch(`${API_URL}/admin/pricing/locations`);
    if (!res.ok) throw new Error('Failed to load pricing locations');
    return res.json();
};