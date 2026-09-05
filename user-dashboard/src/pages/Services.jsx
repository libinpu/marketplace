import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Car,
  CheckCircle2,
  ChevronRight,
  Home,
  Link,
  MapPin,
  Monitor,
  RefreshCw,
  Scissors,
  Search,
  Sparkles,
  Star,
  Tags,
  Wrench
} from 'lucide-react';
import { categoryColors, categoryIcons, serviceGroups, API } from '../constants';
import { BookingModal } from '../components/BookingModal';
import { useToast, Toast } from '../components/Toast';
import { useTranslation } from 'react-i18next';

import keralaCarpentry from '../assets/kerala/carpentry.jpg';
import keralaGardening from '../assets/kerala/gardening.jpg';
import keralaPlumbing from '../assets/kerala/plumbing.jpg';
import keralaElectrical from '../assets/kerala/electrical.jpg';
import keralaCleaning from '../assets/kerala/cleaning.jpg';
import keralaAcRepair from '../assets/kerala/ac_repair.jpg';
import keralaPainting from '../assets/kerala/painting.jpg';
import keralaCctv from '../assets/kerala/cctv.jpg';
import keralaHomeRepair from '../assets/kerala/home_repair.jpg';
import keralaComputerRepair from '../assets/kerala/computer_repair.jpg';
import keralaPhotography from '../assets/kerala/photography.jpg';
import keralaVehicle from '../assets/kerala/vehicle.jpg';

import gardeningFallback from '../assets/service-icons/gardening.jpg';
import acRepairFallback from '../assets/service-icons/ac-appliance-repair.jpg';
import cctvSecurityFallback from '../assets/service-icons/cctv-security.jpg';
import appliancesFallback from '../assets/service-icons/appliances.jpg';
import computerRepairFallback from '../assets/service-icons/computer-repair.jpg';
import carpentryFallback from '../assets/service-icons/carpentry.jpg';
import cleaningFallback from '../assets/service-icons/cleaning.jpg';
import electricalFallback from '../assets/service-icons/electrical.jpg';
import paintingFallback from '../assets/service-icons/painting.jpg';
import plumbingFallback from '../assets/service-icons/plumbing.jpg';

// Aesthetic, realistic photographic images connecting deeply with Kerala homes, lifestyle & architecture
const categoryImages = {
  'Gardening & Landscaping': keralaGardening,
  'Gardening': keralaGardening,
  'AC & Appliance Repair': keralaAcRepair,
  'AC Repair': keralaAcRepair,
  'Appliances': keralaAcRepair,
  'CCTV & Security': keralaCctv,
  'Security': keralaCctv,
  'Computer & Mobile Repair': keralaComputerRepair,
  'Computer Repair': keralaComputerRepair,
  'Computer Repairing': keralaComputerRepair,
  'Carpentry': keralaCarpentry,
  'Cleaning': keralaCleaning,
  'Electrical': keralaElectrical,
  'Painting': keralaPainting,
  'Plumbing': keralaPlumbing,
  'Home Repair & Maintenance': keralaHomeRepair,
  'Photography & Videography': keralaPhotography,
  'Vehicle Services': keralaVehicle,
  'Vehicle Servicing': keralaVehicle,
  'Personal Care': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
  'Barber and Beautician Services': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
};

const localCategoryFallbacks = {
  'Gardening & Landscaping': gardeningFallback,
  'Gardening': gardeningFallback,
  'AC & Appliance Repair': acRepairFallback,
  'AC Repair': acRepairFallback,
  'CCTV & Security': cctvSecurityFallback,
  'Security': cctvSecurityFallback,
  'Appliances': appliancesFallback,
  'Computer & Mobile Repair': computerRepairFallback,
  'Computer Repair': computerRepairFallback,
  'Carpentry': carpentryFallback,
  'Cleaning': cleaningFallback,
  'Electrical': electricalFallback,
  'Painting': paintingFallback,
  'Plumbing': plumbingFallback,
  'Home Repair & Maintenance': keralaHomeRepair,
  'Photography & Videography': keralaPhotography,
  'Vehicle Services': keralaVehicle,
  'Personal Care': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
  'Barber and Beautician Services': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
};

