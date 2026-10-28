import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  MapPin,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  IndianRupee,
  AlertCircle,
  ArrowUpDown,
  Building,
  Check,
  X,
  SlidersHorizontal,
  Layers,
  Sparkles,
  Calculator,
  Compass,
  FileSpreadsheet,
  History,
  TrendingUp,
  AlertTriangle,
  Upload,
  Download,
  ToggleLeft,
  ToggleRight,
  BarChart2,
  ShieldAlert,
  Settings
} from "lucide-react";
import {
  getAdminLocations,
  createAdminLocation,
  updateAdminLocation,
  deleteAdminLocation,
  toggleAdminLocation,
  getAdminLocationStats,
  importAdminLocations,
  getBaseRates,
  saveBaseRate,
  getAdjustments,
  saveAdjustment,
  deleteAdjustment,
  toggleAdjustment,
  bulkApplyAdjustments,
  getManualOverrides,
  saveManualOverride,
  deleteManualOverride,
  toggleManualOverride,
  getTravelRules,
  saveTravelRule,
  previewPriceCalculation,
  getWageRecommendations,
  getWageBenchmarkDiagnostics,
  getWageBenchmarkConfig,
  updateWageBenchmarkConfig,
  getPricingAuditLogs,
  getAdminCategories
} from "../services/api";

const KERALA_DISTRICTS = [
  "Alappuzha",
  "Ernakulam",
  "Idukki",
  "Kannur",
  "Kasaragod",
  "Kollam",
  "Kottayam",
  "Kozhikode",
  "Malappuram",
  "Palakkad",
  "Pathanamthitta",
  "Thiruvananthapuram",
  "Thrissur",
  "Wayanad"
];

const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

