const express = require("express");
const { 
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
    getLocationPricing,
    createLocationPricing,
    updateLocationPricing,
    toggleLocationPricingStatus,
    deleteLocationPricing,
    getPricingLocations,
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
    getPricingAuditLogs
} = require("../controllers/adminController");
const { addClient, removeClient } = require("../utils/sseClients");

const router = express.Router();

router.get("/dashboard", getDashboard);
router.get("/users", getUsers);
router.get("/verifications", getPendingVerifications);
router.get("/verifications/history", getAllVerifications);
router.post("/verifications/:id/approve", approveProfessional);
router.post("/verifications/:id/reject", rejectProfessional);
router.get("/professionals", getVerifiedProfessionals);
router.get("/categories", getCategories);
router.patch("/categories/:id/price", updateCategoryPrice);
router.put("/categories/:id/price", updateCategoryPrice);
router.patch("/subcategories/:id/price", updateSubcategoryPrice);
router.put("/subcategories/:id/price", updateSubcategoryPrice);
router.get("/service-requests", getServiceRequests);
router.get("/reviews", getReviews);

// Location Management routes - specific paths BEFORE parameterized :id routes
router.get("/locations/stats", getLocationStats);
router.post("/locations/import", importLocations);
router.get("/locations", getLocations);
router.post("/locations", createLocation);
router.put("/locations/:id", updateLocation);
router.delete("/locations/:id", deleteLocation);
router.patch("/locations/:id/toggle", toggleLocationActive);

// Hierarchical Location-Based Pricing System routes
router.get("/pricing/base-rates", getBaseRates);
router.post("/pricing/base-rates", saveBaseRate);

router.get("/pricing/adjustments", getAdjustments);
router.post("/pricing/adjustments", saveAdjustment);
router.patch("/pricing/adjustments/:id/toggle", toggleAdjustmentActive);
router.delete("/pricing/adjustments/:id", deleteAdjustment);
router.post("/pricing/adjustments/bulk", bulkApplyAdjustments);

router.get("/pricing/overrides", getManualOverrides);
router.post("/pricing/overrides", saveManualOverride);
router.patch("/pricing/overrides/:id/toggle", toggleManualOverrideActive);
router.delete("/pricing/overrides/:id", deleteManualOverride);

router.get("/pricing/travel-rules", getTravelRules);
router.post("/pricing/travel-rules", saveTravelRule);

router.post("/pricing/preview", previewPriceCalculation);
router.get("/pricing/recommendations", getWageRecommendations);
router.get("/pricing/benchmarks/diagnostics", getWageBenchmarkDiagnostics);
router.get("/pricing/benchmarks/config", getWageBenchmarkConfig);
router.post("/pricing/benchmarks/config", updateWageBenchmarkConfig);
router.get("/pricing/audit-logs", getPricingAuditLogs);

// Legacy/Compatibility routes
router.get("/pricing", getLocationPricing);
router.post("/pricing", createLocationPricing);
router.put("/pricing/:id", updateLocationPricing);
router.patch("/pricing/:id", updateLocationPricing);
router.patch("/pricing/:id/toggle", toggleLocationPricingStatus);
router.delete("/pricing/:id", deleteLocationPricing);
router.get("/pricing/locations", getPricingLocations);

// SSE stream – admin panel subscribes here for real-time notifications
router.get("/notifications/stream", (req, res) => {
    res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",   // disable nginx buffering if behind a proxy
    });
    res.flushHeaders();

    // Send a heartbeat comment every 20 s to keep the connection alive
    const heartbeat = setInterval(() => {
        try { res.write(": heartbeat\n\n"); } catch { clearInterval(heartbeat); }
    }, 20_000);

    addClient(res);

    req.on("close", () => {
        clearInterval(heartbeat);
        removeClient(res);
    });
});

module.exports = router;