function Services({ navigate, initialGroup = null, initialCategory = null }) {
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [professionals, setProfessionals] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingPros, setLoadingPros] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [locationError, setLocationError] = useState('');
  const [booking, setBooking] = useState(null); // { professional, category }
  const [profileProfessional, setProfileProfessional] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [activeGroup, setActiveGroup] = useState(initialGroup || 'all');
  const [subcategories, setSubcategories] = useState([]);
  const [loadingSubcats, setLoadingSubcats] = useState(true);
  const [subcatSearch, setSubcatSearch] = useState('');
  const [selectedSubcat, setSelectedSubcat] = useState(null);
  const [subcatProTab, setSubcatProTab] = useState('all'); // 'all' | 'nearby'
  const { toast, showToast } = useToast();
  const { t, i18n } = useTranslation();
  const nearbyLimitKm = 15;

  const handleOpenSubcatPros = (subcat) => {
    const targetCat = categoriesByName.get(subcat.category_name) || { id: subcat.category_name, name: subcat.category_name };
    if (!selected || selected.name?.toLowerCase() !== subcat.category_name?.toLowerCase()) {
      selectCategory(targetCat);
    }
    setSelectedSubcat(subcat);
    setSubcatProTab('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (initialGroup) {
      setActiveGroup(initialGroup);
    }
  }, [initialGroup]);

  const filteredGlobalSubcats = subcategories.filter(sub => {
    if (!subcatSearch.trim()) return false;
    const q = subcatSearch.toLowerCase().trim();
    return sub.name.toLowerCase().includes(q) || sub.category_name.toLowerCase().includes(q);
  });

  const calculateDistanceInKm = (firstLatitude, firstLongitude, secondLatitude, secondLongitude) => {
    if (![firstLatitude, firstLongitude, secondLatitude, secondLongitude].every(Number.isFinite)) return null;
    const earthRadiusKm = 6371;
    const latitudeDelta = (secondLatitude - firstLatitude) * Math.PI / 180;
    const longitudeDelta = (secondLongitude - firstLongitude) * Math.PI / 180;
    const latitude1 = firstLatitude * Math.PI / 180;
    const latitude2 = secondLatitude * Math.PI / 180;
    const haversine = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  };

  useEffect(() => {
    fetch(`${API}/categories?lang=${i18n.language}`)
      .then(r => r.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => showToast('Failed to load categories', 'error'))
      .finally(() => setLoadingCats(false));

    fetch(`${API}/subcategories?lang=${i18n.language}`)
      .then(r => r.json())
      .then(data => setSubcategories(Array.isArray(data) ? data : []))
      .catch(err => console.error('Failed to load subcategories:', err))
      .finally(() => setLoadingSubcats(false));
  }, [i18n.language]);

  const requestLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location services are not supported by this browser.'));
      return;
    }

    setLocationStatus('requesting');
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const current = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
          placeName: ''
        };
        // Resolve immediately with coordinates, don't wait for reverse geocoding
        setLocation(current);
        setLocationStatus('ready');
        resolve(current);

        // Fetch place name in the background
        fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${current.latitude}&lon=${current.longitude}&zoom=18&addressdetails=1`)
          .then(response => {
            if (!response.ok) throw new Error('Reverse geocoding failed');
            return response.json();
          })
          .then(data => {
            setLocation(prev => prev ? { ...prev, placeName: data.display_name || '' } : prev);
          })
          .catch(() => {});
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'Please allow location access in your browser to find professionals near you.'
          : 'We could not retrieve your current location. Please try again.';
        setLocationStatus('denied');
        setLocationError(message);
        reject(new Error(message));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });

  const selectCategory = async (cat) => {
    setSelected(cat);
    setProfessionals([]);
    setLoadingPros(true);
    
    // Request location in the background if not available
    if (!location && locationStatus !== 'requesting' && locationStatus !== 'denied') {
      requestLocation().catch(() => {});
    }

    try {
      const query = new URLSearchParams({
        category: cat.name
      });
      const res = await fetch(`${API}/professionals?${query}`);
      const data = await res.json();
      setProfessionals(data.map(professional => ({
        ...professional,
        distance_from_user: location ? calculateDistanceInKm(
          location.latitude,
          location.longitude,
          Number(professional.effective_latitude || professional.current_latitude || professional.registered_latitude),
          Number(professional.effective_longitude || professional.current_longitude || professional.registered_longitude)
        ) : null,
      })));
    } catch {
      showToast('Failed to load professionals', 'error');
    } finally {
      setLoadingPros(false);
    }
  };

  const handleCategoryClick = (cat) => {
    setSelectedSubcat(null);
    selectCategory(cat);
  };

  useEffect(() => {
    if (!initialCategory || categories.length === 0 || selected?.name === initialCategory) return;
    const category = categories.find(item => item.name === initialCategory);
    if (category) {
      selectCategory(category);
    }
  }, [categories, initialCategory]);

  // Update distances when location becomes available
  useEffect(() => {
    if (location && professionals.length > 0 && professionals.some(p => p.distance_from_user == null)) {
      setProfessionals(prev => prev.map(pro => ({
        ...pro,
        distance_from_user: calculateDistanceInKm(
          location.latitude,
          location.longitude,
          Number(pro.effective_latitude || pro.current_latitude || pro.registered_latitude),
          Number(pro.effective_longitude || pro.current_longitude || pro.registered_longitude)
        )
      })));
    }
  }, [location]);

  const mapUrl = location ? (() => {
    const delta = 0.01;
    const { latitude, longitude } = location;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - delta}%2C${latitude - delta}%2C${longitude + delta}%2C${latitude + delta}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  })() : '';

  const handleRequestSuccess = (req) => {
    setBooking(null);
    showToast('Your service request was submitted successfully! 🎉');
    navigate && navigate('requests');
  };

  const nearbyProfessionals = professionals.filter(professional => professional.distance_from_user != null && professional.distance_from_user <= nearbyLimitKm);

  const categoriesByName = new Map((Array.isArray(categories) ? categories : []).map(category => [category.name, category]));

  const renderProfessionalCard = (pro, allowDirectBooking = false) => (
    <div key={pro.id} className="pro-card fade-up">
      <div className="pro-header">
        <div className="pro-avatar">{pro.profile_photo ? <img src={pro.profile_photo} alt={pro.full_name} /> : pro.full_name.charAt(0).toUpperCase()}</div>
        <div>
          <div className="pro-name">{pro.full_name}</div>
          <span className="pro-category">{pro.category}</span>
        </div>
      </div>
      <div className="pro-meta">
        <span>📍 {pro.city || 'N/A'}{pro.state ? `, ${pro.state}` : ''}</span>
        <span>⭐ {pro.experience_years}y exp</span>
      </div>
      {pro.distance_from_user != null && (
        <div className="pro-distance"><MapPin size={14} /> {pro.distance_from_user < 1 ? `${Math.round(pro.distance_from_user * 1000)} m away` : `${pro.distance_from_user.toFixed(2)} km away`}</div>
      )}
      {pro.bio && <div className="pro-bio">{pro.bio}</div>}
      {allowDirectBooking && (
        <div className="professional-card-actions">
          <button className="btn-profile" onClick={() => setProfileProfessional(pro)}>View profile</button>
          <button className="btn-hire" onClick={() => setBooking({ professional: pro, category: selected.name, location })}>Book this professional</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="services-heading-row">
          <div>
            <h1 className="page-title">
              {activeGroup === 'all' ? t('services.find_service') : activeGroup}
            </h1>
            <p className="page-subtitle">
              {activeGroup === 'all'
                ? t('services.find_desc')
                : `Choose a ${activeGroup.toLowerCase()} service and connect with a trusted professional.`}
            </p>
          </div>
          {activeGroup !== 'all' && (
            <button className="show-all-services-btn" onClick={() => { setActiveGroup('all'); navigate && navigate('services'); }}>
              <Tags size={16} /> {t('services.show_all')}
            </button>
          )}
        </div>
      </div>

      {/* Location Status Badge */}
      <div className="location-badge-container">
        <button 
          className={`location-badge ${locationStatus === 'ready' ? 'ready' : 'pending'}`}
          onClick={() => setShowLocationModal(true)}
        >
          <MapPin size={16} />
          <span>
            {locationStatus === 'ready' 
              ? location?.placeName || t('services.location_found') 
              : t('services.enable_location')}
          </span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Category Group Selector Tabs */}
      {!selected && (
        <div className="services-group-tabs-scroll">
          <div className="services-group-tabs">
            <button 
              className={`services-group-tab ${activeGroup === 'all' ? 'active' : ''}`}
              onClick={() => setActiveGroup('all')}
            >
              <Tags size={15} />
              <span>{t('services.all_services')}</span>
            </button>
            <button 
              className={`services-group-tab ${activeGroup === 'Home Repairs' ? 'active' : ''}`}
              onClick={() => setActiveGroup('Home Repairs')}
            >
              <Wrench size={15} />
              <span>{t('services.home_repairs')}</span>
            </button>
            <button 
              className={`services-group-tab ${activeGroup === 'Personal Care' ? 'active' : ''}`}
              onClick={() => setActiveGroup('Personal Care')}
            >
              <Sparkles size={15} />
              <span>{t('services.personal_care')}</span>
            </button>
            <button 
              className={`services-group-tab ${activeGroup === 'Home Services' ? 'active' : ''}`}
              onClick={() => setActiveGroup('Home Services')}
            >
              <Home size={15} />
              <span>{t('services.home_services')}</span>
            </button>
            <button 
              className={`services-group-tab ${activeGroup === 'Education' ? 'active' : ''}`}
              onClick={() => setActiveGroup('Education')}
            >
              <Monitor size={15} />
              <span>{t('services.education')}</span>
            </button>
            <button 
              className={`services-group-tab ${activeGroup === 'Vehicle Services' ? 'active' : ''}`}
              onClick={() => setActiveGroup('Vehicle Services')}
            >
              <Car size={15} />
              <span>{t('services.vehicle_services')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Location Modal */}
      {showLocationModal && (
        <div className="modal-overlay" onClick={() => setShowLocationModal(false)}>
          <div className="location-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Your Location</h2>
              <button 
                className="modal-close" 
                onClick={() => setShowLocationModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="location-info-card">
                <div className="location-info-icon">
                  <MapPin size={24} />
                </div>
                <div className="location-info-text">
                  <h3>Current Location</h3>
                  <p>{locationStatus === 'ready'
                    ? `${location.placeName || 'Location found'} (accuracy about ${location.accuracy}m)`
                    : 'Enable location to see nearby professionals'}</p>
                </div>
              </div>

              {locationStatus !== 'ready' && (
                <button 
                  className="btn-enable-location" 
                  onClick={() => {
                    requestLocation().catch(() => {});
                  }} 
                  disabled={locationStatus === 'requesting'}
                >
                  {locationStatus === 'requesting' ? <RefreshCw size={16} className="spin" /> : <MapPin size={16} />}
                  {locationStatus === 'requesting' ? 'Finding your location...' : 'Enable Location Access'}
                </button>
              )}

              {locationError && <p className="location-modal-error">{locationError}</p>}

              {location && (
                <div className="location-map-container">
                  <iframe
                    title="Your current location"
                    className="location-map-modal"
                    src={mapUrl}
                    loading="lazy"
                  />
                  <p className="map-info"><strong>{location.placeName || 'Your current location'}</strong> is shown on the map. It's used to help you choose nearby professionals.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!selected && loadingCats ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <RefreshCw className="spin" size={32} color="var(--text-muted)" />
        </div>
      ) : !selected && (
        <>
          {/* Instant Sub-Category Live Filter */}

          {/* Instant Sub-Category Live Filter */}
          <div className="services-subcat-browser">
            <div className="services-subcat-search-row">
              <Search size={16} color="#64748b" />
              <input
                type="text"
                placeholder={t('services.search_subcat')}
                value={subcatSearch}
                onChange={(e) => setSubcatSearch(e.target.value)}
              />
              {subcatSearch && (
                <button 
                  type="button" 
                  className="services-subcat-search-clear" 
                  onClick={() => setSubcatSearch('')}
                >
                  ×
                </button>
              )}
            </div>

            {subcatSearch.trim() && (
              <div style={{ marginTop: 14 }}>
                <div className="subcat-search-results-header">
                  <h4>Matching Services ({filteredGlobalSubcats.length})</h4>
                </div>
                {filteredGlobalSubcats.length > 0 ? (
                  <div className="subcat-visual-grid">
                    {filteredGlobalSubcats.map((subcat) => (
                      <div key={`${subcat.category_name}-${subcat.name}`} className="subcat-visual-card fade-up">
                        <div className="subcat-visual-img-wrap">
                          <img
                            src={subcat.image_url}
                            alt={subcat.name}
                            className="subcat-visual-img"
                            loading="lazy"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = categoryImages[subcat.category_name] || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80';
                            }}
                          />
                          {subcat.price_estimate && (
                            <span className="subcat-price-badge">{subcat.price_estimate}</span>
                          )}
                        </div>
                        <div className="subcat-visual-body">
                          <div>
                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: categoryColors[subcat.category_name] || 'var(--accent-primary)', display: 'block', marginBottom: 2 }}>
                              {subcat.category_name}
                            </span>
                            <h4 className="subcat-visual-title">{subcat.name}</h4>
                          </div>
                          <div className="subcat-visual-actions">
                            <button
                              type="button"
                              className="btn-subcat-book"
                              onClick={() => setBooking({
                                professional: null,
                                category: subcat.category_name,
                                location,
                                initialTitle: subcat.name,
                                initialDescription: `I need assistance with ${subcat.name} (${subcat.price_estimate || 'Standard rate'}).`
                              })}
                            >
                              <Sparkles size={13} /> Book Service
                            </button>
                            <button
                              type="button"
                              className="btn-subcat-pros"
                              onClick={() => handleOpenSubcatPros(subcat)}
                            >
                              Find Pros <ChevronRight size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="subcat-search-empty">
                    No sub-categories matched &ldquo;{subcatSearch}&rdquo;. Try searching for &ldquo;leak&rdquo;, &ldquo;clean&rdquo;, &ldquo;paint&rdquo;, or &ldquo;wiring&rdquo;.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="subcategory-list">
            {serviceGroups
              .filter(group => activeGroup === 'all' || group.name === activeGroup)
              .flatMap(group => group.categories.map(name => categoriesByName.get(name) || {
                id: name,
                name,
                description: 'Browse available professionals',
              }))
              .map((cat, index) => {
                const CategoryIcon = categoryIcons[cat.name] || Tags;
                const iconColor = categoryColors[cat.name] || 'var(--accent-primary)';
                const dummyPrice = (14.25 + (index * 4.5)).toFixed(2);
                const serviceImg = categoryImages[cat.name] || categoryImages[cat.id];
                const catSubcatCount = subcategories.filter(s => s.category_name?.toLowerCase() === cat.name?.toLowerCase()).length;
                
                return (
                  <button
                    key={cat.id}
                    className={`subcategory-item ${selected?.id === cat.id ? 'selected' : ''}`}
                    onClick={() => handleCategoryClick(cat)}
                  >
                    <div className="subcategory-item-image">
                      {serviceImg ? (
                        <img 
                          src={serviceImg} 
                          alt={cat.name} 
                          className="subcategory-img-preview" 
                          loading="lazy" 
                          onError={(e) => {
                            e.target.onerror = null;
                            if (localCategoryFallbacks[cat.name]) {
                              e.target.src = localCategoryFallbacks[cat.name];
                            }
                          }}
                        />
                      ) : (
                        <CategoryIcon size={52} strokeWidth={1.5} color={iconColor} />
                      )}
                    </div>
                    <div className="subcategory-item-content">
                      <h3 className="subcategory-item-title">{cat.name}</h3>
                      <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600, display: 'block', marginTop: 1 }}>
                        {catSubcatCount > 0 ? `${catSubcatCount} sub-services` : 'Explore'}
                      </span>
                      <div className="subcategory-item-bottom">
                        <span className="subcategory-item-price">${dummyPrice} <small>/hr</small></span>
                        <div className="subcategory-item-add-btn">
                          <ChevronRight size={14} strokeWidth={3} />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </>
      )}

      {/* Category Overview & Sub-Categories Visual Showcase */}
      {selected && !selectedSubcat && (
        <div className="provider-selection-page fade-up">
          <button className="provider-back-btn" onClick={() => { setSelectedSubcat(null); setSelected(null); }}>
            <ArrowLeft size={16} /> {t('services.back_to_services')}
          </button>
          <div className="provider-selection-header">
            <div>
              <span className="service-group-eyebrow">{t('services.step_1')}</span>
              <h2>
              {(() => {
                const CategoryIcon = categoryIcons[selected.name] || Tags;
                return <CategoryIcon size={20} style={{ color: categoryColors[selected.name] || 'var(--accent-primary)', verticalAlign: 'middle', marginRight: 6 }} />;
              })()}
              {selected.name}
              </h2>
              <p>Select a specialized sub-service to book directly or explore dedicated verified professionals.</p>
            </div>
            <div className="provider-header-actions">
              {nearbyProfessionals.length > 0 && (
                <button
                  className="broadcast-request-btn"
                  onClick={() => setBooking({ professional: null, category: selected.name, location })}
                >
                  {t('services.auto_assign')}
                </button>
              )}
            </div>
          </div>

          {/* Sub-Categories Visual Showcase */}
          {(() => {
            const catSubcats = subcategories.filter(
              s => s.category_name?.toLowerCase() === selected.name?.toLowerCase()
            );
            if (catSubcats.length === 0) return null;

            return (
              <div className="cat-subcategories-section fade-up">
                <div className="cat-subcategories-header">
                  <div>
                    <span className="subcat-section-tag">{t('services.popular_services')}</span>
                    <h3 className="subcat-section-title">{t('services.select_specific')}</h3>
                    <p className="subcat-section-subtitle">
                      {t('services.visual_guide')}
                    </p>
                  </div>
                  <span className="subcat-count-pill">{catSubcats.length} Sub-Categories</span>
                </div>

                <div className="subcat-visual-grid">
                  {catSubcats.map((subcat) => (
                    <div key={subcat.id || subcat.name} className="subcat-visual-card fade-up">
                      <div className="subcat-visual-img-wrap">
                        <img
                          src={subcat.image_url}
                          alt={subcat.name}
                          className="subcat-visual-img"
                          loading="lazy"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = categoryImages[selected.name] || localCategoryFallbacks[selected.name];
                          }}
                        />
                        {subcat.price_estimate && (
                          <span className="subcat-price-badge">{subcat.price_estimate}</span>
                        )}
                      </div>
                      <div className="subcat-visual-body">
                        <h4 className="subcat-visual-title">{subcat.name}</h4>
                        <div className="subcat-visual-actions">
                          <button
                            type="button"
                            className="btn-subcat-book"
                            onClick={() => setBooking({
                              professional: null,
                              category: selected.name,
                              location,
                              initialTitle: subcat.name,
                              initialDescription: `I need assistance with ${subcat.name} (${subcat.price_estimate || 'Standard rate'}).`
                            })}
                          >
                            <Sparkles size={13} /> Book Service
                          </button>
                          <button
                            type="button"
                            className="btn-subcat-pros"
                            onClick={() => handleOpenSubcatPros(subcat)}
                          >
                            Find Pros <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* General category pros (available below showcase) */}
          <div style={{ marginTop: 36 }}>
            <div className="professional-section-heading">
              <div>
                <h3>{t('services.all_pros')}</h3>
                <p>{t('services.browse_pros')}</p>
              </div>
              <span className="section-count">{professionals.length}</span>
            </div>

            {loadingPros ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <RefreshCw className="spin" size={28} color="var(--text-muted)" />
              </div>
            ) : professionals.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: 40 }}>🔍</div>
                <h3>{t('services.no_pros')}</h3>
                <p>{t('services.no_pros_desc')}</p>
              </div>
            ) : (
              <div className="professionals-grid">
                {professionals.map(professional => renderProfessionalCard(professional, true))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dedicated Sub-Category Pros Page */}
      {selected && selectedSubcat && (() => {
        const catColor = categoryColors[selected.name] || 'var(--accent-primary)';
        const accentStyle = {
          '--subcat-accent-color': catColor,
          '--subcat-accent-bg': `${catColor}15`,
          '--subcat-accent-border': `${catColor}35`,
          '--subcat-accent-glow': `${catColor}20`,
          '--subcat-accent-shadow': `${catColor}40`,
        };
        const displayedPros = subcatProTab === 'nearby' ? nearbyProfessionals : professionals;

        return (
          <div className="subcat-pros-page fade-up" style={accentStyle}>
            {/* Top Navigation Bar */}
            <div className="subcat-pros-nav-bar">
              <button className="subcat-pros-back-btn" onClick={() => setSelectedSubcat(null)}>
                <ArrowLeft size={16} /> {t('services.back_to')} {selected.name}
              </button>
              <div className="subcat-pros-breadcrumb">
                <span style={{ cursor: 'pointer' }} onClick={() => { setSelected(null); setSelectedSubcat(null); }}>Services</span>
                <span>/</span>
                <span style={{ cursor: 'pointer' }} onClick={() => setSelectedSubcat(null)}>{selected.name}</span>
                <span>/</span>
                <span className="active">{selectedSubcat.name}</span>
              </div>
            </div>

            {/* Hero Showcase Card */}
            <div className="subcat-pros-hero">
              <div className="subcat-pros-hero-glow" />
              <div className="subcat-pros-hero-image-wrap">
                <img
                  src={selectedSubcat.image_url}
                  alt={selectedSubcat.name}
                  className="subcat-pros-hero-img"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = categoryImages[selected.name] || localCategoryFallbacks[selected.name];
                  }}
                />
                {selectedSubcat.price_estimate && (
                  <span className="subcat-pros-hero-badge">{selectedSubcat.price_estimate}</span>
                )}
              </div>
              <div className="subcat-pros-hero-body">
                <div className="subcat-pros-hero-eyebrow">
                  <Sparkles size={13} /> {selected.name} SPECIALIST DIRECTORY
                </div>
                <h2 className="subcat-pros-hero-title">{selectedSubcat.name}</h2>
                <p className="subcat-pros-hero-desc">
                  Showing verified professionals licensed and equipped for <strong>{selectedSubcat.name}</strong>. Choose a provider below or request an instant auto-assignment.
                </p>
                <div className="subcat-pros-hero-actions">
                  <button
                    className="btn-subcat-hero-book"
                    onClick={() => setBooking({
                      professional: null,
                      category: selected.name,
                      location,
                      initialTitle: selectedSubcat.name,
                      initialDescription: `I need assistance with ${selectedSubcat.name} (${selectedSubcat.price_estimate || 'Standard rate'}).`
                    })}
                  >
                    <Sparkles size={14} /> Direct Book This Service
                  </button>
                  {nearbyProfessionals.length > 0 && (
                    <button
                      className="btn-subcat-hero-auto"
                      onClick={() => setBooking({
                        professional: null,
                        category: selected.name,
                        location,
                        initialTitle: selectedSubcat.name,
                        initialDescription: `Auto-dispatch request for ${selectedSubcat.name} to nearest specialist.`
                      })}
                    >
                      <MapPin size={14} /> Auto-Assign Nearest Specialist
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Specialists Section */}
            <div className="subcat-pros-section-header">
              <div className="subcat-pros-header-title">
                <h3>Verified Specialists for {selectedSubcat.name}</h3>
                <p>Licensed & certified professionals ready to assist you across Kerala.</p>
              </div>
              <div className="subcat-pros-tabs">
                <button
                  className={`subcat-pros-tab-btn ${subcatProTab === 'all' ? 'active' : ''}`}
                  onClick={() => setSubcatProTab('all')}
                >
                  All Specialists ({professionals.length})
                </button>
                <button
                  className={`subcat-pros-tab-btn ${subcatProTab === 'nearby' ? 'active' : ''}`}
                  onClick={() => setSubcatProTab('nearby')}
                >
                  Nearby &le; {nearbyLimitKm}km ({nearbyProfessionals.length})
                </button>
              </div>
            </div>

            {loadingPros ? (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <RefreshCw className="spin" size={32} color={catColor} />
              </div>
            ) : displayedPros.length === 0 ? (
              <div className="subcat-pros-empty fade-up">
                <div className="subcat-pros-empty-icon">🔍</div>
                <h4>No verified specialists found {subcatProTab === 'nearby' ? `within ${nearbyLimitKm} km` : 'in this category yet'}</h4>
                <p>
                  {subcatProTab === 'nearby'
                    ? `No registered specialists were detected within ${nearbyLimitKm} km of your location. You can view all specialists or broadcast your request.`
                    : `No registered professionals are currently listed for this category. You can post a custom request and our network will be notified.`}
                </p>
                <button
                  className="btn-subcat-hero-book"
                  onClick={() => setBooking({
                    professional: null,
                    category: selected.name,
                    location,
                    initialTitle: selectedSubcat.name,
                    initialDescription: `I need assistance with ${selectedSubcat.name} (${selectedSubcat.price_estimate || 'Standard rate'}).`
                  })}
                >
                  <Sparkles size={14} /> Post Request For This Service
                </button>
              </div>
            ) : (
              <div className="subcat-pros-grid">
                {displayedPros.map((pro) => (
                  <div key={pro.id} className="subcat-pro-card fade-up">
                    <div className="subcat-pro-card-accent-bar" />
                    <div className="subcat-pro-card-header">
                      <div className="subcat-pro-avatar">
                        {pro.profile_photo ? (
                          <img src={pro.profile_photo} alt={pro.full_name} />
                        ) : (
                          pro.full_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="subcat-pro-info">
                        <div className="subcat-pro-name">{pro.full_name}</div>
                        <span className="subcat-pro-specialty-badge">
                          <CheckCircle2 size={11} /> {selectedSubcat.name} Pro
                        </span>
                      </div>
                    </div>

                    <div className="subcat-pro-meta-row">
                      <div className="subcat-pro-meta-item">
                        <span>⭐ {pro.experience_years || 1}y experience</span>
                      </div>
                      {pro.distance_from_user != null ? (
                        <div className="subcat-pro-distance-badge">
                          <MapPin size={13} />
                          <span>
                            {pro.distance_from_user < 1
                              ? `${Math.round(pro.distance_from_user * 1000)}m away`
                              : `${pro.distance_from_user.toFixed(1)} km away`}
                          </span>
                        </div>
                      ) : (
                        <div className="subcat-pro-meta-item">
                          <span>📍 {[pro.city, pro.state].filter(Boolean).join(', ') || 'Kerala'}</span>
                        </div>
                      )}
                    </div>

                    {pro.bio && <div className="subcat-pro-bio">{pro.bio}</div>}

                    <div className="subcat-pro-card-actions">
                      <button
                        type="button"
                        className="btn-subcat-pro-profile"
                        onClick={() => setProfileProfessional(pro)}
                      >
                        Profile
                      </button>
                      <button
                        type="button"
                        className="btn-subcat-pro-book"
                        onClick={() => setBooking({
                          professional: pro,
                          category: selected.name,
                          location,
                          initialTitle: selectedSubcat.name,
                          initialDescription: `Booking ${pro.full_name} for ${selectedSubcat.name} (${selectedSubcat.price_estimate || 'Standard rate'}).`
                        })}
                      >
                        <Sparkles size={13} /> Book Specialist
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Booking modal */}
      {booking && (
        <BookingModal
          professional={booking.professional}
          category={booking.category}
          currentLocation={booking.location}
          initialTitle={booking.initialTitle || ''}
          initialDescription={booking.initialDescription || ''}
          onClose={() => setBooking(null)}
          onSuccess={handleRequestSuccess}
        />
      )}


      {profileProfessional && (
        <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && setProfileProfessional(null)}>
          <div className="modal profile-modal fade-up">
            <div className="profile-modal-header">
              <div className="profile-modal-avatar">{profileProfessional.profile_photo ? <img src={profileProfessional.profile_photo} alt={profileProfessional.full_name} /> : profileProfessional.full_name.charAt(0).toUpperCase()}</div>
              <div>
                <h2 className="modal-title">{profileProfessional.full_name}</h2>
                <span className="pro-category">{profileProfessional.category}</span>
              </div>
              <button className="profile-close-btn" onClick={() => setProfileProfessional(null)} aria-label="Close profile">×</button>
            </div>
            <div className="profile-details">
              <div><BriefcaseBusiness size={16} /><strong>Experience</strong><span>{profileProfessional.experience_years || 0} years</span></div>
              <div><CheckCircle2 size={16} /><strong>Completed work</strong><span>{profileProfessional.completed_requests || 0} jobs</span></div>
              <div><MapPin size={16} /><strong>Location</strong><span>{[profileProfessional.city, profileProfessional.state].filter(Boolean).join(', ') || 'Not provided'}</span></div>
              {profileProfessional.distance_from_user != null && <div><MapPin size={16} /><strong>Distance</strong><span>{profileProfessional.distance_from_user.toFixed(2)} km away</span></div>}
            </div>
            <div className="profile-social-row">
              <span><Star size={16} fill="currentColor" /> Verified professional</span>
              {profileProfessional.instagram_url && <a href={profileProfessional.instagram_url} target="_blank" rel="noreferrer"><Link size={16} /> Instagram</a>}
            </div>
            <div className="profile-bio-block">
              <strong>About this professional</strong>
              <p>{profileProfessional.bio || 'No professional bio provided.'}</p>
            </div>
            <button className="btn-hire" onClick={() => { setProfileProfessional(null); setBooking({ professional: profileProfessional, category: selected.name, location }); }}>Book this professional</button>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}

export default Services;