export default function LocationPricing() {
  // Navigation tabs for the 8 sections
  const [activeTab, setActiveTab] = useState("locations");

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // Location stats for accurate header counts
  const [locationStats, setLocationStats] = useState(null);

  // Data states
  const [locations, setLocations] = useState([]);
  const [baseRates, setBaseRates] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [travelRules, setTravelRules] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Error state per tab (so one failing tab does not hide others)
  const [dataErrors, setDataErrors] = useState({});

  // Filters
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Debounced search trigger
  const searchTimer = useRef(null);
  const handleSearchChange = (val) => {
    setSearchQuery(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadLocations(selectedDistrict, val, showInactive), 400);
  };

  // Modals & Forms
  const EMPTY_LOC = { open: false, isEdit: false, id: null, district: "Kottayam", city: "", locality: "", pincode: "", location_type: "town", verification_status: "verified" };
  const [locModal, setLocModal] = useState(EMPTY_LOC);
  const [locFormError, setLocFormError] = useState("");

  const [baseRateModal, setBaseRateModal] = useState({ open: false, category_id: "", base_price: "", notes: "" });
  const [adjModal, setAdjModal] = useState({ open: false, district: "Kottayam", city: "", locality: "", category_id: "", adjustment_type: "percentage", adjustment_value: 0, notes: "" });
  const [bulkModal, setBulkModal] = useState({ open: false, district: "all", category_id: "", adjustment_type: "percentage", adjustment_value: 0, notes: "" });
  const [overrideModal, setOverrideModal] = useState({ open: false, district: "Kottayam", city: "", locality: "", category_id: "", exact_price: "", reason: "" });
  const [travelModal, setTravelModal] = useState({ open: false, rule_name: "Standard Travel Rule", district: "", fixed_visit_fee: 0, free_radius_km: 5, per_km_rate: 10, min_fee: 0, max_fee: 300 });

  // Simulation & Preview State
  const [simForm, setSimForm] = useState({
    district: "Kottayam",
    city: "Kottayam",
    category_id: "",
    locality: "",
    distance_km: 8
  });
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // CSV Import / Export State
  const [csvText, setCsvText] = useState("");
  const [importStatus, setImportStatus] = useState("");

  // Benchmark Intelligence Diagnostics & Config State
  const [benchmarkDiagnostics, setBenchmarkDiagnostics] = useState(null);
  const [benchmarkConfig, setBenchmarkConfig] = useState({
    min_sample_threshold: 3,
    max_data_age_days: 365,
    target_wage_type: "service_charge",
    require_verified_only: true
  });
  const [configSaving, setConfigSaving] = useState(false);

  // Confirm delete modal (supports 'location', 'adjustment', 'override')
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: "location", id: null, name: "" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
  };

  // Load only locations (used for filter/search changes)
  const loadLocations = async (district = selectedDistrict, search = searchQuery, inactive = showInactive) => {
    try {
      const locs = await getAdminLocations({
        district,
        search,
        ...(inactive ? {} : { is_active: 'true' })
      });
      setLocations(Array.isArray(locs) ? locs : []);
      setDataErrors(e => ({ ...e, locations: null }));
    } catch (err) {
      setDataErrors(e => ({ ...e, locations: err.message }));
      setLocations([]);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    const errors = {};
    try {
      const [cats, stats, locs, bases, adjs, ovrs, travels, audits, diag, bCfg] = await Promise.allSettled([
        getAdminCategories(),
        getAdminLocationStats(),
        getAdminLocations({ district: selectedDistrict, search: searchQuery, ...(showInactive ? {} : { is_active: 'true' }) }),
        getBaseRates(),
        getAdjustments({ district: selectedDistrict, category_id: selectedCategory }),
        getManualOverrides({ district: selectedDistrict, category_id: selectedCategory }),
        getTravelRules(),
        getPricingAuditLogs({ limit: 50 }),
        getWageBenchmarkDiagnostics(),
        getWageBenchmarkConfig()
      ]);

      if (cats.status === 'fulfilled') setCategories(cats.value);
      else errors.categories = cats.reason?.message;

      if (stats.status === 'fulfilled') setLocationStats(stats.value);
      else errors.stats = stats.reason?.message;

      if (locs.status === 'fulfilled') setLocations(Array.isArray(locs.value) ? locs.value : []);
      else { errors.locations = locs.reason?.message; setLocations([]); }

      if (bases.status === 'fulfilled') setBaseRates(Array.isArray(bases.value) ? bases.value : []);
      else { errors.baseRates = bases.reason?.message; setBaseRates([]); }

      if (adjs.status === 'fulfilled') setAdjustments(Array.isArray(adjs.value) ? adjs.value : []);
      else { errors.adjustments = adjs.reason?.message; setAdjustments([]); }

      if (ovrs.status === 'fulfilled') setOverrides(Array.isArray(ovrs.value) ? ovrs.value : []);
      else { errors.overrides = ovrs.reason?.message; setOverrides([]); }

      if (travels.status === 'fulfilled') setTravelRules(Array.isArray(travels.value) ? travels.value : []);
      else { errors.travel = travels.reason?.message; setTravelRules([]); }

      if (audits.status === 'fulfilled') setAuditLogs(Array.isArray(audits.value) ? audits.value : []);
      else { errors.audit = audits.reason?.message; setAuditLogs([]); }

      if (diag.status === 'fulfilled') setBenchmarkDiagnostics(diag.value);
      else errors.benchmarks = diag.reason?.message;

      if (bCfg.status === 'fulfilled') setBenchmarkConfig(bCfg.value);

      setDataErrors(errors);
      if (Object.keys(errors).length > 0) {
        console.error('Some tabs failed to load:', errors);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBenchmarkConfig = async (e) => {
    e.preventDefault();
    setConfigSaving(true);
    try {
      const res = await updateWageBenchmarkConfig(benchmarkConfig);
      setBenchmarkConfig(res.config);
      showToast("Benchmark evidence threshold updated successfully");
      const diag = await getWageBenchmarkDiagnostics();
      setBenchmarkDiagnostics(diag);
    } catch (err) {
      showToast(err.message || "Failed to update threshold", "error");
    } finally {
      setConfigSaving(false);
    }
  };


  useEffect(() => {
    loadAllData();
  }, [selectedDistrict, selectedCategory, showInactive]);

  // Handle Simulation Calculation
  const handleRunSimulation = async () => {
    if (!simForm.category_id) {
      showToast("Please choose a category to simulate", "error");
      return;
    }
    setSimLoading(true);
    try {
      const res = await previewPriceCalculation({
        category_id: simForm.category_id,
        district: simForm.district,
        city: simForm.city,
        locality: simForm.locality,
        service_lat: 9.5916,
        service_lon: 76.5222,
        provider_lat: 9.5916 + (Number(simForm.distance_km || 0) * 0.009),
        provider_lon: 76.5222
      });
      setSimResult(res);
    } catch (err) {
      showToast(err.message || "Simulation failed", "error");
    } finally {
      setSimLoading(false);
    }
  };

  // Location CRUD actions
  const handleSaveLocation = async (e) => {
    e.preventDefault();
    setLocFormError("");

    // Validate required fields
    const cityNorm = locModal.city.trim();
    if (!cityNorm) {
      setLocFormError("City / Town / Area Name is required.");
      return;
    }
    // Validate pincode if provided (Indian format: 6 digits, no leading 0)
    if (locModal.pincode.trim() && !PINCODE_REGEX.test(locModal.pincode.trim())) {
      setLocFormError("Pincode must be a 6-digit Indian postal code (e.g. 686001).");
      return;
    }
    // Coordinates: only accept if both lat and lon are provided together
    if ((locModal.latitude && !locModal.longitude) || (!locModal.latitude && locModal.longitude)) {
      setLocFormError("Provide both latitude and longitude, or neither.");
      return;
    }

    try {
      if (locModal.isEdit) {
        await updateAdminLocation(locModal.id, locModal);
        showToast("Location updated successfully");
      } else {
        await createAdminLocation(locModal);
        showToast(`${cityNorm}, ${locModal.district} added to directory`);
      }
      setLocModal(EMPTY_LOC);
      setLocFormError("");
      // Reload both locations and stats
      await Promise.all([loadAllData()]);
    } catch (err) {
      // Surface duplicate/backend errors in the form instead of toast so they are visible
      setLocFormError(err.message || "Failed to save location.");
    }
  };

  // Delete item (location, adjustment, or override) with confirm dialog
  const handleDeleteItem = async () => {
    const { type, id, name } = deleteConfirm;
    if (!id) return;
    try {
      if (type === "adjustment") {
        await deleteAdjustment(id);
        showToast(`Adjustment deleted successfully`);
      } else if (type === "override") {
        await deleteManualOverride(id);
        showToast(`Override deleted successfully`);
      } else {
        await deleteAdminLocation(id);
        showToast(`Location deleted`);
      }
      setDeleteConfirm({ open: false, type: "location", id: null, name: "" });
      loadAllData();
    } catch (err) {
      if (err.status === 404 || err.message?.toLowerCase().includes("not found")) {
        showToast(`Item was already deleted or no longer exists. List refreshed.`, "error");
        setDeleteConfirm({ open: false, type: "location", id: null, name: "" });
        loadAllData();
      } else {
        showToast(err.message || `Failed to delete ${type}`, "error");
      }
    }
  };

  // Toggle active status
  const handleToggleActive = async (loc) => {
    try {
      const res = await toggleAdminLocation(loc.id);
      showToast(res.message);
      loadAllData();
    } catch (err) {
      showToast(err.message || "Failed to update status", "error");
    }
  };

  // Base Rate Save
  const handleSaveBaseRate = async (e) => {
    e.preventDefault();
    try {
      await saveBaseRate(baseRateModal);
      showToast("Category base rate saved");
      setBaseRateModal({ open: false, category_id: "", base_price: "", notes: "" });
      loadAllData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Adjustment Save
  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    try {
      await saveAdjustment(adjModal);
      showToast("Location adjustment saved");
      setAdjModal({ open: false, district: "Kottayam", city: "", locality: "", category_id: "", adjustment_type: "percentage", adjustment_value: 0, notes: "" });
      loadAllData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleToggleAdjustment = async (id) => {
    try {
      const res = await toggleAdjustment(id);
      showToast(res.message);
      loadAllData();
    } catch (err) {
      showToast(err.message || "Failed to update adjustment status", "error");
    }
  };

  // Bulk Adjustment
  const handleBulkApply = async (e) => {
    e.preventDefault();
    try {
      await bulkApplyAdjustments(bulkModal);
      showToast("Bulk adjustments applied successfully");
      setBulkModal({ open: false, district: "all", category_id: "", adjustment_type: "percentage", adjustment_value: 0, notes: "" });
      loadAllData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Manual Override Save
  const handleSaveOverride = async (e) => {
    e.preventDefault();
    try {
      await saveManualOverride(overrideModal);
      showToast("Manual price override saved");
      setOverrideModal({ open: false, district: "Kottayam", city: "", locality: "", category_id: "", exact_price: "", reason: "" });
      loadAllData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleToggleOverride = async (id) => {
    try {
      const res = await toggleManualOverride(id);
      showToast(res.message);
      loadAllData();
    } catch (err) {
      showToast(err.message || "Failed to update override status", "error");
    }
  };

  // Travel Rule Save
  const handleSaveTravelRule = async (e) => {
    e.preventDefault();
    try {
      await saveTravelRule(travelModal);
      showToast("Travel pricing rule saved");
      setTravelModal({ open: false, rule_name: "Standard Travel Rule", district: "", fixed_visit_fee: 0, free_radius_km: 5, per_km_rate: 10, min_fee: 0, max_fee: 300 });
      loadAllData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // CSV Import
  const handleImportCsv = async () => {
    if (!csvText.trim()) {
      showToast("Please paste CSV data with columns: district, city, locality, pincode, location_type", "error");
      return;
    }
    try {
      const lines = csvText.trim().split("\n");
      const parsed = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
        if (parts[0] && parts[1]) {
          parsed.push({
            district: parts[0],
            city: parts[1],
            locality: parts[2] || null,
            pincode: parts[3] || null,
            location_type: parts[4] || "town"
          });
        }
      }
      const res = await importAdminLocations(parsed);
      setImportStatus(res.message);
      showToast(res.message);
      setCsvText("");
      loadAllData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // CSV Export Template
  const handleExportCsv = () => {
    const headers = "district,city,locality,pincode,location_type,latitude,longitude,verification_status\n";
    const rows = locations.map((l) => `"${l.district}","${l.city}","${l.locality || ""}","${l.pincode || ""}","${l.location_type || "town"}","${l.latitude || ""}","${l.longitude || ""}","${l.verification_status}"`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kerala_locations_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="pricing-management-page" style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
      {/* Toast */}
      {toast.show && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          background: toast.type === "error" ? "#EF4444" : "#10B981",
          color: "#fff",
          padding: "12px 20px",
          borderRadius: 10,
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          zIndex: 9999,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 8
        }}>
          {toast.type === "error" ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-main)", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <MapPin color="#0D9488" size={28} /> Kerala Location-Based Pricing System
          </h1>
          <p style={{ color: "var(--text-muted)", margin: "4px 0 0 0", fontSize: 14 }}>
            {locationStats
              ? `${locationStats.verified} verified service areas across ${locationStats.districts} districts · ${locationStats.active} active, ${locationStats.inactive} inactive · base labour rates, adjustments, overrides & travel pricing`
              : loading
                ? "Loading service area data…"
                : "Scalable hierarchical pricing engine for Kerala"}
          </p>
        </div>
        <button
          onClick={loadAllData}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#F1F5F9",
            border: "1px solid #CBD5E1",
            padding: "8px 14px",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600
          }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Section Tabs */}
      <div style={{ display: "flex", gap: 8, borderBottom: "2px solid #E2E8F0", paddingBottom: 10, marginBottom: 24, overflowX: "auto" }}>
        {[
          { id: "locations", label: "Locations Directory", icon: Building, count: locations.length },
          { id: "baseRates", label: "Category Base Rates", icon: Layers, count: baseRates.length },
          { id: "adjustments", label: "Location Adjustments", icon: SlidersHorizontal, count: adjustments.length },
          { id: "overrides", label: "Exact Overrides", icon: Sparkles, count: overrides.length },
          { id: "travel", label: "Travel Pricing", icon: Compass, count: travelRules.length },
          { id: "benchmarks", label: "Wage Intelligence", icon: BarChart2, count: benchmarkDiagnostics?.total_benchmarks_in_db ?? 0 },
          { id: "preview", label: "Preview & Simulator", icon: Calculator },
          { id: "importExport", label: "CSV Import / Export", icon: FileSpreadsheet },
          { id: "audit", label: "Pricing Audit History", icon: History, count: auditLogs.length }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: active ? "#0D9488" : "transparent",
                color: active ? "#fff" : "var(--text-main)",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s"
              }}
            >
              <Icon size={16} />
              {tab.label}
              {tab.count !== undefined && (
                <span style={{
                  fontSize: 11,
                  background: active ? "rgba(255,255,255,0.25)" : "#E2E8F0",
                  color: active ? "#fff" : "#475569",
                  padding: "1px 6px",
                  borderRadius: 999
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters Bar for Directory & Lists */}
      {["locations", "adjustments", "overrides"].includes(activeTab) && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", background: "#fff", border: "1px solid #CBD5E1", borderRadius: 8, padding: "6px 12px", width: 260 }}>
            <Search size={16} color="#64748B" />
            <input
              type="text"
              placeholder="Search by city, town or district..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{ border: "none", outline: "none", paddingLeft: 8, width: "100%", fontSize: 13 }}
            />
          </div>

          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, background: "#fff" }}
          >
            <option value="all">All Kerala Districts</option>
            {KERALA_DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Show inactive toggle – only for Locations tab */}
          {activeTab === "locations" && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "#475569", userSelect: "none" }}>
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                style={{ accentColor: "#0D9488" }}
              />
              Show inactive
            </label>
          )}

          {activeTab !== "locations" && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, background: "#fff" }}
            >
              <option value="all">All Service Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* TAB 1: LOCATIONS DIRECTORY */}
      {activeTab === "locations" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
            <span style={{ fontSize: 14, color: "#64748B", fontWeight: 600 }}>
              {loading ? "Loading…" : `Showing ${locations.length} ${showInactive ? "" : "active "}configured Kerala locations`}
              {locationStats && !loading && (
                <span style={{ color: "#94A3B8", fontWeight: 400, marginLeft: 8 }}>
                  ({locationStats.total} total in database)
                </span>
              )}
            </span>
            <button
              onClick={() => setLocModal({ ...EMPTY_LOC, open: true })}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "#0D9488", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
            >
              <Plus size={16} /> Add Location
            </button>
          </div>

          {/* Error banner */}
          {dataErrors.locations && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 16px", marginBottom: 12, color: "#B91C1C", display: "flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={16} />
              <span>Could not load locations: {dataErrors.locations}. Is the backend server running on localhost:5000?</span>
            </div>
          )}

          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                <tr>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>ID</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>District</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>City / Town / Area</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Type</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Pincode</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Coordinates</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Active</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Verified</th>
                  <th style={{ padding: "12px 16px", color: "#475569", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={9} style={{ textAlign: "center", padding: 32, color: "#94A3B8" }}>Loading locations…</td></tr>
                )}
                {!loading && locations.length === 0 && !dataErrors.locations && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>
                      <Building size={36} style={{ margin: "0 auto 10px", display: "block", opacity: 0.3 }} />
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>No locations found</div>
                      <div style={{ fontSize: 12 }}>
                        {searchQuery || selectedDistrict !== "all"
                          ? "Try clearing the search or district filter."
                          : "Use \"Add Location\" to add a service area, or import via CSV."}
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && locations.map((loc) => (
                  <tr key={loc.id} style={{ borderBottom: "1px solid #F1F5F9", opacity: loc.is_active ? 1 : 0.55 }}>
                    <td style={{ padding: "12px 16px", color: "#94A3B8" }}>#{loc.id}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>{loc.district}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: "#0F172A" }}>
                      {loc.city}
                      {loc.locality && <span style={{ color: "#64748B", fontWeight: 400, marginLeft: 6 }}>({loc.locality})</span>}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ textTransform: "capitalize", background: "#F1F5F9", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                        {loc.location_type}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748B" }}>{loc.pincode || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "#64748B", fontSize: 12 }}>
                      {loc.latitude && loc.longitude ? `${Number(loc.latitude).toFixed(4)}, ${Number(loc.longitude).toFixed(4)}` : "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        background: loc.is_active ? "#DCFCE7" : "#F1F5F9",
                        color: loc.is_active ? "#166534" : "#64748B",
                        padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700
                      }}>
                        {loc.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        background: loc.verification_status === "verified" ? "#DCFCE7" : "#FEF3C7",
                        color: loc.verification_status === "verified" ? "#166534" : "#92400E",
                        padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700
                      }}>
                        {loc.verification_status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", display: "flex", gap: 4, justifyContent: "flex-end" }}>
                      <button
                        title="Edit"
                        onClick={() => setLocModal({ open: true, isEdit: true, id: loc.id, district: loc.district, city: loc.city, locality: loc.locality || "", pincode: loc.pincode || "", location_type: loc.location_type || "town", verification_status: loc.verification_status || "verified" })}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#0D9488", padding: 4 }}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        title={loc.is_active ? "Deactivate" : "Activate"}
                        onClick={() => handleToggleActive(loc)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: loc.is_active ? "#F59E0B" : "#10B981", padding: 4 }}
                      >
                        {loc.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                      <button
                        title="Delete"
                        onClick={() => setDeleteConfirm({ open: true, type: "location", id: loc.id, name: `${loc.city}, ${loc.district}` })}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 4 }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORY BASE RATES */}
      {activeTab === "baseRates" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
            <span style={{ fontSize: 14, color: "#64748B", fontWeight: 600 }}>
              Authoritative base labour price before location adjustments
            </span>
            <button
              onClick={() => setBaseRateModal({ open: true, category_id: categories[0]?.id || "", base_price: "", notes: "" })}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "#0D9488", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
            >
              <Plus size={16} /> Configure Base Price
            </button>
          </div>

          {dataErrors.baseRates && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 16px", marginBottom: 12, color: "#B91C1C", display: "flex", gap: 8 }}>
              <AlertCircle size={16} /> {dataErrors.baseRates}
            </div>
          )}

          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                <tr>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Category</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Specific Job Type</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Base Labour Price</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Notes</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Last Updated</th>
                  <th style={{ padding: "12px 16px", color: "#475569", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && baseRates.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#94A3B8" }}>No base rates configured yet. Click \"Configure Base Price\" to add one.</td></tr>
                )}
                {baseRates.map((br) => (
                  <tr key={br.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: "#0F172A" }}>{br.category_name}</td>
                    <td style={{ padding: "12px 16px", color: "#64748B" }}>{br.job_type_name || "All Job Types (Category Default)"}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 800, color: "#0D9488", fontSize: 15 }}>₹{Number(br.base_price).toFixed(0)}</td>
                    <td style={{ padding: "12px 16px", color: "#64748B" }}>{br.notes || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "#94A3B8", fontSize: 12 }}>{new Date(br.updated_at).toLocaleDateString()}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button
                        onClick={() => setBaseRateModal({ open: true, category_id: br.category_id, base_price: br.base_price, notes: br.notes || "" })}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#0D9488", padding: 4 }}
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LOCATION ADJUSTMENTS */}
      {activeTab === "adjustments" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
            <span style={{ fontSize: 14, color: "#64748B", fontWeight: 600 }}>
              Adjustments (+/- percentage or fixed amount) applied to base prices by city, town or district
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setBulkModal({ open: true, district: "all", category_id: "", adjustment_type: "percentage", adjustment_value: 0, notes: "" })}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "#F1F5F9", color: "#0F172A", border: "1px solid #CBD5E1", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
              >
                <SlidersHorizontal size={16} /> Bulk Adjustment
              </button>
              <button
                onClick={() => setAdjModal({ open: true, district: "Kottayam", city: "Kottayam", category_id: categories[0]?.id || "", adjustment_type: "percentage", adjustment_value: 15, notes: "" })}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "#0D9488", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
              >
                <Plus size={16} /> Add Adjustment
              </button>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                <tr>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>District</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>City / Locality</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Category</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Adjustment</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Status</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Notes</th>
                  <th style={{ padding: "12px 16px", color: "#475569", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((adj) => (
                  <tr key={adj.id} style={{ borderBottom: "1px solid #F1F5F9", opacity: adj.is_active === false ? 0.6 : 1 }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>{adj.district || "Statewide"}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 700 }}>
                      {adj.locality ? (
                        <span>{adj.city || adj.district} <span style={{ color: "#0D9488", fontSize: 12, fontWeight: 600 }}>({adj.locality})</span></span>
                      ) : (
                        adj.city || "Entire District"
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#475569" }}>{adj.category_name || "All Categories"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "3px 10px",
                        borderRadius: 6,
                        fontWeight: 700,
                        background: Number(adj.adjustment_value) >= 0 ? "#E0F2FE" : "#FEE2E2",
                        color: Number(adj.adjustment_value) >= 0 ? "#0369A1" : "#B91C1C"
                      }}>
                        {adj.adjustment_type === "percentage"
                          ? `${Number(adj.adjustment_value) >= 0 ? "+" : ""}${adj.adjustment_value}%`
                          : `${Number(adj.adjustment_value) >= 0 ? "+₹" : "-₹"}${Math.abs(adj.adjustment_value)}`}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <button
                        onClick={() => handleToggleAdjustment(adj.id)}
                        title={adj.is_active !== false ? "Click to deactivate rule" : "Click to activate rule"}
                        style={{ background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        {adj.is_active !== false ? <ToggleRight size={18} color="#0D9488" /> : <ToggleLeft size={18} color="#94A3B8" />}
                        <span style={{ fontSize: 11, fontWeight: 700, color: adj.is_active !== false ? "#0D9488" : "#94A3B8" }}>
                          {adj.is_active !== false ? "Active" : "Inactive"}
                        </span>
                      </button>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748B" }}>{adj.notes || "—"}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button
                        title="Delete Adjustment"
                        onClick={() => setDeleteConfirm({
                          open: true,
                          type: "adjustment",
                          id: adj.id,
                          name: `${adj.locality ? `${adj.city} (${adj.locality})` : (adj.city || adj.district || "Statewide")} (${adj.category_name || "All Categories"})`
                        })}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 4 }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: EXACT MANUAL OVERRIDES */}
      {activeTab === "overrides" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
            <span style={{ fontSize: 14, color: "#64748B", fontWeight: 600 }}>
              Specific manual rates that take supreme priority over base prices & location adjustments
            </span>
            <button
              onClick={() => setOverrideModal({ open: true, district: "Kottayam", city: "Kottayam", locality: "", category_id: categories[0]?.id || "", exact_price: "", reason: "" })}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "#0D9488", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
            >
              <Plus size={16} /> Add Exact Override
            </button>
          </div>

          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                <tr>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>District</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>City / Area</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Category</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Exact Override Price</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Status</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Reason</th>
                  <th style={{ padding: "12px 16px", color: "#475569", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {overrides.map((ovr) => (
                  <tr key={ovr.id} style={{ borderBottom: "1px solid #F1F5F9", opacity: ovr.is_active === false ? 0.6 : 1 }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>{ovr.district}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 700 }}>
                      {ovr.locality ? (
                        <span>{ovr.city || ovr.district} <span style={{ color: "#0D9488", fontSize: 12, fontWeight: 600 }}>({ovr.locality})</span></span>
                      ) : (
                        ovr.city || ovr.district || "Entire District"
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }}>{ovr.category_name}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 800, color: "#0D9488", fontSize: 15 }}>₹{Number(ovr.exact_price).toFixed(0)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <button
                        onClick={() => handleToggleOverride(ovr.id)}
                        title={ovr.is_active !== false ? "Click to deactivate override" : "Click to activate override"}
                        style={{ background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        {ovr.is_active !== false ? <ToggleRight size={18} color="#0D9488" /> : <ToggleLeft size={18} color="#94A3B8" />}
                        <span style={{ fontSize: 11, fontWeight: 700, color: ovr.is_active !== false ? "#0D9488" : "#94A3B8" }}>
                          {ovr.is_active !== false ? "Active" : "Inactive"}
                        </span>
                      </button>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748B" }}>{ovr.reason || "—"}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button
                        title="Delete Override"
                        onClick={() => setDeleteConfirm({
                          open: true,
                          type: "override",
                          id: ovr.id,
                          name: `${ovr.city || ovr.district} - ${ovr.category_name} (₹${ovr.exact_price})`
                        })}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 4 }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: TRAVEL PRICING RULES */}
      {activeTab === "travel" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
            <span style={{ fontSize: 14, color: "#64748B", fontWeight: 600 }}>
              Independent travel charges: fixed visit fees, free radius, and per-km rates
            </span>
            <button
              onClick={() => setTravelModal({ open: true, rule_name: "District Travel Rate", district: "Kottayam", fixed_visit_fee: 0, free_radius_km: 5, per_km_rate: 10, min_fee: 0, max_fee: 300 })}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "#0D9488", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
            >
              <Plus size={16} /> Add Travel Rule
            </button>
          </div>

          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                <tr>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Rule Name</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Scope</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Visit Fee</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Free Radius</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Per Km Rate</th>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Min / Max Cap</th>
                </tr>
              </thead>
              <tbody>
                {travelRules.map((tr) => (
                  <tr key={tr.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 700 }}>{tr.rule_name}</td>
                    <td style={{ padding: "12px 16px", color: "#64748B" }}>{tr.district || "Statewide (All Districts)"}</td>
                    <td style={{ padding: "12px 16px" }}>₹{Number(tr.fixed_visit_fee).toFixed(0)}</td>
                    <td style={{ padding: "12px 16px" }}>{tr.free_radius_km} km</td>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: "#0D9488" }}>₹{tr.per_km_rate} / km</td>
                    <td style={{ padding: "12px 16px", color: "#64748B" }}>
                      ₹{tr.min_fee || 0} - {tr.max_fee ? `₹${tr.max_fee}` : "No max"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: PREVIEW & SIMULATION */}
      {activeTab === "preview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Simulator Inputs */}
          <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #E2E8F0" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px 0", color: "#0F172A" }}>
              Simulate & Test Location Pricing
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Service Category</label>
                <select
                  value={simForm.category_id}
                  onChange={(e) => setSimForm({ ...simForm, category_id: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", marginTop: 4 }}
                >
                  <option value="">Select Service Category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Service District</label>
                <select
                  value={simForm.district}
                  onChange={(e) => setSimForm({ ...simForm, district: e.target.value, city: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", marginTop: 4 }}
                >
                  {KERALA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>City / Town</label>
                <input
                  type="text"
                  value={simForm.city}
                  onChange={(e) => setSimForm({ ...simForm, city: e.target.value })}
                  placeholder="e.g. Kottayam or Ottappalam"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Optional Locality / Ward</label>
                <input
                  type="text"
                  value={simForm.locality}
                  onChange={(e) => setSimForm({ ...simForm, locality: e.target.value })}
                  placeholder="e.g. Town Center"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Simulated Provider Distance (km)</label>
                <input
                  type="number"
                  value={simForm.distance_km}
                  onChange={(e) => setSimForm({ ...simForm, distance_km: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", marginTop: 4 }}
                />
              </div>

              <button
                onClick={handleRunSimulation}
                disabled={simLoading}
                style={{
                  background: "#0D9488",
                  color: "#fff",
                  border: "none",
                  padding: "10px 16px",
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: "pointer",
                  marginTop: 10
                }}
              >
                {simLoading ? "Calculating Authoritative Price..." : "Calculate Price Breakdown"}
              </button>
            </div>
          </div>

          {/* Simulator Breakdown Output */}
          <div style={{ background: "#F8FAFC", padding: 20, borderRadius: 12, border: "1px solid #E2E8F0" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px 0", color: "#0F172A" }}>
              Live Calculation Breakdown
            </h3>

            {!simResult ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8" }}>
                <Calculator size={40} style={{ margin: "0 auto 10px auto", display: "block" }} />
                Select parameters and click Calculate to simulate pricing rules.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid #E2E8F0" }}>
                  <span style={{ color: "#64748B" }}>Confirmed Service Area:</span>
                  <strong style={{ color: "#0F172A" }}>{simResult.location?.city}, {simResult.location?.district}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748B" }}>Base Labour Price:</span>
                  <strong>₹{simResult.pricing_breakdown?.base_price}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748B" }}>Location Adjustment ({simResult.pricing_breakdown?.applied_adjustment?.scope}):</span>
                  <span style={{ fontWeight: 700, color: "#0369A1" }}>
                    {simResult.pricing_breakdown?.applied_adjustment?.formatted}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748B" }}>Adjusted Labour Price:</span>
                  <strong>₹{simResult.pricing_breakdown?.adjusted_labour_price}</strong>
                </div>

                {simResult.pricing_breakdown?.exact_override && (
                  <div style={{ display: "flex", justifyContent: "space-between", background: "#FEF3C7", padding: "6px 10px", borderRadius: 6 }}>
                    <span style={{ color: "#92400E", fontWeight: 700 }}>Exact Manual Override Applied:</span>
                    <strong style={{ color: "#92400E" }}>₹{simResult.pricing_breakdown?.exact_override.exact_price}</strong>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748B" }}>Final Labour Charge:</span>
                  <strong style={{ color: "#0D9488", fontSize: 16 }}>₹{simResult.pricing_breakdown?.final_labour_price}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px dashed #CBD5E1" }}>
                  <span style={{ color: "#64748B" }}>Travel Fee ({simResult.pricing_breakdown?.travel?.distance_km || 0} km):</span>
                  <strong>₹{simResult.pricing_breakdown?.travel?.travel_charge}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, borderTop: "2px solid #0D9488" }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#0F172A" }}>Estimated Total:</span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: "#0D9488" }}>
                    ₹{simResult.pricing_breakdown?.estimated_total}
                  </span>
                </div>

                {simResult.recommendation && (
                  <div style={{ marginTop: 14, padding: 14, background: simResult.recommendation.has_data ? "#F0FDF4" : "#EFF6FF", border: `1px solid ${simResult.recommendation.has_data ? "#BBF7D0" : "#BFDBFE"}`, borderRadius: 10, fontSize: 13 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: simResult.recommendation.has_data ? "#15803D" : "#1E40AF" }}>
                      <BarChart2 size={16} />
                      Wage Benchmark Intelligence (Market Evidence)
                    </div>
                    
                    <div style={{ marginTop: 6, color: "#334155", fontSize: 12, lineHeight: 1.5 }}>
                      {simResult.recommendation.has_data ? (
                        <>
                          <div>
                            <strong>Market Suggested Adjustment:</strong>{" "}
                            <span style={{ fontWeight: 800, color: "#166534" }}>{simResult.recommendation.recommended_adjustment_formatted}</span>{" "}
                            (Median market benchmark: ₹{simResult.recommendation.median_reference_price} from {simResult.recommendation.sample_count} verified samples)
                          </div>
                          <div style={{ marginTop: 4, padding: "6px 8px", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 6, color: "#92400E", fontSize: 11 }}>
                            ⚠️ <strong>Advisory Only:</strong> Market recommendations do not change active customer prices until reviewed and applied as an official Location Adjustment by an administrator.
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ color: "#1E3A8A", fontWeight: 600 }}>
                            {simResult.recommendation.message}
                          </div>
                          <div style={{ marginTop: 4, color: "#64748B", fontSize: 11 }}>
                            <strong>Active Fallback:</strong> {simResult.recommendation.recommended_adjustment_formatted || "0% (Configured Default)"} is currently applied.
                            {simResult.recommendation.threshold_config && (
                              <span> (Requires ≥ {simResult.recommendation.threshold_config.min_sample_threshold} fresh verified records within {simResult.recommendation.threshold_config.max_data_age_days} days).</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: WAGE BENCHMARK INTELLIGENCE */}
      {activeTab === "benchmarks" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Header & Policy Notice */}
          <div style={{ background: "#fff", padding: 24, borderRadius: 12, border: "1px solid #E2E8F0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: 8 }}>
                  <BarChart2 size={20} color="#0D9488" />
                  Wage Benchmark Intelligence & Market Evidence
                </h3>
                <p style={{ color: "#64748B", fontSize: 14, margin: 0, maxWidth: 800 }}>
                  ServiceHub relies on empirical, verified market wage evidence from local associations, labour departments, and verified provider submissions. To preserve price predictability and integrity, market recommendations <strong>never change active customer prices</strong> until explicitly reviewed and committed as a Location Adjustment by an administrator.
                </p>
              </div>

              <div style={{ padding: "8px 14px", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, fontSize: 12, color: "#92400E", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <ShieldAlert size={16} />
                Strict Evidence Guard: No Fabricated Data
              </div>
            </div>
          </div>

          {/* Configurable Evidence Threshold Form */}
          <div style={{ background: "#fff", padding: 24, borderRadius: 12, border: "1px solid #E2E8F0" }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px 0", display: "flex", alignItems: "center", gap: 6 }}>
              <Settings size={18} color="#0D9488" />
              Configurable Evidence Criteria & Thresholds
            </h4>
            
            <form onSubmit={handleSaveBenchmarkConfig} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, alignItems: "end" }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                  Min Verified Samples Required:
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={benchmarkConfig.min_sample_threshold}
                  onChange={(e) => setBenchmarkConfig(c => ({ ...c, min_sample_threshold: parseInt(e.target.value) || 1 }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                  Max Data Age (Days):
                </label>
                <input
                  type="number"
                  min="30"
                  max="1095"
                  value={benchmarkConfig.max_data_age_days}
                  onChange={(e) => setBenchmarkConfig(c => ({ ...c, max_data_age_days: parseInt(e.target.value) || 30 }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                  Comparable Target Wage Type:
                </label>
                <select
                  value={benchmarkConfig.target_wage_type}
                  onChange={(e) => setBenchmarkConfig(c => ({ ...c, target_wage_type: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, background: "#fff" }}
                >
                  <option value="service_charge">Per-Job Service Charge (Standard)</option>
                  <option value="daily_wage">Daily Wage</option>
                  <option value="hourly">Hourly Rate</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button
                  type="submit"
                  disabled={configSaving}
                  style={{ background: "#0D9488", color: "#fff", border: "none", padding: "9px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
                >
                  {configSaving ? "Saving…" : "Save Threshold Config"}
                </button>
              </div>
            </form>
          </div>

          {/* Diagnostics: Why Data Is Insufficient */}
          <div style={{ background: "#fff", padding: 24, borderRadius: 12, border: "1px solid #E2E8F0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  District & Category Coverage Gap Analysis
                </h4>
                <p style={{ color: "#64748B", fontSize: 13, margin: "4px 0 0 0" }}>
                  Detailed breakdown explaining why benchmark intelligence is currently insufficient across Kerala districts and categories.
                </p>
              </div>
              <span style={{ padding: "4px 10px", background: "#FEF2F2", color: "#B91C1C", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                {benchmarkDiagnostics?.total_benchmarks_in_db === 0 ? "0 Total Raw Records" : `${benchmarkDiagnostics?.total_benchmarks_in_db} Raw Records`}
              </span>
            </div>

            {/* Explanatory Alert */}
            <div style={{ padding: 14, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, fontSize: 13, color: "#1E3A8A", marginBottom: 20, lineHeight: 1.5 }}>
              <strong>Why is benchmark data insufficient?</strong>
              <div style={{ marginTop: 4 }}>
                A reliable wage recommendation requires at least <strong>{benchmarkConfig.min_sample_threshold} verified, non-stale ({benchmarkConfig.max_data_age_days} days limit)</strong> samples matching the specific service category and job scope. Currently, all 14 Kerala districts lack usable benchmark records. The system therefore strictly adheres to data integrity policies and applies the <strong>0% Configured Default Adjustment</strong> without fabricating wages or adjustments.
              </div>
            </div>

            {/* Category Coverage Table */}
            <h5 style={{ fontSize: 14, fontWeight: 700, margin: "16px 0 10px 0" }}>Category Coverage Gaps</h5>
            <div style={{ overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                    <th style={{ padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Service Category</th>
                    <th style={{ padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Usable Records</th>
                    <th style={{ padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Status</th>
                    <th style={{ padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Districts Lacking Usable Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarkDiagnostics?.categories_gap_analysis?.map(c => (
                    <tr key={c.category_id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 600 }}>{c.category_name}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontWeight: 700, color: c.usable_records_count > 0 ? "#166534" : "#DC2626" }}>
                          {c.usable_records_count}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: c.usable_records_count >= benchmarkConfig.min_sample_threshold ? "#DCFCE7" : "#FEE2E2", color: c.usable_records_count >= benchmarkConfig.min_sample_threshold ? "#166534" : "#991B1B" }}>
                          {c.usable_records_count >= benchmarkConfig.min_sample_threshold ? "Sufficient" : "Insufficient Data"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#64748B", fontSize: 12 }}>
                        {c.districts_lacking.length === 14 ? "All 14 Kerala districts" : `${c.districts_lacking.length} districts (${c.districts_lacking.slice(0, 4).join(", ")}...)`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Kerala Districts Summary */}
            <h5 style={{ fontSize: 14, fontWeight: 700, margin: "20px 0 10px 0" }}>District-Level Evidence Status</h5>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              {KERALA_DISTRICTS.map(d => {
                const info = benchmarkDiagnostics?.districts_summary?.[d];
                const usable = info?.verified_usable_records ?? 0;
                return (
                  <div key={d} style={{ padding: 10, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: "#0F172A" }}>{d}</div>
                    <div style={{ color: usable > 0 ? "#166534" : "#DC2626", marginTop: 4, fontWeight: 600 }}>
                      {usable} usable sample(s)
                    </div>
                    <div style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                      Fallback: 0% Default
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: CSV IMPORT / EXPORT */}
      {activeTab === "importExport" && (
        <div style={{ background: "#fff", padding: 24, borderRadius: 12, border: "1px solid #E2E8F0" }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px 0" }}>
            Bulk Kerala Location Dataset Import / Export
          </h3>
          <p style={{ color: "#64748B", fontSize: 14, marginBottom: 20 }}>
            Import verified CSV lists of Kerala Corporations, Municipalities, and Panchayaths. Unique location IDs and verified district boundaries prevent duplicate records.
          </p>

          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <button
              onClick={handleExportCsv}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "#F1F5F9", border: "1px solid #CBD5E1", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
            >
              <Download size={16} /> Export Verified Locations CSV
            </button>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>
              Paste CSV Data (Header: district, city, locality, pincode, location_type)
            </label>
            <textarea
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`district,city,locality,pincode,location_type\nKottayam,Kottayam,,686001,municipality\nPalakkad,Ottappalam,,679101,municipality`}
              style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #CBD5E1", fontFamily: "monospace", fontSize: 12 }}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <button
              onClick={handleImportCsv}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "#0D9488", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}
            >
              <Upload size={16} /> Process & Validate Import
            </button>
          </div>

          {importStatus && (
            <div style={{ marginTop: 12, padding: 12, background: "#DCFCE7", color: "#166534", borderRadius: 8, fontWeight: 600 }}>
              {importStatus}
            </div>
          )}
        </div>
      )}

      {/* TAB 8: AUDIT LOGS */}
      {activeTab === "audit" && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Pricing Change Audit Trail</h3>
            <small style={{ color: "#64748B" }}>Immutable log of all price updates, overrides, and adjustments made by administrators</small>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
            <thead style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
              <tr>
                <th style={{ padding: "12px 16px", color: "#475569" }}>Timestamp</th>
                <th style={{ padding: "12px 16px", color: "#475569" }}>Action</th>
                <th style={{ padding: "12px 16px", color: "#475569" }}>Entity</th>
                <th style={{ padding: "12px 16px", color: "#475569" }}>Admin</th>
                <th style={{ padding: "12px 16px", color: "#475569" }}>Details / Reason</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "12px 16px", color: "#64748B", fontSize: 12 }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      textTransform: "uppercase",
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: log.action_type === "create" ? "#DCFCE7" : (log.action_type === "delete" ? "#FEE2E2" : "#E0F2FE"),
                      color: log.action_type === "create" ? "#166534" : (log.action_type === "delete" ? "#B91C1C" : "#0369A1")
                    }}>
                      {log.action_type}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>{log.entity_type}</td>
                  <td style={{ padding: "12px 16px", color: "#64748B" }}>{log.admin_id}</td>
                  <td style={{ padding: "12px 16px", color: "#0F172A" }}>{log.reason || "Configuration update"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: LOCATION CREATE / EDIT */}
      {locModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
          <form onSubmit={handleSaveLocation} style={{ background: "#fff", padding: 24, borderRadius: 12, width: 440, maxWidth: "95%", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18 }}>{locModal.isEdit ? "Edit Location" : "Add Service Location"}</h3>

            {/* Inline validation error */}
            {locFormError && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "8px 12px", marginBottom: 12, color: "#B91C1C", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={14} /> {locFormError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label htmlFor="loc-district-select" style={{ fontSize: 12, fontWeight: 600 }}>District <span style={{ color: "#EF4444" }}>*</span></label>
                <select
                  id="loc-district-select"
                  name="district"
                  value={locModal.district}
                  onChange={(e) => setLocModal({ ...locModal, district: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", marginTop: 4 }}
                >
                  {KERALA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="loc-city-input" style={{ fontSize: 12, fontWeight: 600 }}>City / Town / Area Name <span style={{ color: "#EF4444" }}>*</span></label>
                <input
                  id="loc-city-input"
                  name="city"
                  type="text"
                  required
                  placeholder="e.g. Kottayam, Ottappalam, Thrissur"
                  value={locModal.city}
                  onChange={(e) => { setLocModal({ ...locModal, city: e.target.value }); setLocFormError(""); }}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: `1px solid ${locFormError && !locModal.city.trim() ? "#EF4444" : "#CBD5E1"}`, marginTop: 4 }}
                />
              </div>
              <div>
                <label htmlFor="loc-locality-input" style={{ fontSize: 12, fontWeight: 600 }}>Locality / Ward (Optional)</label>
                <input
                  id="loc-locality-input"
                  name="locality"
                  type="text"
                  placeholder="e.g. Town Center, West Ward"
                  value={locModal.locality}
                  onChange={(e) => setLocModal({ ...locModal, locality: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", marginTop: 4 }}
                />
              </div>
              <div>
                <label htmlFor="loc-pincode-input" style={{ fontSize: 12, fontWeight: 600 }}>Pincode (Optional)</label>
                <input
                  id="loc-pincode-input"
                  name="pincode"
                  type="text"
                  maxLength={6}
                  placeholder="6-digit Indian postal code, e.g. 686001"
                  value={locModal.pincode}
                  onChange={(e) => { setLocModal({ ...locModal, pincode: e.target.value }); setLocFormError(""); }}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: `1px solid ${locModal.pincode && !PINCODE_REGEX.test(locModal.pincode) ? "#F59E0B" : "#CBD5E1"}`, marginTop: 4 }}
                />
                {locModal.pincode && !PINCODE_REGEX.test(locModal.pincode) && (
                  <span style={{ fontSize: 11, color: "#D97706", marginTop: 2, display: "block" }}>Must be a 6-digit code not starting with 0</span>
                )}
              </div>
              <div>
                <label htmlFor="loc-type-select" style={{ fontSize: 12, fontWeight: 600 }}>Location Type</label>
                <select
                  id="loc-type-select"
                  name="location_type"
                  value={locModal.location_type}
                  onChange={(e) => setLocModal({ ...locModal, location_type: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", marginTop: 4 }}
                >
                  <option value="corporation">Corporation</option>
                  <option value="municipality">Municipality</option>
                  <option value="town">Town</option>
                  <option value="panchayath">Panchayath</option>
                  <option value="locality">Locality / Ward</option>
                </select>
              </div>
              <div>
                <label htmlFor="loc-verification-select" style={{ fontSize: 12, fontWeight: 600 }}>Verification Status</label>
                <select
                  id="loc-verification-select"
                  name="verification_status"
                  value={locModal.verification_status}
                  onChange={(e) => setLocModal({ ...locModal, verification_status: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", marginTop: 4 }}
                >
                  <option value="verified">Verified</option>
                  <option value="pending">Pending Verification</option>
                  <option value="unverified">Unverified</option>
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button type="button" onClick={() => { setLocModal(EMPTY_LOC); setLocFormError(""); }} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
                <button type="submit" style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#0D9488", color: "#fff", fontWeight: 700 }}>Save Location</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteConfirm.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10001 }}>
          <div style={{ background: "#fff", padding: 28, borderRadius: 12, width: 420, maxWidth: "90%" }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 18, color: "#0F172A" }}>
              {deleteConfirm.type === "adjustment"
                ? "Delete Location Adjustment?"
                : deleteConfirm.type === "override"
                ? "Delete Exact Override?"
                : "Delete Location?"}
            </h3>
            <p style={{ color: "#64748B", fontSize: 14, margin: "0 0 20px 0" }}>
              {deleteConfirm.type === "adjustment" ? (
                <>Permanently delete location adjustment for <strong>{deleteConfirm.name}</strong>? Base labour rates will take effect instead.</>
              ) : deleteConfirm.type === "override" ? (
                <>Permanently delete exact manual override for <strong>{deleteConfirm.name}</strong>? Calculated location pricing will resume.</>
              ) : (
                <>Permanently delete <strong>{deleteConfirm.name}</strong> from the directory? This cannot be undone.</>
              )}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteConfirm({ open: false, type: "location", id: null, name: "" })} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #CBD5E1", background: "#F1F5F9", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleDeleteItem} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#EF4444", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BASE RATE CREATE / EDIT */}
      {baseRateModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
          <form onSubmit={handleSaveBaseRate} style={{ background: "#fff", padding: 24, borderRadius: 12, width: 400, maxWidth: "90%" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18 }}>Set Base Labour Price</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label htmlFor="base-category-select" style={{ fontSize: 12, fontWeight: 600 }}>Service Category</label>
                <select
                  id="base-category-select"
                  name="category_id"
                  value={baseRateModal.category_id}
                  onChange={(e) => setBaseRateModal({ ...baseRateModal, category_id: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", marginTop: 4 }}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="base-price-input" style={{ fontSize: 12, fontWeight: 600 }}>Base Labour Rate (₹)</label>
                <input
                  id="base-price-input"
                  name="base_price"
                  type="number"
                  required
                  min="0"
                  value={baseRateModal.base_price}
                  onChange={(e) => setBaseRateModal({ ...baseRateModal, base_price: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", marginTop: 4 }}
                />
              </div>
              <div>
                <label htmlFor="base-notes-input" style={{ fontSize: 12, fontWeight: 600 }}>Notes / Description</label>
                <input
                  id="base-notes-input"
                  name="notes"
                  type="text"
                  value={baseRateModal.notes}
                  onChange={(e) => setBaseRateModal({ ...baseRateModal, notes: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", marginTop: 4 }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button type="button" onClick={() => setBaseRateModal({ ...baseRateModal, open: false })} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #CBD5E1", background: "#F1F5F9", cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#0D9488", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save Base Price</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADJUSTMENT CREATE */}
      {adjModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
          <form onSubmit={handleSaveAdjustment} style={{ background: "#fff", padding: 24, borderRadius: 12, width: 420, maxWidth: "90%" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18 }}>Add Location Adjustment</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label htmlFor="adj-district-select" style={{ fontSize: 12, fontWeight: 600 }}>District</label>
                <select
                  id="adj-district-select"
                  name="district"
                  value={adjModal.district}
                  onChange={(e) => setAdjModal({ ...adjModal, district: e.target.value, city: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", marginTop: 4 }}
                >
                  {KERALA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label htmlFor="adj-city-select" style={{ fontSize: 12, fontWeight: 600 }}>City / Town (Different wages per city)</label>
                  <span style={{ fontSize: 11, color: "#0D9488" }}>Select or type custom</span>
                </div>
                {/* Datalist / dropdown for available cities in selected district */}
                <input
                  id="adj-city-select"
                  name="city"
                  list="adj-cities-datalist"
                  type="text"
                  required
                  placeholder="Select or enter city name..."
                  value={adjModal.city}
                  onChange={(e) => setAdjModal({ ...adjModal, city: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", marginTop: 4 }}
                />
                <datalist id="adj-cities-datalist">
                  {locations
                    .filter(l => !adjModal.district || l.district.toLowerCase() === adjModal.district.toLowerCase())
                    .map(l => l.city)
                    .filter((c, idx, arr) => arr.indexOf(c) === idx)
                    .map(city => (
                      <option key={city} value={city} />
                    ))}
                </datalist>
              </div>
              <div>
                <label htmlFor="adj-locality-input" style={{ fontSize: 12, fontWeight: 600 }}>Locality / Area (Optional - empty for entire city)</label>
                <input
                  id="adj-locality-input"
                  name="locality"
                  type="text"
                  value={adjModal.locality}
                  onChange={(e) => setAdjModal({ ...adjModal, locality: e.target.value })}
                  placeholder="e.g. Town Center, West Fort, Kadavanthra"
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", marginTop: 4 }}
                />
              </div>
              <div>
                <label htmlFor="adj-category-select" style={{ fontSize: 12, fontWeight: 600 }}>Category (Optional - Empty = All Categories)</label>
                <select
                  id="adj-category-select"
                  name="category_id"
                  value={adjModal.category_id}
                  onChange={(e) => setAdjModal({ ...adjModal, category_id: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", marginTop: 4 }}
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="adj-type-select" style={{ fontSize: 12, fontWeight: 600 }}>Adjustment Type</label>
                <select
                  id="adj-type-select"
                  name="adjustment_type"
                  value={adjModal.adjustment_type}
                  onChange={(e) => setAdjModal({ ...adjModal, adjustment_type: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", marginTop: 4 }}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>
              <div>
                <label htmlFor="adj-value-input" style={{ fontSize: 12, fontWeight: 600 }}>Adjustment Value (e.g. +25 or -10)</label>
                <input
                  id="adj-value-input"
                  name="adjustment_value"
                  type="number"
                  step="any"
                  required
                  value={adjModal.adjustment_value}
                  onChange={(e) => setAdjModal({ ...adjModal, adjustment_value: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", marginTop: 4 }}
                />
              </div>

              {/* Live Preview Before Saving */}
              {(() => {
                const selCat = categories.find(c => String(c.id) === String(adjModal.category_id));
                const catBaseRate = baseRates.find(b => String(b.category_id) === String(adjModal.category_id));
                const baseP = catBaseRate ? Number(catBaseRate.base_price) : 400;
                const val = Number(adjModal.adjustment_value) || 0;
                const calcP = adjModal.adjustment_type === "percentage"
                  ? Math.round(baseP * (1 + val / 100))
                  : Math.round(baseP + val);
                return (
                  <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: 10, fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: "#166534" }}>Live Price Calculation Preview:</div>
                    <div style={{ marginTop: 2, color: "#334155" }}>
                      Category: <strong>{selCat?.name || `All Categories (Base ₹${baseP})`}</strong>
                    </div>
                    <div style={{ marginTop: 2, color: "#334155" }}>
                      Base: ₹{baseP} → Effective Labour Price: <strong style={{ color: "#0D9488", fontSize: 14 }}>₹{Math.max(0, calcP)}</strong>
                      {" "}({adjModal.adjustment_type === "percentage" ? `${val >= 0 ? "+" : ""}${val}%` : `${val >= 0 ? "+₹" : "-₹"}${Math.abs(val)}`})
                    </div>
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                      Scope: {adjModal.locality ? `Locality (${adjModal.locality})` : (adjModal.city ? `City (${adjModal.city})` : `District (${adjModal.district})`)}
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button type="button" onClick={() => setAdjModal({ ...adjModal, open: false })} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
                <button type="submit" style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#0D9488", color: "#fff", fontWeight: 700 }}>Save Adjustment</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EXACT OVERRIDE CREATE */}
      {overrideModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
          <form onSubmit={handleSaveOverride} style={{ background: "#fff", padding: 24, borderRadius: 12, width: 420, maxWidth: "90%" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18 }}>Add Exact Manual Override</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label htmlFor="override-district-select" style={{ fontSize: 12, fontWeight: 600 }}>District</label>
                <select
                  id="override-district-select"
                  name="district"
                  value={overrideModal.district}
                  onChange={(e) => setOverrideModal({ ...overrideModal, district: e.target.value, city: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", marginTop: 4 }}
                >
                  {KERALA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="override-city-input" style={{ fontSize: 12, fontWeight: 600 }}>City / Town</label>
                <input
                  id="override-city-input"
                  name="city"
                  type="text"
                  required
                  value={overrideModal.city}
                  onChange={(e) => setOverrideModal({ ...overrideModal, city: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", marginTop: 4 }}
                />
              </div>
              <div>
                <label htmlFor="override-locality-input" style={{ fontSize: 12, fontWeight: 600 }}>Locality / Area (Optional - empty for entire city)</label>
                <input
                  id="override-locality-input"
                  name="locality"
                  type="text"
                  value={overrideModal.locality}
                  onChange={(e) => setOverrideModal({ ...overrideModal, locality: e.target.value })}
                  placeholder="e.g. Town Center, West Fort, Kadavanthra"
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", marginTop: 4 }}
                />
              </div>
              <div>
                <label htmlFor="override-category-select" style={{ fontSize: 12, fontWeight: 600 }}>Category</label>
                <select
                  id="override-category-select"
                  name="category_id"
                  value={overrideModal.category_id}
                  onChange={(e) => setOverrideModal({ ...overrideModal, category_id: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", marginTop: 4 }}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="override-price-input" style={{ fontSize: 12, fontWeight: 600 }}>Exact Payable Labour Price (₹)</label>
                <input
                  id="override-price-input"
                  name="exact_price"
                  type="number"
                  required
                  min="0"
                  value={overrideModal.exact_price}
                  onChange={(e) => setOverrideModal({ ...overrideModal, exact_price: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", marginTop: 4 }}
                />
              </div>
              <div>
                <label htmlFor="override-reason-input" style={{ fontSize: 12, fontWeight: 600 }}>Reason / Audit Justification</label>
                <input
                  id="override-reason-input"
                  name="reason"
                  type="text"
                  value={overrideModal.reason}
                  onChange={(e) => setOverrideModal({ ...overrideModal, reason: e.target.value })}
                  placeholder="e.g. Special verified union rate"
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", marginTop: 4 }}
                />
              </div>

              {/* Live Preview Before Saving */}
              {(() => {
                const selCat = categories.find(c => String(c.id) === String(overrideModal.category_id));
                const catBaseRate = baseRates.find(b => String(b.category_id) === String(overrideModal.category_id));
                const baseP = catBaseRate ? Number(catBaseRate.base_price) : 400;
                const exactP = Number(overrideModal.exact_price) || 0;
                return (
                  <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, padding: 10, fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: "#92400E" }}>Exact Manual Override Preview:</div>
                    <div style={{ marginTop: 2, color: "#334155" }}>
                      Category: <strong>{selCat?.name || "Select Category"}</strong> (Standard Base: ₹{baseP})
                    </div>
                    <div style={{ marginTop: 2, color: "#334155" }}>
                      Effective Labour Price: <strong style={{ color: "#B45309", fontSize: 14 }}>₹{exactP}</strong> (Overrides all adjustments)
                    </div>
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                      Scope: {overrideModal.locality ? `Locality (${overrideModal.locality})` : (overrideModal.city ? `City (${overrideModal.city})` : `District (${overrideModal.district})`)}
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button type="button" onClick={() => setOverrideModal({ ...overrideModal, open: false })} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
                <button type="submit" style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#0D9488", color: "#fff", fontWeight: 700 }}>Save Exact Override</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: BULK ADJUSTMENT */}
      {bulkModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
          <form onSubmit={handleBulkApply} style={{ background: "#fff", padding: 24, borderRadius: 12, width: 440, maxWidth: "90%" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18 }}>Bulk Apply Location Adjustment</h3>
            <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 12px 0" }}>
              Note: Bulk updates never overwrite exact manual overrides.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label htmlFor="bulk-district-select" style={{ fontSize: 12, fontWeight: 600 }}>Apply To District Scope</label>
                <select
                  id="bulk-district-select"
                  name="district"
                  value={bulkModal.district}
                  onChange={(e) => setBulkModal({ ...bulkModal, district: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", marginTop: 4 }}
                >
                  <option value="all">All 14 Kerala Districts</option>
                  {KERALA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="bulk-category-select" style={{ fontSize: 12, fontWeight: 600 }}>Category (Optional - Empty = All Categories)</label>
                <select
                  id="bulk-category-select"
                  name="category_id"
                  value={bulkModal.category_id}
                  onChange={(e) => setBulkModal({ ...bulkModal, category_id: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", marginTop: 4 }}
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="bulk-type-select" style={{ fontSize: 12, fontWeight: 600 }}>Adjustment Type</label>
                <select
                  id="bulk-type-select"
                  name="adjustment_type"
                  value={bulkModal.adjustment_type}
                  onChange={(e) => setBulkModal({ ...bulkModal, adjustment_type: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", marginTop: 4 }}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>
              <div>
                <label htmlFor="bulk-value-input" style={{ fontSize: 12, fontWeight: 600 }}>Adjustment Value</label>
                <input
                  id="bulk-value-input"
                  name="adjustment_value"
                  type="number"
                  step="any"
                  required
                  value={bulkModal.adjustment_value}
                  onChange={(e) => setBulkModal({ ...bulkModal, adjustment_value: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", marginTop: 4 }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button type="button" onClick={() => setBulkModal({ ...bulkModal, open: false })} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
                <button type="submit" style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#0D9488", color: "#fff", fontWeight: 700 }}>Confirm & Apply Bulk</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
