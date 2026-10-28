import { Geolocation } from "@capacitor/geolocation";
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  MapPin,
  Search as SearchIcon,
  Star,
  Wrench,
} from 'lucide-react';
import { API } from '../constants';
import { BookingModal } from '../components/BookingModal';
import { useToast, Toast } from '../components/Toast';

import plumbingIcon from '../assets/category-icons/plumbing.png';
import electricalIcon from '../assets/category-icons/electrical.png';
import acRepairIcon from '../assets/category-icons/ac_repair.png';
import carpentryIcon from '../assets/category-icons/carpentry.png';
import cleaningIcon from '../assets/category-icons/cleaning.png';
import mechanicIcon from '../assets/category-icons/mechanic.png';
import paintingIcon from '../assets/category-icons/painting.png';
import beautyWellnessIcon from '../assets/category-icons/beauty_wellness.png';

const SERVER_BASE = import.meta.env.DEV ? 'https://service-marketplace-af7p.onrender.com' : 'https://service-marketplace-af7p.onrender.com';

const TEAL = '#00796B';

const CATEGORY_META = {
  Plumbing: { label: 'Plumber', icon: plumbingIcon },
  Electrical: { label: 'Electrician', icon: electricalIcon },
  'AC & Appliances': { label: 'AC & Appliance Tech', icon: acRepairIcon },
  Cleaning: { label: 'Cleaning', icon: cleaningIcon },
  'Pest Control': { label: 'Pest Control', icon: cleaningIcon },
  'Home Improvement': { label: 'Home Improvement', icon: paintingIcon },
  Vehicle: { label: 'Mechanic', icon: mechanicIcon },
  'Personal & Daily Help': { label: 'Daily Help', icon: beautyWellnessIcon },
  'CCTV & Security': { label: 'Security Tech', icon: mechanicIcon },
  'Personal Care': { label: 'Beauty', icon: beautyWellnessIcon },
};

const SORT_OPTIONS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'rating', label: 'Top Rated' },
  { id: 'distance', label: 'Nearest' },
  { id: 'experience', label: 'Most Experienced' },
];

const resolvePhotoUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  if (path.startsWith('/')) return `${SERVER_BASE}${path}`;
  return `${SERVER_BASE}/uploads/${path}`;
};

const getProfessionLabel = (category) => CATEGORY_META[category]?.label || category || 'Professional';

const getHourlyRate = (pro) => {
  if (pro.formatted_hourly_rate) return pro.formatted_hourly_rate;
  if (pro.hourly_rate != null) return `₹${Math.round(pro.hourly_rate)}`;
  const base = 200 + Math.min(Number(pro.experience_years) || 0, 12) * 25;
  return `₹${base}`;
};

const getSkillTags = (pro) => {
  if (pro.sub_category) {
    const parts = pro.sub_category.split(/[,|/]+/).map(s => s.trim()).filter(Boolean);
    if (parts.length) return parts.slice(0, 4);
  }
  const tags = [pro.category].filter(Boolean);
  if (pro.experience_years > 0) tags.push(`${pro.experience_years}y Exp`);
  return tags.slice(0, 3);
};

