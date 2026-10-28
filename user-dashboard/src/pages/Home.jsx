import { Geolocation } from "@capacitor/geolocation";
import { useEffect, useState, useRef } from 'react';
import {
  Bell,
  ChevronRight,
  MapPin,
  Search,
  Star,
  Heart,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Wrench,
  Zap,
  Wind,
  Hammer,
  Sparkles,
  Brush,
  Car,
  Camera,
  Cpu,
  MoreHorizontal,
  Navigation,
  Clock,
  UserRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API } from '../constants';
import { useToast, Toast } from '../components/Toast';
import BookingModal from '../components/BookingModal';

import heroBg from '../assets/hero_worker.jpg';

import plumbingIcon from '../assets/category-icons/plumbing.png';
import electricalIcon from '../assets/category-icons/electrical.png';
import acRepairIcon from '../assets/category-icons/ac_repair.png';
import carpentryIcon from '../assets/category-icons/carpentry.png';
import cleaningIcon from '../assets/category-icons/cleaning.png';
import paintingIcon from '../assets/category-icons/painting.png';
import mechanicIcon from '../assets/category-icons/mechanic.png';
import cctvIcon from '../assets/category-icons/cctv.png';
import applianceRepairIcon from '../assets/category-icons/appliance_repair.png';
import beautyWellnessIcon from '../assets/category-icons/beauty_wellness.png';
import landscapingIcon from '../assets/category-icons/landscaping.png';
import otherServicesIcon from '../assets/category-icons/other_services.png';

const SERVER_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'https://service-marketplace-af7p.onrender.com' : 'https://service-marketplace-af7p.onrender.com');
const FALLBACK_SERVER = SERVER_BASE.includes('localhost') ? 'https://service-marketplace-af7p.onrender.com' : 'https://service-marketplace-af7p.onrender.com';