function BrowseProfessionals({ navigate, initialCategory = null }) {
  const [allProfessionals, setAllProfessionals] = useState([]);
  const [loadingPros, setLoadingPros] = useState(true);
  const [activeCategory, setActiveCategory] = useState(initialCategory || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recommended');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationName, setLocationName] = useState('Thiruvananthapuram');
  const [booking, setBooking] = useState(null);
  const [profileProfessional, setProfileProfessional] = useState(null);
  const { toast, showToast } = useToast();

  const calculateDistanceInKm = (lat1, lon1, lat2, lon2) => {
    if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;
    const earthRadiusKm = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const requestLocation = () => new Promise(async (resolve, reject) => {
    try {
      const permissions = await Geolocation.requestPermissions();
      if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
        reject(new Error('Location permission denied'));
        return;
      }
      
      let position;
      try {
        position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      } catch (err) {
        position = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
      }
      const current = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setLocation(current);
      fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${current.latitude}&longitude=${current.longitude}&localityLanguage=en`)
        .then(r => r.json())
        .then(data => {
          const place = data.locality || data.city || data.principalSubdivision || 'Thiruvananthapuram';
            setLocationName(place);
          })
          .catch(() => {});
        resolve(current);
    } catch(e) {
      reject(new Error('Location denied'));
    }
  });

  const fetchAllProfessionals = async () => {
    setLoadingPros(true);
    try {
      const cityParam = locationName ? `?city=${encodeURIComponent(locationName)}` : '';
      const res = await fetch(`${API}/professionals${cityParam}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Invalid response');

      let loc = location;
      if (!loc) {
        try { loc = await requestLocation(); } catch { /* optional */ }
      }

      setAllProfessionals(data.map(pro => ({
        ...pro,
        profile_photo: resolvePhotoUrl(pro.profile_photo),
        distance_from_user: loc ? calculateDistanceInKm(
          loc.latitude,
          loc.longitude,
          Number(pro.work_latitude || pro.effective_latitude || pro.current_latitude || pro.registered_latitude),
          Number(pro.work_longitude || pro.effective_longitude || pro.current_longitude || pro.registered_longitude)
        ) : null,
      })));
    } catch {
      showToast('Failed to load professionals', 'error');
    } finally {
      setLoadingPros(false);
    }
  };

  useEffect(() => {
    fetchAllProfessionals();
    requestLocation().catch(() => {});
  }, [locationName]);

  useEffect(() => {
    if (initialCategory) setActiveCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    if (location && allProfessionals.some(p => p.distance_from_user == null)) {
      setAllProfessionals(prev => prev.map(pro => ({
        ...pro,
        distance_from_user: calculateDistanceInKm(
          location.latitude,
          location.longitude,
          Number(pro.work_latitude || pro.effective_latitude || pro.current_latitude || pro.registered_latitude),
          Number(pro.work_longitude || pro.effective_longitude || pro.current_longitude || pro.registered_longitude)
        ),
      })));
    }
  }, [location]);

  const categoryCards = useMemo(() => {
    const counts = {};
    allProfessionals.forEach(pro => {
      const cat = pro.category || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const cards = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => ({
        id: cat,
        label: CATEGORY_META[cat]?.label || cat,
        icon: CATEGORY_META[cat]?.icon || null,
        count,
      }));

    return [
      { id: 'all', label: 'All', icon: null, count: allProfessionals.length },
      ...cards,
    ];
  }, [allProfessionals]);

  const displayedProfessionals = useMemo(() => {
    let list = [...allProfessionals];

    if (activeCategory !== 'all') {
      list = list.filter(pro => pro.category === activeCategory);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(pro =>
        pro.full_name?.toLowerCase().includes(q)
        || pro.category?.toLowerCase().includes(q)
        || pro.sub_category?.toLowerCase().includes(q)
        || getProfessionLabel(pro.category).toLowerCase().includes(q)
        || pro.city?.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case 'rating':
        list.sort((a, b) => (Number(b.avg_rating) || 0) - (Number(a.avg_rating) || 0));
        break;
      case 'distance':
        list.sort((a, b) => {
          const da = a.distance_from_user ?? Infinity;
          const db = b.distance_from_user ?? Infinity;
          return da - db;
        });
        break;
      case 'experience':
        list.sort((a, b) => (Number(b.experience_years) || 0) - (Number(a.experience_years) || 0));
        break;
      default:
        list.sort((a, b) => (Number(b.experience_years) || 0) - (Number(a.experience_years) || 0));
    }

    return list;
  }, [allProfessionals, activeCategory, searchQuery, sortBy]);

  const handleRequestSuccess = () => {
    showToast('Your booking request was successfully posted!', 'success');
    setBooking(null);
  };

  const sortLabel = SORT_OPTIONS.find(o => o.id === sortBy)?.label || 'Recommended';

  return (
    <div className="browse-pros-page">
      {/* Header */}
      <header className="browse-header">
        <div className="browse-header-left">
          <button className="browse-back-btn" onClick={() => navigate('home')} aria-label="Go back">
            <ArrowLeft size={22} />
          </button>
          <div className="browse-title-area">
            <h1>Browse Professionals</h1>
            <p>Verified & skilled professionals near you</p>
          </div>
        </div>
        <div className="browse-header-right">
          <button className="browse-location-pill" type="button">
            <MapPin size={16} className="browse-location-icon" />
            <span>{locationName}</span>
            <ChevronDown size={14} />
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="browse-search-wrap">
        <div className="browse-search-input-box">
          <SearchIcon size={18} className="browse-search-icon" />
          <input
            type="text"
            placeholder="Search professionals (e.g. plumber, electrician...)"
            className="browse-search-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Category icon cards */}
      <div className="browse-categories-scroll">
        {categoryCards.map(cat => (
          <button
            key={cat.id}
            type="button"
            className={`browse-cat-pill ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            <div className="browse-cat-icon">
              {cat.id === 'all' ? (
                <Wrench size={22} strokeWidth={2} />
              ) : cat.icon ? (
                <img src={cat.icon} alt={cat.label} />
              ) : (
                <Wrench size={22} strokeWidth={2} />
              )}
            </div>
            <div className="browse-cat-text">
              <span className="browse-cat-label">{cat.label}</span>
              <span className="browse-cat-count">{cat.count}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Filter dropdowns */}
      <div className="browse-filters-scroll">
        <button
          type="button"
          className="browse-filter-btn"
          onClick={() => setShowSortMenu(v => !v)}
        >
          <ArrowDownUp size={14} />
          <div className="browse-filter-text">
            <span>Sort by</span>
            <strong>{sortLabel}</strong>
          </div>
          <ChevronDown size={14} />
        </button>
        {showSortMenu && (
          <div className="browse-sort-menu">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                className={sortBy === opt.id ? 'active' : ''}
                onClick={() => { setSortBy(opt.id); setShowSortMenu(false); }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
        <button type="button" className="browse-filter-btn">
          <Calendar size={14} />
          <div className="browse-filter-text">
            <span>Availability</span>
            <strong>Anytime</strong>
          </div>
          <ChevronDown size={14} />
        </button>
        <button type="button" className="browse-filter-btn">
          <Star size={14} />
          <div className="browse-filter-text">
            <span>Experience</span>
            <strong>Any</strong>
          </div>
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Professional list */}
      <div className="browse-pros-list">
        {loadingPros ? (
          <div className="browse-pros-loading">Loading professionals...</div>
        ) : displayedProfessionals.length === 0 ? (
          <div className="browse-pros-empty">
            {searchQuery.trim()
              ? 'No professionals match your search.'
              : 'No verified professionals found in this category.'}
          </div>
        ) : (
          displayedProfessionals.map(pro => {
            const skillTags = getSkillTags(pro);
            const rating = pro.avg_rating ? Number(pro.avg_rating).toFixed(1) : null;
            const reviewCount = Number(pro.review_count) || 0;

            return (
              <div key={pro.id} className="browse-pro-card">
                <div className="browse-pro-avatar">
                  {pro.profile_photo ? (
                    <img 
                      src={pro.profile_photo} 
                      alt={pro.full_name} 
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline'; }} 
                    />
                  ) : null}
                  <span style={{ display: pro.profile_photo ? 'none' : 'inline' }}>
                    {pro.full_name?.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="browse-pro-content">
                  <div className="browse-pro-header-row">
                    <div className="browse-pro-info-main">
                      <div className="browse-pro-verified">
                        <CheckCircle2 size={12} /> Verified
                      </div>
                      <h3 className="browse-pro-name">{pro.full_name}</h3>
                      <div className="browse-pro-category">{getProfessionLabel(pro.category)}</div>
                    </div>
                    <div className="browse-pro-top-right">
                      <div className="browse-pro-availability">
                        <Calendar size={12} /> Available Today
                      </div>
                      <div className="browse-pro-price">
                        <strong>{getHourlyRate(pro)}</strong> <span>/ hr</span>
                      </div>
                    </div>
                  </div>

                  <div className="browse-pro-meta-row">
                    <div className="browse-pro-rating">
                      <Star size={13} className="browse-pro-star" />
                      {rating && reviewCount > 0 ? (
                        <>
                          <strong>{rating}</strong>
                          <span>({reviewCount} reviews)</span>
                        </>
                      ) : (
                        <>
                          <strong>New</strong>
                          <span>(0 reviews)</span>
                        </>
                      )}
                    </div>
                    <div className="browse-pro-location">
                      <MapPin size={12} />
                      <span>
                        {pro.distance_from_user != null
                          ? `${pro.distance_from_user.toFixed(1)} km`
                          : [pro.work_location_name || pro.city, pro.work_location_name ? null : pro.state].filter(Boolean).join(', ') || 'Kerala'}
                      </span>
                      <span className="browse-pro-dot">•</span>
                      <Clock size={12} />
                      <span>Usually responds in 15 mins</span>
                    </div>
                  </div>

                  <div className="browse-pro-footer-row">
                    <div className="browse-pro-skills">
                      {skillTags.map((tag, i) => (
                        <span key={i} className={`browse-pro-skill-pill${i > 0 ? ' extra' : ''}`}>{tag}</span>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="browse-pro-view-btn"
                      onClick={() => setProfileProfessional(pro)}
                    >
                      View Profile <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

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
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setProfileProfessional(null)}>
          <div className="modal profile-modal fade-up">
            <div className="profile-modal-header">
              <div className="profile-modal-avatar">
                {profileProfessional.profile_photo ? (
                  <img src={profileProfessional.profile_photo} alt={profileProfessional.full_name} />
                ) : (
                  profileProfessional.full_name?.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h2 className="modal-title">{profileProfessional.full_name}</h2>
                <span className="pro-category">{getProfessionLabel(profileProfessional.category)}</span>
              </div>
              <button className="profile-close-btn" onClick={() => setProfileProfessional(null)} aria-label="Close">&times;</button>
            </div>
            <div className="profile-details">
              <div><BriefcaseBusiness size={16} /><strong>Experience</strong><span>{profileProfessional.experience_years || 0} years</span></div>
              <div><CheckCircle2 size={16} /><strong>Completed work</strong><span>{profileProfessional.completed_requests || 0} jobs</span></div>
              {profileProfessional.avg_rating && Number(profileProfessional.review_count) > 0 && (
                <div><Star size={16} /><strong>Rating</strong><span>{Number(profileProfessional.avg_rating).toFixed(1)} ({profileProfessional.review_count} reviews)</span></div>
              )}
              <div><MapPin size={16} /><strong>Location</strong><span>{profileProfessional.work_location_name || [profileProfessional.city, profileProfessional.state].filter(Boolean).join(', ') || 'Kerala'}</span></div>
              {profileProfessional.distance_from_user != null && (
                <div><MapPin size={16} /><strong>Distance</strong><span>{profileProfessional.distance_from_user.toFixed(1)} km away</span></div>
              )}
              <div><strong style={{ marginLeft: 24 }}>Rate</strong><span>{getHourlyRate(profileProfessional)} / hr</span></div>
            </div>
            <div className="profile-social-row">
              <span><Star size={16} fill="currentColor" /> Verified professional</span>
            </div>
            <div className="profile-bio-block">
              <strong>About this professional</strong>
              <p>{profileProfessional.bio || 'No professional bio provided.'}</p>
            </div>
            <button
              className="btn-hire"
              style={{ background: TEAL }}
              onClick={() => {
                setProfileProfessional(null);
                setBooking({
                  professional: profileProfessional,
                  category: profileProfessional.category,
                  location,
                  initialTitle: `${profileProfessional.category || 'Service'} Booking`,
                  initialDescription: `Booking ${profileProfessional.full_name} for a service.`,
                });
              }}
            >
              Book this professional
            </button>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}

export default BrowseProfessionals;