const resolveProPhoto = (path) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${SERVER_BASE}${cleanPath}`;
};

const CATEGORIES = [
  { id: 'plumbing',         label: 'Plumbing',         icon: plumbingIcon,        bg: '#E0F2FE', color: '#0284C7', category: 'Plumbing' },
  { id: 'ac_appliances',    label: 'AC & Appliances',  icon: applianceRepairIcon, bg: '#D0E5F3', color: '#2F80C0', category: 'AC & Appliances' },
  { id: 'cleaning',         label: 'Cleaning',         icon: cleaningIcon,        bg: '#BFE8CC', color: '#4FA66A', category: 'Cleaning' },
  { id: 'pest_control',     label: 'Pest Control',     icon: otherServicesIcon,   bg: '#FEE2E2', color: '#B91C1C', category: 'Pest Control' },
  { id: 'home_improvement', label: 'Improvement',      icon: paintingIcon,        bg: '#FFE9D0', color: '#D97706', category: 'Home Improvement' },
  { id: 'vehicle',          label: 'Vehicle',          icon: mechanicIcon,        bg: '#E2E8F0', color: '#475569', category: 'Vehicle' },
  { id: 'personal_help',    label: 'Personal Help',    icon: beautyWellnessIcon,  bg: '#F3D4E0', color: '#C0527A', category: 'Personal & Daily Help' },
  { id: 'electrical',       label: 'Electrical',       icon: electricalIcon,      bg: '#FEF3C7', color: '#B45309', category: 'Electrical' },
  { id: 'cctv',             label: 'CCTV & Security',  icon: cctvIcon,            bg: '#F0EFFD', color: '#5B56B3', category: 'CCTV & Security' },
  { id: 'gardening',        label: 'Gardening',        icon: landscapingIcon,     bg: '#DCFCE7', color: '#15803D', category: 'Gardening & Landscaping' },
  { id: 'more',             label: 'More',             icon: otherServicesIcon,   bg: '#F7F7F7', color: '#777777', category: null },
];

const HERO_SLIDES = [
  {
    pill: 'Trusted Professionals',
    title: 'Find the Right\nService, Right\nNear You',
    sub: 'Verified professionals, fair prices and quality service — all in one place.',
    btn: 'Explore Services',
  },
  {
    pill: '30-Day Warranty',
    title: 'Quality Work,\nGuaranteed\nEvery Time',
    sub: 'All services come with a satisfaction guarantee and upfront pricing.',
    btn: 'Book Now',
  },
  {
    pill: 'Live Tracking',
    title: 'Real-Time Updates\nFrom Your\nProfessional',
    sub: 'Track your expert in real time and know exactly when they arrive.',
    btn: 'See How It Works',
  },
];

const SAMPLE_PROS = [
  { id: 1, full_name: 'Ramesh Kumar',   category: 'Plumbing',            hourly_rate: 300, distance_km: 1.2, rating: 4.9, reviews: 142, avatar: null, fav: false },
  { id: 2, full_name: 'Arun S',         category: 'Electrical',          hourly_rate: 350, distance_km: 2.1, rating: 4.8, reviews: 98,  avatar: null, fav: false },
  { id: 3, full_name: 'Anjali S',       category: 'Cleaning Specialist', hourly_rate: 250, distance_km: 2.5, rating: 4.9, reviews: 213, avatar: null, fav: false },
  { id: 4, full_name: 'Vijay M',        category: 'AC Repair',           hourly_rate: 400, distance_km: 3.0, rating: 4.7, reviews: 76,  avatar: null, fav: false },
];

const AVATAR_COLORS = ['#625DB5', '#4FA66A', '#D97706', '#2F80C0', '#C0527A'];

function Home({ navigate, unreadCount = 0, user: userProp }) {
  const [locationName, setLocationName] = useState('Thiruvananthapuram');
  const [currentCoords, setCurrentCoords] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [bookingModalConfig, setBookingModalConfig] = useState(null);
  const [topPros, setTopPros] = useState(SAMPLE_PROS);
  const [favs, setFavs] = useState({});
  const [activeBooking, setActiveBooking] = useState(null);
  const { toast, showToast } = useToast();
  const { t } = useTranslation();
  const user = userProp || (() => { try { return JSON.parse(localStorage.getItem('userData') || '{}'); } catch { return {}; } })();

  // Fetch real professionals with local location wages
  useEffect(() => {
    const cityParam = locationName ? `?city=${encodeURIComponent(locationName)}` : '';
    fetch(`${API}/professionals${cityParam}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((p, idx) => ({
            id: p.id,
            full_name: p.full_name || 'Verified Professional',
            category: p.category || 'Home Services',
            rating: Number(p.avg_rating) || 4.8,
            reviews: Number(p.review_count) || 0,
            hourly_rate: p.hourly_rate != null ? Math.round(Number(p.hourly_rate)) : (200 + Math.min(Number(p.experience_years) || 0, 12) * 25),
            distance_km: p.distance_from_user || (1.2 + idx * 0.8).toFixed(1),
            avatar: resolveProPhoto(p.profile_photo),
            fav: false,
          }));
          setTopPros(mapped);
        }
      })
      .catch(() => {});
  }, [locationName]);

  // Detect location
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const perms = await Geolocation.requestPermissions();
        if (perms.location !== 'granted' && perms.coarseLocation !== 'granted') return;
        
        let pos;
        try {
          pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
        } catch (err) {
          pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
        }
        setCurrentCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=18&addressdetails=1`)
          .then((r) => r.json())
          .then((d) => {
            const addr = d.address || {};
            setLocationName(addr.neighbourhood || addr.suburb || addr.village || addr.town || addr.city || addr.county || 'Thiruvananthapuram');
          })
          .catch(() => {});
      } catch(e) {}
    }
    fetchLocation();
  }, []);

  // Check active booking
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    if (!token) return;
    fetch(`${API}/requests`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          const active = data.find((r) => ['accepted', 'in_progress'].includes(r.status));
          if (active) setActiveBooking(active);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-advance hero slides
  useEffect(() => {
    const t = setInterval(() => setCurrentSlide((p) => (p + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const openBookingFor = (category, title = '') => {
    setBookingModalConfig({
      category,
      initialTitle: title,
      currentLocation: currentCoords ? { ...currentCoords, placeName: locationName } : { placeName: locationName },
    });
  };

  const toggleFav = (id) => setFavs((p) => ({ ...p, [id]: !p[id] }));

  const avatarInitial = (name) => (name || 'P').charAt(0).toUpperCase();

  return (
    <div className="hn-root">

      {/* ── Active booking banner ── */}
      {activeBooking && (
        <div className="hn-active-banner" onClick={() => navigate('requests')}>
          <Navigation size={14} />
          <span>{activeBooking.professional_name || 'Professional'} is on the way</span>
          <span className="hn-active-banner-cta">Track Live →</span>
        </div>
      )}

      {/* ══════════════════════════
          TOP HEADER
      ══════════════════════════ */}
      <header className="hn-header">
        <div className="hn-header-left">
          <div className="hn-location-row">
            <MapPin size={14} className="hn-location-pin" />
            <span className="hn-location-city">{locationName}</span>
            <ChevronRight size={13} className="hn-location-chevron" />
          </div>
          <p className="hn-location-sub">Find trusted professionals near you</p>
        </div>
        <div className="hn-header-actions">
          <button className="hn-bell-btn" onClick={() => navigate('notifications')} aria-label="Notifications">
            <Bell size={18} />
            {unreadCount > 0 && <span className="hn-bell-dot" />}
          </button>
          {(() => {
            const currentPhoto = user?.profile_photo || localStorage.getItem('user_profile_photo');
            return (
              <button className="hn-avatar-btn" onClick={() => navigate('profile')} aria-label="Profile">
                {currentPhoto ? (
                  <img 
                    src={resolveProPhoto(currentPhoto)} 
                    alt="avatar" 
                    className="hn-avatar-img" 
                    onError={(e) => {
                      if (!e.target.dataset.fallbackTried && currentPhoto && !currentPhoto.startsWith('http') && !currentPhoto.startsWith('data:')) {
                        e.target.dataset.fallbackTried = 'true';
                        const cleanPath = currentPhoto.startsWith('/') ? currentPhoto : `/${currentPhoto}`;
                        e.target.src = `${FALLBACK_SERVER}${cleanPath}`;
                        return;
                      }
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <span className="hn-avatar-fallback" style={{ display: currentPhoto ? 'none' : 'flex' }}>
                  {avatarInitial(user?.full_name || user?.name)}
                </span>
              </button>
            );
          })()}
        </div>
      </header>

      {/* ══════════════════════════
          SEARCH BAR
      ══════════════════════════ */}
      <div className="hn-search-wrap">
        <div className="hn-search-bar">
          <Search size={17} className="hn-search-icon" />
          <input
            className="hn-search-input"
            placeholder="Search for services (e.g. plumber, electrician, cleaning...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && navigate('services')}
          />
        </div>
      </div>

      {/* ══════════════════════════
          HERO BANNER CAROUSEL
      ══════════════════════════ */}
      <section className="hn-hero-wrap">
        <div className="hn-hero-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
          {HERO_SLIDES.map((slide, i) => (
            <div key={i} className="hn-hero-card">
              {/* Decorative blobs */}
              <div className="hn-hero-blob hn-hero-blob-1" />
              <div className="hn-hero-blob hn-hero-blob-2" />

              {/* Left content */}
              <div className="hn-hero-content">
                <span className="hn-hero-pill">{slide.pill}</span>
                <h1 className="hn-hero-title">{slide.title}</h1>
                <p className="hn-hero-sub">{slide.sub}</p>
                <button
                  className="hn-hero-btn"
                  onClick={() => navigate('services')}
                >
                  {slide.btn} <ArrowRight size={15} />
                </button>
                <span className="hn-hero-handwritten">Your Local Service Hub</span>
              </div>

              {/* Right — worker image */}
              <div className="hn-hero-visual">
                <img src={heroBg} alt="Service Professional" className="hn-hero-img" />
              </div>
            </div>
          ))}
        </div>

        {/* Pagination dots */}
        <div className="hn-hero-dots">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              className={`hn-hero-dot${i === currentSlide ? ' active' : ''}`}
              onClick={() => setCurrentSlide(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* ══════════════════════════
          BROWSE BY CATEGORY
      ══════════════════════════ */}
      <section className="hn-section">
        <div className="hn-section-header">
          <h2 className="hn-section-title">{t('home.browse_by_category')}</h2>
          <button className="hn-see-all" onClick={() => navigate('services')}>
            {t('home.view_all')} <ChevronRight size={14} />
          </button>
        </div>

        <div className="hn-category-grid">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className="hn-cat-item"
              onClick={() => cat.category ? openBookingFor(cat.category) : navigate('services')}
            >
              <div className="hn-cat-icon-wrap" style={{ background: cat.bg }}>
                <img src={cat.icon} alt={cat.label} className="hn-cat-icon" />
              </div>
              <span className="hn-cat-label">{t(`service_items.${cat.id}`, { defaultValue: cat.label })}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ══════════════════════════
          TOP RATED PROFESSIONALS
      ══════════════════════════ */}
      <section className="hn-section">
        <div className="hn-section-header">
          <div>
            <h2 className="hn-section-title">{t('home.top_rated_near')}</h2>
            <p className="hn-section-sub">{t('home.verified_trusted')}</p>
          </div>
          <button className="hn-see-all" onClick={() => navigate('professionals')}>
            {t('home.view_all')} <ChevronRight size={14} />
          </button>
        </div>

        <div className="hn-pros-scroll">
          {topPros.slice(0, 6).map((pro, idx) => (
            <div
              key={pro.id}
              className="hn-pro-card"
              onClick={() => openBookingFor(pro.category, '')}
            >
              {/* Image / avatar */}
              <div className="hn-pro-card-img-wrap">
                {pro.avatar ? (
                  <img 
                    src={pro.avatar} 
                    alt={pro.full_name} 
                    className="hn-pro-card-img" 
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} 
                  />
                ) : null}
                
                <div
                  className="hn-pro-card-avatar"
                  style={{ 
                    background: AVATAR_COLORS[idx % AVATAR_COLORS.length],
                    display: pro.avatar ? 'none' : 'flex'
                  }}
                >
                  {avatarInitial(pro.full_name)}
                </div>
                <button
                  className="hn-pro-fav-btn"
                  onClick={(e) => { e.stopPropagation(); toggleFav(pro.id); }}
                  aria-label="Favourite"
                >
                  <Heart
                    size={14}
                    fill={favs[pro.id] ? '#E53E3E' : 'none'}
                    stroke={favs[pro.id] ? '#E53E3E' : '#ffffff'}
                  />
                </button>
                <div className="hn-pro-rating-badge">
                  <Star size={11} fill="#F59E0B" stroke="none" />
                  <span>{pro.rating}</span>
                </div>
              </div>

              {/* Info */}
              <div className="hn-pro-card-body">
                <strong className="hn-pro-name">{pro.full_name}</strong>
                <span className="hn-pro-category">{pro.category}</span>
                <div className="hn-pro-meta-row">
                  <span className="hn-pro-rate">₹{pro.hourly_rate}/hr</span>
                  <span className="hn-pro-dist">{pro.distance_km} km</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════
          BOOKING CTA CARD
      ══════════════════════════ */}
      <section className="hn-section" style={{ paddingBottom: 8 }}>
        <div className="hn-cta-card">
          <div className="hn-cta-icon-wrap">
            <CalendarCheck size={28} strokeWidth={1.8} />
          </div>
          <h3 className="hn-cta-title">{t('home.need_service_today')}</h3>
          <p className="hn-cta-sub">
            {t('home.book_in_just')}
          </p>
          <button className="hn-cta-btn" onClick={() => navigate('services')}>
            {t('home.book_now')} <ArrowRight size={15} />
          </button>
        </div>
      </section>

      {/* Booking modal */}
      {bookingModalConfig && (
        <BookingModal
          category={bookingModalConfig.category}
          initialTitle={bookingModalConfig.initialTitle}
          currentLocation={bookingModalConfig.currentLocation}
          onClose={() => setBookingModalConfig(null)}
          onSuccess={() => {
            setBookingModalConfig(null);
            showToast('Service booked successfully!', 'success');
            navigate('requests');
          }}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}

export default Home;

