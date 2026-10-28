import { useState, useEffect, useRef, useMemo } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import {
  X,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Check,
  Plus,
  Search,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Phone,
  CreditCard,
  Wallet,
  Banknote,
  Copy,
  Wrench,
  Loader2,
  Info,
  Building,
  Navigation as NavigationIcon,
  House,
  Briefcase,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { API, categoryIcons } from '../constants';

// Comprehensive default fallback subcategories matching database for all active categories
const CATEGORY_DEFAULT_SUBCATEGORIES = {
  'Plumbing': [
    'Pipe leak & burst repair',
    'Tap, faucet & mixer fix',
    'Drain & sewer unclogging',
    'Toilet & cistern repair',
    'Water heater & geyser service',
    'Water tank cleaning & sanitization',
    'Motor & water pump repair',
    'Bathroom & kitchen pipe fitting',
  ],
  'Vehicle': [
    'Bike mechanic',
    'Car mechanic',
    'Car wash/detailing',
    'Battery/jump-start',
    'Tyre/puncture service',
    'Vehicle recovery services',
  ],
  'Electrical': [
    'Switch, Socket & Dimmer Repair',
    'Ceiling Fan Fitting & Repair',
    'Chandelier & Designer Lighting',
    'Circuit Breaker & MCB Fuse Box',
    'Complete House Rewiring',
    'Inverter & UPS Setup',
  ],
  'AC & Appliances': [
    'AC service',
    'AC repair',
    'Refrigerator',
    'Washing machine',
    'Microwave',
    'Geyser',
    'TV',
    'RO/water purifier',
  ],
  'Cleaning': [
    'Full house cleaning',
    'Bathroom cleaning',
    'Kitchen cleaning',
    'Sofa cleaning',
    'Carpet cleaning',
    'Move-in/move-out cleaning',
    'Basic Express House Cleaning',
    'Intensive Home Deep Clean & Scrub',
  ],
  'Pest Control': [
    'Cockroach',
    'Termite',
    'Mosquito',
    'Rodent',
    'General pest control',
  ],
  'Home Improvement': [
    'Painting',
    'Wall repair',
    'Tile work',
    'Waterproofing',
    'Wallpaper',
    'False ceiling',
  ],
  'Personal & Daily Help': [
    'Barber',
    'Beauty services',
    'Home tutor',
    'Cook',
    'Elder care',
    'Babysitter',
    'Driver',
  ],
  'Personal Care': [
    "Men's Haircut & Beard Grooming",
    'Bridal Makeup & Traditional Styling',
    'Facial, Bleach & Skin Glow Spa',
    'Hair Spa, Coloring & Keratin Care',
    'Manicure, Pedicure & Nail Art',
    'Barber and Beautician Services',
  ],
  'CCTV & Security': [
    'HD Dome & Bullet CCTV Installation',
    'DVR / NVR & Mobile Remote Setup',
    'Smart Video Doorbell Fitting',
    'Biometric & Smart Digital Door Lock',
    'Motion Sensor & Alarm System',
    'Security Camera Wiring & Repair',
  ],
  'Gardening & Landscaping': [
    'Lawn Mowing & Turf Care',
    'Garden Weeding & Soil Enrichment',
    'Hedge Trimming & Shrub Shaping',
    'Plant Pest & Fungus Control',
    'Landscape & Patio Garden Design',
    'Automatic Drip Irrigation Setup',
  ],
  'Computer & Mobile Repair': [
    'Laptop Screen & Battery Swap',
    'Virus Removal & OS Reinstallation',
    'Smartphone Screen & Glass Repair',
    'Data Recovery & Hard Drive Backup',
    'RAM & NVMe SSD Storage Upgrade',
    'Wi-Fi Router & Network Setup',
  ],
  'Photography & Videography': [
    'Wedding & Engagement Photography',
    'Family & Newborn Studio Portrait',
    'E-commerce Product & Brand Shoot',
    '4K Drone Aerial Videography',
    'Birthday, Gala & Party Coverage',
    'Video Editing & Color Grading',
  ],
};

const CATEGORY_TAGLINES = {
  'Plumbing': 'Fix leaking pipes, taps, faucets, drainage and sanitary fittings.',
  'Vehicle': 'Doorstep bike & car servicing, emergency recovery & detailing.',
  'Electrical': 'Safe wiring, switch repairs, fan installation & electrical setups.',
  'AC & Appliances': 'AC servicing, gas refills, and home appliance repairs.',
  'Cleaning': 'Deep home cleaning, bathroom descaling & sanitization.',
  'Pest Control': 'Targeted eradication for cockroaches, termites & pests.',
  'Home Improvement': 'Painting, waterproofing, wall repair, and false ceiling.',
  'Personal & Daily Help': 'Verified home tutors, barbers, cooks, and daily helpers.',
  'Personal Care': 'Salon, beauty styling, grooming, and wellness care.',
  'CCTV & Security': 'CCTV installation, smart locks, and security alarms.',
  'Gardening & Landscaping': 'Lawn mowing, pruning, garden care & drip irrigation.',
  'Computer & Mobile Repair': 'Hardware repairs, virus removal, and network setup.',
  'Photography & Videography': 'Event photography, portraits, and video production.',
};

const ENGLISH_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Comprehensive default Kerala District Pricing Tiers
const DEFAULT_DISTRICT_TIERS = {
  'Kasaragod': { markup: 0, tier: 'Current Pricing (Standard)' },
  'Pathanamthitta': { markup: 0, tier: 'Current Pricing (Standard)' },
  'Idukki': { markup: 0, tier: 'Current Pricing (Standard)' },
  'Wayanad': { markup: 0, tier: 'Current Pricing (Standard)' },
  'Kannur': { markup: 0, tier: 'Current Pricing (Standard)' },
  'Palakkad': { markup: 0, tier: 'Current Pricing (Standard)' },
  'Thrissur': { markup: 20, tier: 'Tier 2 (+20% Surge)' },
  'Kollam': { markup: 20, tier: 'Tier 2 (+20% Surge)' },
  'Alappuzha': { markup: 20, tier: 'Tier 2 (+20% Surge)' },
  'Kottayam': { markup: 20, tier: 'Tier 2 (+20% Surge)' },
  'Malappuram': { markup: 20, tier: 'Tier 2 (+20% Surge)' },
  'Ernakulam': { markup: 30, tier: 'Tier 3 (+30% Surge)' },
  'Thiruvananthapuram': { markup: 30, tier: 'Tier 3 (+30% Surge)' },
  'Kozhikode': { markup: 30, tier: 'Tier 3 (+30% Surge)' },
};

const DISTRICT_CENTERS = {
  'Kasaragod': { latitude: 12.5102, longitude: 75.0000 },
  'Kannur': { latitude: 11.8745, longitude: 75.3704 },
  'Wayanad': { latitude: 11.6103, longitude: 76.0827 },
  'Kozhikode': { latitude: 11.2588, longitude: 75.7804 },
  'Malappuram': { latitude: 11.0510, longitude: 76.0711 },
  'Palakkad': { latitude: 10.7867, longitude: 76.6548 },
  'Thrissur': { latitude: 10.5276, longitude: 76.2144 },
  'Ernakulam': { latitude: 9.9816, longitude: 76.2999 },
  'Idukki': { latitude: 9.8497, longitude: 76.9806 },
  'Kottayam': { latitude: 9.5916, longitude: 76.5222 },
  'Alappuzha': { latitude: 9.4981, longitude: 76.3388 },
  'Pathanamthitta': { latitude: 9.2648, longitude: 76.7870 },
  'Kollam': { latitude: 8.8932, longitude: 76.6141 },
  'Thiruvananthapuram': { latitude: 8.5241, longitude: 76.9366 },
};

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
  'kannur': 'Kannur',
};

const detectDistrictFromTextOrCoords = (text, coords) => {
  if (text && typeof text === 'string') {
    const lower = text.toLowerCase();
    for (const [alias, standard] of Object.entries(DISTRICT_ALIASES)) {
      const regex = new RegExp(`\\b${alias}\\b`, 'i');
      if (regex.test(lower)) {
        return standard;
      }
    }
  }
  const lat = Number(coords?.latitude);
  const lon = Number(coords?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    let closest = 'Thiruvananthapuram';
    let minD = Infinity;
    for (const [dist, c] of Object.entries(DISTRICT_CENTERS)) {
      const dLat = (c.latitude - lat) * Math.PI / 180;
      const dLon = (c.longitude - lon) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(c.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      const d = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (d < minD) {
        minD = d;
        closest = dist;
      }
    }
    if (minD <= 90) return closest;
  }
  return 'Thiruvananthapuram';
};

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

const detectCityAndDistrictFromTextOrCoords = (text, coords) => {
  if (text && typeof text === 'string') {
    const lower = text.toLowerCase();
    for (const [key, val] of Object.entries(KERALA_CITIES_MAP)) {
      const regex = new RegExp(`\\b${key}\\b`, 'i');
      if (regex.test(lower)) {
        return val;
      }
    }
  }
  const dist = detectDistrictFromTextOrCoords(text, coords);
  return { city: dist, district: dist };
};

const SERVER_BASE = import.meta.env.DEV ? 'https://service-marketplace-af7p.onrender.com' : 'https://service-marketplace-af7p.onrender.com';

export function BookingModal({
  professional = null,
  category = 'Plumbing',
  currentLocation = null,
  initialTitle = '',
  initialDescription = '',
  subcategories: propSubcategories = null,
  categories: propCategories = null,
  onClose,
  onSuccess,
}) {
  // Step 1 to 9 matching Visily Multiscreens
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Form State
  const [serviceCategory, setServiceCategory] = useState(category || 'Plumbing');
  const [isChangingCategory, setIsChangingCategory] = useState(false);
  const [dbSubcategories, setDbSubcategories] = useState(
    Array.isArray(propSubcategories) && propSubcategories.length > 0 ? propSubcategories : []
  );
  const [dbCategories, setDbCategories] = useState(
    Array.isArray(propCategories) && propCategories.length > 0 ? propCategories : []
  );

  // Load subcategories dynamically from API if not provided in props
  useEffect(() => {
    if (propSubcategories && propSubcategories.length > 0) {
      setDbSubcategories(propSubcategories);
    } else {
      fetch(`${API}/subcategories`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setDbSubcategories(data);
        })
        .catch((err) => console.error('Failed to fetch subcategories for booking modal:', err));
    }
  }, [propSubcategories]);

  // Load categories dynamically from API if not provided in props
  useEffect(() => {
    if (propCategories && propCategories.length > 0) {
      setDbCategories(propCategories);
    } else {
      fetch(`${API}/categories`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setDbCategories(data);
        })
        .catch((err) => console.error('Failed to fetch categories for booking modal:', err));
    }
  }, [propCategories]);

  // Available categories list for changing category
  const activeCategoryList = useMemo(() => {
    if (dbCategories && dbCategories.length > 0) {
      const names = dbCategories.map((c) => c.name || c).filter(Boolean);
      return Array.from(new Set(names));
    }
    return Object.keys(CATEGORY_DEFAULT_SUBCATEGORIES);
  }, [dbCategories]);

  // Filter ONLY AND ALL subcategories for the particular serviceCategory
  const availableSubServices = useMemo(() => {
    if (!serviceCategory) return [];
    const targetNorm = serviceCategory.trim().toLowerCase();

    if (dbSubcategories && dbSubcategories.length > 0) {
      const matched = dbSubcategories
        .filter((sub) => {
          const catName = (sub.category_name || sub.category || '').trim().toLowerCase();
          return catName === targetNorm;
        })
        .map((sub) => sub.name)
        .filter(Boolean);

      if (matched.length > 0) {
        return Array.from(new Set(matched));
      }
    }

    for (const [catKey, subs] of Object.entries(CATEGORY_DEFAULT_SUBCATEGORIES)) {
      if (catKey.toLowerCase() === targetNorm) {
        return subs;
      }
    }

    return ['General Service', 'Repair & Fix', 'Inspection'];
  }, [dbSubcategories, serviceCategory]);

  const [subService, setSubService] = useState(() => {
    if (initialTitle && initialTitle.trim()) return initialTitle.trim();
    return availableSubServices[0] || 'General Service';
  });

  // Keep subService strictly in sync with availableSubServices for that serviceCategory
  useEffect(() => {
    if (availableSubServices.length > 0) {
      if (initialTitle && availableSubServices.includes(initialTitle)) {
        setSubService(initialTitle);
      } else if (!availableSubServices.includes(subService)) {
        setSubService(availableSubServices[0]);
      }
    }
  }, [availableSubServices, serviceCategory, initialTitle]);

  const [description, setDescription] = useState(
    initialDescription || 'The kitchen tap is leaking and the water flow is very slow.'
  );
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const fileInputRef = useRef(null);

  // Step 2: Location
  const [locationType, setLocationType] = useState('current');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [detectedCoords, setDetectedCoords] = useState(
    currentLocation?.latitude && currentLocation?.longitude
      ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude }
      : null
  );
  const [locationFeedback, setLocationFeedback] = useState(null);
  const [addressLine, setAddressLine] = useState(
    currentLocation?.placeName || 'Flat 3B, Green Valley Apartments, Thiruvananthapuram, Kerala - 695001'
  );
  const [landmark, setLandmark] = useState('Near the main gate. 3rd floor.');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  const initialLocInfo = detectCityAndDistrictFromTextOrCoords(
    currentLocation?.placeName || '',
    currentLocation
  );

  const [destinationCity, setDestinationCity] = useState(
    professional?.city || initialLocInfo.city || 'Kottayam'
  );
  const [destinationDistrict, setDestinationDistrict] = useState(
    professional?.district || initialLocInfo.district || 'Kottayam'
  );
  const [destinationLocality, setDestinationLocality] = useState('');
  const [customerCurrentCity, setCustomerCurrentCity] = useState(
    initialLocInfo.city || 'Ottappalam'
  );
  const [customerCurrentDistrict, setCustomerCurrentDistrict] = useState(
    initialLocInfo.district || 'Palakkad'
  );
  const [districtPricingTiers, setDistrictPricingTiers] = useState(DEFAULT_DISTRICT_TIERS);

  // Fetch live district pricing tiers from backend
  useEffect(() => {
    fetch(`${API}/district-pricing`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const map = {};
          data.forEach((item) => {
            map[item.district] = {
              markup: Number(item.markup_percentage) || 0,
              tier: item.tier_name,
            };
          });
          setDistrictPricingTiers((prev) => ({ ...prev, ...map }));
        }
      })
      .catch((err) => console.error('Failed to fetch district pricing tiers:', err));
  }, []);

  const currentMarkup = districtPricingTiers[destinationDistrict]?.markup ?? 0;
  const currentTierName = districtPricingTiers[destinationDistrict]?.tier ?? (currentMarkup > 0 ? `+${currentMarkup}% Surge` : 'Current Pricing (Standard)');
  const isCrossDistrict = Boolean(customerCurrentDistrict && destinationDistrict && customerCurrentDistrict.toLowerCase() !== destinationDistrict.toLowerCase());

  const handleDestinationDistrictChange = (dist) => {
    setDestinationDistrict(dist);
    setDestinationLocality('');
    const cities = Object.values(KERALA_CITIES_MAP)
      .filter((c) => c.district.toLowerCase() === dist.toLowerCase())
      .map((c) => c.city);
    if (cities.length > 0) {
      setDestinationCity(cities[0]);
    } else {
      setDestinationCity(dist);
    }
    const center = DISTRICT_CENTERS[dist];
    if (center) {
      setDetectedCoords({ latitude: center.latitude, longitude: center.longitude });
    }
  };

  const handleDestinationCityChange = (newCity) => {
    setDestinationCity(newCity);
    setDestinationLocality('');
    const found = KERALA_CITIES_MAP[newCity.toLowerCase()];
    if (found) {
      setDestinationDistrict(found.district);
    }
  };

  // Fetch saved addresses on mount
  useEffect(() => {
    const fetchSavedAddresses = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (token) {
          const res = await fetch(`${API}/addresses`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              setSavedAddresses(data);
              return;
            }
          }
        }
      } catch {
        // network or auth error, fall back to localStorage
      }

      // Check localStorage fallback
      try {
        const cached = localStorage.getItem('user_saved_addresses');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSavedAddresses(parsed);
            return;
          }
        }
      } catch {}

      // Fallback initial addresses
      const fallbackList = [
        {
          id: 'default-home',
          address_type: 'home',
          address_line: 'Flat 4B, Emerald Heights, MG Road, Palayam',
          landmark: 'Opposite Government Secretariat',
          city: 'Thiruvananthapuram',
          state: 'Kerala',
          pincode: '695001',
          is_default: true,
        },
        {
          id: 'default-work',
          address_type: 'work',
          address_line: 'Building 2, Technopark Phase 3, Kazhakkoottam',
          landmark: 'Near Main Gate',
          city: 'Thiruvananthapuram',
          state: 'Kerala',
          pincode: '695583',
          is_default: false,
        }
      ];
      setSavedAddresses(fallbackList);
    };

    fetchSavedAddresses();
  }, []);

  // Active GPS location detection with Nominatim reverse-geocoding
  const handleDetectCurrentLocation = async () => {
    setLocationType('current');
    setSelectedAddressId(null);
    try {
      const perms = await Geolocation.requestPermissions();
      if (perms.location !== 'granted' && perms.coarseLocation !== 'granted') {
        setLocationFeedback({
          type: 'error',
          text: 'Location permission was denied. Please allow location access or choose a saved address.'
        });
        setDetectingLocation(false);
        return;
      }

      setDetectingLocation(true);
      setLocationFeedback({
        type: 'info',
        text: 'Detecting your GPS position...'
      });

      let pos;
      try {
        pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      } catch (err) {
        pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
      }
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      setDetectedCoords({ latitude: lat, longitude: lon });

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
        );
        if (!res.ok) throw new Error('Geocoding lookup failed');
        const data = await res.json();
        const a = data.address || {};

        const street = a.building || a.house_number || a.road || a.pedestrian || a.suburb || '';
        const locality = a.neighbourhood || a.suburb || a.residential || '';
        const city = a.city || a.town || a.village || a.county || 'Thiruvananthapuram';
        const state = a.state || 'Kerala';
        const pincode = a.postcode ? ` - ${a.postcode}` : '';

        const parts = [street, locality, city, state].filter(Boolean);
        const formatted = parts.length > 1
          ? `${parts.join(', ')}${pincode}`
          : data.display_name || `Location (${lat.toFixed(4)}, ${lon.toFixed(4)}), Thiruvananthapuram, Kerala`;

        setAddressLine(formatted);
        const detectedDist = detectDistrictFromTextOrCoords(formatted, { latitude: lat, longitude: lon });
        setCustomerCurrentDistrict(detectedDist);
        setDestinationDistrict(detectedDist);
        if (city) {
          setDestinationCity(city);
        }
        if (locality) {
          setDestinationLocality(locality);
        }
        if (locality || street) {
          setLandmark(`Near ${locality || street}`);
        }
        setLocationFeedback({
          type: 'success',
          text: `Detected location in ${detectedDist} (${DEFAULT_DISTRICT_TIERS[detectedDist]?.tier || 'Standard Pricing'})`
        });
      } catch {
        const fallback = `Current Location (${lat.toFixed(4)}, ${lon.toFixed(4)}), Thiruvananthapuram, Kerala`;
        setAddressLine(fallback);
        const fallbackDist = detectDistrictFromTextOrCoords(fallback, { latitude: lat, longitude: lon });
        setCustomerCurrentDistrict(fallbackDist);
        setDestinationDistrict(fallbackDist);
        setLocationFeedback({
          type: 'success',
          text: 'GPS coordinates detected successfully!'
        });
      } finally {
        setDetectingLocation(false);
      }
    } catch(err) {
      setDetectingLocation(false);
      setLocationFeedback({
        type: 'error',
        text: `GPS Error: ${err.message || 'Unknown'}. Please try again.`
      });
    }
  };

  const handleSelectSavedAddress = (addr) => {
    setSelectedAddressId(addr.id);
    setLocationType('saved');
    const fullLine = [
      addr.address_line,
      addr.landmark ? `(Landmark: ${addr.landmark})` : '',
      addr.city,
      addr.state,
      addr.pincode ? `- ${addr.pincode}` : '',
    ].filter(Boolean).join(', ');
    setAddressLine(fullLine || addr.address_line);
    if (addr.landmark) {
      setLandmark(addr.landmark);
    }
    const detectedDist = detectDistrictFromTextOrCoords(fullLine || addr.address_line, {
      latitude: addr.latitude ? parseFloat(addr.latitude) : null,
      longitude: addr.longitude ? parseFloat(addr.longitude) : null,
    });
    setDestinationDistrict(detectedDist);
    if (addr.city) {
      setDestinationCity(addr.city);
    }
    if (addr.locality) {
      setDestinationLocality(addr.locality);
    } else if (addr.landmark) {
      setDestinationLocality(addr.landmark);
    }
    if (addr.latitude && addr.longitude) {
      setDetectedCoords({ latitude: parseFloat(addr.latitude), longitude: parseFloat(addr.longitude) });
    } else if (DISTRICT_CENTERS[detectedDist]) {
      setDetectedCoords(DISTRICT_CENTERS[detectedDist]);
    }
    setLocationFeedback({
      type: 'success',
      text: `Selected ${addr.address_type?.toUpperCase() || 'saved'} address (${detectedDist})`
    });
  };

  // Step 3: Date & Time - English Calendar State
  const initialDateObj = new Date();
  const [dateSelection, setDateSelection] = useState('today'); // 'today' | 'tomorrow' | 'custom'
  const [selectedYear, setSelectedYear] = useState(initialDateObj.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(initialDateObj.getMonth()); // 0-11
  const [selectedDay, setSelectedDay] = useState(initialDateObj.getDate());

  // English Calendar viewing navigation states (Month, Year)
  const [calendarViewYear, setCalendarViewYear] = useState(initialDateObj.getFullYear());
  const [calendarViewMonth, setCalendarViewMonth] = useState(initialDateObj.getMonth());

  const timeSlots = [
    '09:00 AM - 11:00 AM',
    '11:00 AM - 01:00 PM',
    '01:00 PM - 03:00 PM',
    '03:00 PM - 05:00 PM',
    '05:00 PM - 07:00 PM',
    '07:00 PM - 09:00 PM',
  ];
  const [selectedSlot, setSelectedSlot] = useState('11:00 AM - 01:00 PM');

  // English Calendar Helpers
  const handleSelectToday = () => {
    const now = new Date();
    setDateSelection('today');
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
    setSelectedDay(now.getDate());
    setCalendarViewYear(now.getFullYear());
    setCalendarViewMonth(now.getMonth());
  };

  const handleSelectTomorrow = () => {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    setDateSelection('tomorrow');
    setSelectedYear(tmrw.getFullYear());
    setSelectedMonth(tmrw.getMonth());
    setSelectedDay(tmrw.getDate());
    setCalendarViewYear(tmrw.getFullYear());
    setCalendarViewMonth(tmrw.getMonth());
  };

  const handleSelectCalendarDay = (day) => {
    setSelectedYear(calendarViewYear);
    setSelectedMonth(calendarViewMonth);
    setSelectedDay(day);
    setDateSelection('custom');
  };

  const handlePrevMonth = () => {
    if (calendarViewMonth === 0) {
      setCalendarViewMonth(11);
      setCalendarViewYear((y) => y - 1);
    } else {
      setCalendarViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarViewMonth === 11) {
      setCalendarViewMonth(0);
      setCalendarViewYear((y) => y + 1);
    } else {
      setCalendarViewMonth((m) => m + 1);
    }
  };

  const formatSelectedDate = () => {
    const d = new Date(selectedYear, selectedMonth, selectedDay);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatSelectedDateFull = () => {
    const d = new Date(selectedYear, selectedMonth, selectedDay);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Slot Availability Helpers (Real-Time Availability Guard)
  const getSlotStartHours = (slotStr) => {
    const startPart = slotStr.split('-')[0].trim();
    let [time, period] = startPart.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours + (minutes || 0) / 60;
  };

  const isSlotAvailable = (slotStr) => {
    const now = new Date();
    const isToday =
      selectedYear === now.getFullYear() &&
      selectedMonth === now.getMonth() &&
      selectedDay === now.getDate();

    if (!isToday) {
      const selDate = new Date(selectedYear, selectedMonth, selectedDay);
      selDate.setHours(23, 59, 59, 999);
      return selDate >= now;
    }

    // On Today:
    // Slot must start strictly after current time (with 15-minute minimum advance buffer)
    // e.g. at 1:00 PM, 01:00 PM slot has already begun/passed, next available slot is 03:00 PM
    const slotStart = getSlotStartHours(slotStr);
    const nowHours = now.getHours() + now.getMinutes() / 60;
    return slotStart > nowHours + 0.25;
  };

  // Automatically adjust selectedSlot to first available slot whenever date changes
  useEffect(() => {
    const available = timeSlots.filter((s) => isSlotAvailable(s));
    if (available.length > 0 && !isSlotAvailable(selectedSlot)) {
      setSelectedSlot(available[0]);
    }
  }, [selectedYear, selectedMonth, selectedDay, dateSelection]);

  // Step 4: Additional Details
  const [accessInstructions, setAccessInstructions] = useState(
    'Main door will be open. Please come to the kitchen area.'
  );
  const [reqBringTools, setReqBringTools] = useState(true);
  const [reqNeedInvoice, setReqNeedInvoice] = useState(false);
  const [reqOther, setReqOther] = useState(false);

  // Step 5: Professional Selection (Exclusively Real Database Data)
  const [proList, setProList] = useState(professional ? [professional] : []);
  const [loadingPros, setLoadingPros] = useState(false);
  const [proFilter, setProFilter] = useState('top_rated'); // 'top_rated' | 'nearest' | 'experience'
  const [proSearch, setProSearch] = useState('');
  const [selectedPro, setSelectedPro] = useState(professional || null);

  // Authoritative Dynamic Category & City Pricing
  const [dynamicPricing, setDynamicPricing] = useState({
    price: null,
    base_price: null,
    applied_adjustment: null,
    exact_override: null,
    travel: null,
    estimated_total: null,
    loading: false,
    available: false,
    message: '',
    source: null,
    district: '',
    city: '',
    locality: '',
    category: ''
  });

  // Business Rule: Service Pricing must use the confirmed address where the work will occur.
  const effectiveServiceCity = destinationCity || selectedPro?.city || 'Kottayam';
  const effectiveServiceDistrict = destinationDistrict || selectedPro?.district || 'Kottayam';
  const effectiveServiceLocality = destinationLocality.trim();

  useEffect(() => {
    let isCancelled = false;
    // Clear stale price immediately so customer never sees old address rate while loading
    setDynamicPricing((prev) => ({
      ...prev,
      price: null,
      estimated_total: null,
      loading: true,
      message: ''
    }));

    const proParam = selectedPro?.id ? `&professional_id=${selectedPro.id}` : '';
    const locParam = effectiveServiceLocality ? `&locality=${encodeURIComponent(effectiveServiceLocality)}` : '';
    const coordsParam = detectedCoords?.latitude && detectedCoords?.longitude
      ? `&latitude=${detectedCoords.latitude}&longitude=${detectedCoords.longitude}`
      : '';
    const url = `${API}/pricing/lookup?city=${encodeURIComponent(effectiveServiceCity)}&district=${encodeURIComponent(effectiveServiceDistrict)}&category=${encodeURIComponent(serviceCategory)}${locParam}${proParam}${coordsParam}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (isCancelled) return;
        if (data.available && data.price != null) {
          const breakdown = data.pricing_breakdown || {};
          setDynamicPricing({
            price: Number(data.price),
            base_price: breakdown.base_price || Number(data.price),
            applied_adjustment: breakdown.applied_adjustment || null,
            exact_override: breakdown.exact_override || null,
            travel: breakdown.travel || null,
            estimated_total: breakdown.estimated_total || Number(data.price),
            loading: false,
            available: true,
            message: '',
            source: 'location_pricing_engine',
            district: data.district || effectiveServiceDistrict,
            city: data.city || effectiveServiceCity,
            locality: data.locality || effectiveServiceLocality,
            category: data.category_name || serviceCategory,
          });
        } else {
          setDynamicPricing({
            price: null,
            base_price: null,
            applied_adjustment: null,
            exact_override: null,
            travel: null,
            estimated_total: null,
            loading: false,
            available: false,
            message: data.message || 'Pricing is not configured for this service location. Please contact support.',
            source: null,
            district: effectiveServiceDistrict,
            city: effectiveServiceCity,
            locality: effectiveServiceLocality,
            category: serviceCategory,
          });
        }
      })
      .catch((err) => {
        if (isCancelled) return;
        setDynamicPricing({
          price: null,
          base_price: null,
          applied_adjustment: null,
          exact_override: null,
          travel: null,
          estimated_total: null,
          loading: false,
          available: false,
          message: 'Unable to reach pricing server. Please check your network connection.',
          source: null,
          district: effectiveServiceDistrict,
          city: effectiveServiceCity,
          locality: effectiveServiceLocality,
          category: serviceCategory,
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [effectiveServiceCity, effectiveServiceDistrict, effectiveServiceLocality, serviceCategory, selectedPro?.id, detectedCoords?.latitude, detectedCoords?.longitude]);

  const proRate = dynamicPricing.price || 0;
  const travelFee = 0; // Travel expenses removed
  const platformFee = 0;
  const surgeDifference = 0;
  const bookingPayableTotal = proRate;

  // Step 9: Confirmed details
  const [confirmedRequest, setConfirmedRequest] = useState(null);

  // Load real professionals strictly from database for destination district
  useEffect(() => {
    setLoadingPros(true);
    const coordsQuery = detectedCoords?.latitude && detectedCoords?.longitude
      ? `&latitude=${detectedCoords.latitude}&longitude=${detectedCoords.longitude}`
      : '';
    const cityParam = destinationCity ? `&city=${encodeURIComponent(destinationCity)}` : '';
    fetch(`${API}/professionals?category=${encodeURIComponent(serviceCategory)}&district=${encodeURIComponent(destinationDistrict)}${cityParam}${coordsQuery}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          const mapped = data.map((p, idx) => {
            const photo = p.profile_photo
              ? (p.profile_photo.startsWith('http') ? p.profile_photo : `${SERVER_BASE}${p.profile_photo}`)
              : null;
            const bRate = 200 + Math.min(Number(p.experience_years) || 0, 12) * 25;
            // Use authoritative local wage for destination city if provided by backend, else fallback
            const adjRate = p.hourly_rate != null ? Math.round(Number(p.hourly_rate)) : Math.round(bRate * (1 + currentMarkup / 100));
            return {
              id: p.id,
              full_name: p.full_name,
              category: p.category || serviceCategory,
              district: p.district || destinationDistrict,
              city: p.city,
              work_location_name: p.work_location_name,
              verification_status: p.verification_status || 'verified',
              avg_rating: Number(p.avg_rating) || 5.0,
              review_count: Number(p.review_count) || 0,
              experience_years: p.experience_years || 0,
              distance_km: p.distance_from_user || (1.2 + idx * 0.8).toFixed(1),
              base_hourly_rate: bRate,
              hourly_rate: adjRate,
              tags: p.sub_category
                ? p.sub_category.split(/[,|/]+/).map((s) => s.trim()).filter(Boolean).slice(0, 3)
                : [subService, 'Verified Professional'],
              avatar: photo,
              bio: p.bio,
            };
          });
          setProList(mapped);
          if (professional) {
            const found = mapped.find((m) => m.id === professional.id);
            if (found) setSelectedPro(found);
            else setSelectedPro(professional);
          } else if (mapped.length > 0) {
            setSelectedPro(mapped[0]);
          } else {
            setSelectedPro(null);
          }
        }
      })
      .catch(() => {
        setProList(professional ? [professional] : []);
        setSelectedPro(professional || null);
      })
      .finally(() => {
        setLoadingPros(false);
      });
  }, [serviceCategory, professional, subService, destinationDistrict, currentMarkup]);

  // Handle Photo Upload
  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const combined = [...photos, ...files].slice(0, 4);
    setPhotos(combined);
    const urls = combined.map((f) => URL.createObjectURL(f));
    setPhotoPreviews(urls);
  };

  const removePhoto = (idx) => {
    const newPhotos = photos.filter((_, i) => i !== idx);
    setPhotos(newPhotos);
    const newPreviews = photoPreviews.filter((_, i) => i !== idx);
    setPhotoPreviews(newPreviews);
  };

  // Stepper mapping: 5 header steps
  // 1: Details (Screen 1)
  // 2: Location (Screen 2)
  // 3: Time (Screen 3)
  // 4: Professional (Screens 4 & 5)
  // 5: Payment (Screens 6, 7, 8)
  const getStepperActiveIndex = () => {
    if (step === 1) return 1;
    if (step === 2) return 2;
    if (step === 3) return 3;
    if (step === 4 || step === 5) return 4;
    return 5;
  };

  const currentStepIndex = getStepperActiveIndex();

  // Helper: Build Future Scheduled Timestamp from English Calendar & Time Slot
  const getScheduledTimestamp = () => {
    const targetDate = new Date(selectedYear, selectedMonth, selectedDay);

    // Parse time from slot (e.g. "11:00 AM - 01:00 PM")
    const startStr = selectedSlot.split('-')[0].trim();
    let [time, period] = startStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    targetDate.setHours(hours, minutes, 0, 0);

    // Guarantee strictly future timestamp for backend database validation
    if (targetDate.getTime() <= Date.now()) {
      targetDate.setTime(Date.now() + 2 * 60 * 60 * 1000);
    }
    return targetDate.toISOString();
  };

  // Handle Booking Submission on Step 8
  const handleFinalBooking = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      if (!dynamicPricing.available || dynamicPricing.price == null) {
        throw new Error(dynamicPricing.message || 'Pricing is not configured for this service location. Please contact support.');
      }

      const token = localStorage.getItem('userToken');
      const formData = new FormData();
      formData.append('title', subService || 'Service Booking');

      const extraNotes = [
        description,
        landmark ? `Landmark: ${landmark}` : '',
        `Service City: ${effectiveServiceCity}, District: ${effectiveServiceDistrict}`,
        accessInstructions ? `Access Instructions: ${accessInstructions}` : '',
        reqBringTools ? 'Tools required' : '',
        reqNeedInvoice ? 'Invoice required' : '',
      ]
        .filter(Boolean)
        .join(' | ');

      formData.append('description', extraNotes);
      formData.append('requested_at', getScheduledTimestamp());
      formData.append('location', addressLine);
      formData.append('city', effectiveServiceCity);
      formData.append('service_city', effectiveServiceCity);
      formData.append('district', effectiveServiceDistrict);
      if (effectiveServiceLocality) {
        formData.append('locality', effectiveServiceLocality);
      }
      formData.append('pricing_markup_percentage', currentMarkup);
      formData.append('category', serviceCategory);

      if (selectedPro?.id) {
        formData.append('professional_id', selectedPro.id);
      }

      if (detectedCoords?.latitude && detectedCoords?.longitude) {
        formData.append('latitude', detectedCoords.latitude);
        formData.append('longitude', detectedCoords.longitude);
      } else if (currentLocation?.latitude && currentLocation?.longitude) {
        formData.append('latitude', currentLocation.latitude);
        formData.append('longitude', currentLocation.longitude);
      }

      photos.forEach((photo) => {
        formData.append('photos', photo);
      });

      formData.append('wage', bookingPayableTotal);
      formData.append('payment_status', 'pending');
      formData.append('payment_method', 'cash');

      const res = await fetch(`${API}/requests`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (res.status === 401) {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        throw new Error('Your session has expired. Please log in again.');
      }

      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit service request');
      }

      const created = data.request || {
        id: data.id || Math.floor(100000 + Math.random() * 900000),
        title: subService,
        category: serviceCategory,
        location: addressLine,
        city: effectiveServiceCity,
        service_city: effectiveServiceCity,
        district: effectiveServiceDistrict,
        pricing_markup_percentage: currentMarkup,
        requested_at: getScheduledTimestamp(),
      };

      setConfirmedRequest({
        ...created,
        city: effectiveServiceCity,
        service_city: effectiveServiceCity,
        district: effectiveServiceDistrict,
        pricing_markup_percentage: currentMarkup,
        payment_status: 'pending',
        payment_method: 'cash',
        wage: bookingPayableTotal,
      });
      setStep(9); // Screen 9: Booking Confirmed!
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyBookingId = (text) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtered professionals list for Step 5
  const filteredPros = proList
    .filter((p) => (p.full_name || '').toLowerCase().includes(proSearch.toLowerCase().trim()))
    .sort((a, b) => {
      if (proFilter === 'top_rated') return b.avg_rating - a.avg_rating;
      if (proFilter === 'nearest') return a.distance_km - b.distance_km;
      if (proFilter === 'experience') return b.experience_years - a.experience_years;
      return 0;
    });

  return (
    <div className="visily-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="visily-modal-container">
        {/* Header with Title and Close Button */}
        <header className="visily-header">
          {step > 1 && step < 9 ? (
            <button
              className="visily-header-btn"
              onClick={() => setStep((prev) => prev - 1)}
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <div style={{ width: 36 }} />
          )}

          <h2 className="visily-header-title">
            {step === 6
              ? 'Booking Summary'
              : step === 9
              ? 'Booking Confirmed'
              : 'Book Service'}
          </h2>

          <button className="visily-header-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        {/* 5-Step Stepper (Visible for Steps 1 through 6) */}
        {step < 9 && (
          <div className="visily-stepper-wrap">
            <div className="visily-stepper-track" />
            {[
              { num: 1, label: 'Details' },
              { num: 2, label: 'Location' },
              { num: 3, label: 'Time' },
              { num: 4, label: 'Professional' },
              { num: 5, label: 'Confirm' },
            ].map(({ num, label }) => {
              const isPast = num < currentStepIndex;
              const isCurrent = num === currentStepIndex;
              return (
                <div key={num} className="visily-step-item">
                  <div
                    className={`visily-step-circle ${
                      isPast ? 'done' : isCurrent ? 'active' : ''
                    }`}
                  >
                    {isPast ? <Check size={14} strokeWidth={3} /> : num}
                  </div>
                  <span
                    className={`visily-step-label ${
                      isPast ? 'done' : isCurrent ? 'active' : ''
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ──────── SCREEN 1: Service Details ──────── */}
        {step === 1 && (
          <div className="visily-body">
            <div className="visily-title-group">
              <h3 className="visily-screen-title">What do you need help with?</h3>
              <p className="visily-screen-subtitle">
                Tell us about your problem so we can find the right professional.
              </p>
            </div>

            {/* Selected Service Card */}
            <div className="visily-service-preview-card" style={{ flexDirection: isChangingCategory ? 'column' : 'row', alignItems: isChangingCategory ? 'stretch' : 'center', gap: 12 }}>
              {!isChangingCategory ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <div className="visily-icon-mint-box">
                      {(() => {
                        const CatIcon = categoryIcons[serviceCategory] || Wrench;
                        return <CatIcon size={24} />;
                      })()}
                    </div>
                    <div>
                      <strong style={{ fontSize: 15, color: '#0F172A', display: 'block' }}>
                        {serviceCategory}
                      </strong>
                      <small style={{ fontSize: 12, color: '#64748B' }}>
                        {CATEGORY_TAGLINES[serviceCategory] || 'Professional certified services at upfront rates.'}
                      </small>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="visily-change-btn"
                    onClick={() => setIsChangingCategory(true)}
                  >
                    Change
                  </button>
                </>
              ) : (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Select Service Category</span>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#00796B', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
                      onClick={() => setIsChangingCategory(false)}
                    >
                      Done
                    </button>
                  </div>
                  <select
                    className="visily-select"
                    value={serviceCategory}
                    onChange={(e) => {
                      setServiceCategory(e.target.value);
                      setIsChangingCategory(false);
                    }}
                  >
                    {activeCategoryList.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Sub Service Dropdown */}
            <div className="visily-form-group">
              <label className="visily-label">Select Sub Service</label>
              <select
                className="visily-select"
                value={subService}
                onChange={(e) => setSubService(e.target.value)}
              >
                {availableSubServices.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            {/* Describe Problem */}
            <div className="visily-form-group">
              <label className="visily-label">Describe the problem</label>
              <div className="visily-textarea-wrap">
                <textarea
                  className="visily-textarea"
                  value={description}
                  maxLength={500}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue in detail..."
                />
                <span className="visily-char-counter">{description.length}/500</span>
              </div>
            </div>

            {/* Upload Photos */}
            <div className="visily-form-group">
              <label className="visily-label">Upload Photos (Optional)</label>
              <div className="visily-upload-grid">
                {photoPreviews.map((url, i) => (
                  <div key={i} className="visily-photo-thumb">
                    <img src={url} alt="Upload preview" />
                    <button
                      type="button"
                      className="visily-photo-remove"
                      onClick={() => removePhoto(i)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {photos.length < 4 && (
                  <button
                    type="button"
                    className="visily-upload-add-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus size={24} />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handlePhotoSelect}
                />
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 10 }}>
              <button
                className="visily-pill-btn"
                onClick={() => setStep(2)}
                disabled={!subService.trim()}
              >
                Next <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ──────── SCREEN 2: Service Location ──────── */}
        {step === 2 && (
          <div className="visily-body">
            <div className="visily-title-group">
              <h3 className="visily-screen-title">Service Location</h3>
              <p className="visily-screen-subtitle">Where do you need the service?</p>
            </div>

            {/* Location Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                className={`visily-radio-card ${locationType === 'current' ? 'active' : ''}`}
                onClick={handleDetectCurrentLocation}
                role="button"
                tabIndex={0}
                style={{
                  cursor: 'pointer',
                  border: locationType === 'current' ? '2px solid #0D9488' : '1px solid #E2E8F0',
                  boxShadow: locationType === 'current' ? '0 4px 14px rgba(13, 148, 136, 0.15)' : 'none'
                }}
              >
                <div
                  className="visily-icon-mint-box"
                  style={{
                    width: 42,
                    height: 42,
                    background: detectingLocation ? '#CCFBF1' : undefined
                  }}
                >
                  {detectingLocation ? (
                    <Loader2 size={20} color="#0D9488" style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <NavigationIcon size={20} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <strong style={{ fontSize: 14, color: '#0F172A' }}>
                      Use Current Location
                    </strong>
                    {detectedCoords && (
                      <span style={{ fontSize: 10, background: '#DCFCE7', color: '#166534', padding: '1px 6px', borderRadius: 999, fontWeight: 700 }}>
                        GPS ACTIVE
                      </span>
                    )}
                  </div>
                  <small style={{ fontSize: 12, color: '#64748B' }}>
                    {detectingLocation
                      ? 'Detecting GPS position & address...'
                      : detectedCoords
                      ? addressLine || `${detectedCoords.latitude.toFixed(4)}, ${detectedCoords.longitude.toFixed(4)}`
                      : 'Click to detect real-time GPS location'}
                  </small>
                </div>
                {detectingLocation ? (
                  <Loader2 size={18} color="#0D9488" style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <ChevronRight size={18} color="#94A3B8" />
                )}
              </div>

              <div
                className={`visily-radio-card ${locationType === 'saved' ? 'active' : ''}`}
                onClick={() => setLocationType('saved')}
                role="button"
                tabIndex={0}
                style={{
                  cursor: 'pointer',
                  border: locationType === 'saved' ? '2px solid #0D9488' : '1px solid #E2E8F0',
                  boxShadow: locationType === 'saved' ? '0 4px 14px rgba(13, 148, 136, 0.15)' : 'none'
                }}
              >
                <div className="visily-icon-mint-box" style={{ width: 42, height: 42 }}>
                  <Building size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <strong style={{ fontSize: 14, color: '#0F172A' }}>
                      Saved Addresses
                    </strong>
                    <span style={{ fontSize: 11, background: '#F1F5F9', color: '#475569', padding: '1px 7px', borderRadius: 999, fontWeight: 600 }}>
                      {savedAddresses.length} available
                    </span>
                  </div>
                  <small style={{ fontSize: 12, color: '#64748B' }}>Home, Work, Other</small>
                </div>
                <ChevronRight size={18} color="#94A3B8" />
              </div>
            </div>

            {/* Geolocation Feedback Banner */}
            {locationFeedback && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 12.5,
                  marginTop: 2,
                  background:
                    locationFeedback.type === 'error'
                      ? '#FEF2F2'
                      : locationFeedback.type === 'success'
                      ? '#F0FDF4'
                      : '#F0FDFA',
                  color:
                    locationFeedback.type === 'error'
                      ? '#991B1B'
                      : locationFeedback.type === 'success'
                      ? '#166534'
                      : '#0D9488',
                  border: `1px solid ${
                    locationFeedback.type === 'error'
                      ? '#FECACA'
                      : locationFeedback.type === 'success'
                      ? '#BBF7D0'
                      : '#99F6E4'
                  }`
                }}
              >
                {locationFeedback.type === 'error' ? (
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                ) : locationFeedback.type === 'success' ? (
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                ) : (
                  <Info size={16} style={{ flexShrink: 0 }} />
                )}
                <span style={{ flex: 1 }}>{locationFeedback.text}</span>
                {locationFeedback.type === 'error' && (
                  <button
                    type="button"
                    onClick={handleDetectCurrentLocation}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#991B1B',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {/* Saved Addresses Picker List (when locationType === 'saved') */}
            {locationType === 'saved' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                    Select a Saved Address
                  </span>
                  <small style={{ fontSize: 11, color: '#64748B' }}>
                    Click an address to use it
                  </small>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                  {savedAddresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    const type = (addr.address_type || 'home').toLowerCase();
                    const TypeIcon = type === 'work' ? Briefcase : type === 'home' ? House : MapPin;
                    const badgeBg = type === 'work' ? '#EFF6FF' : type === 'home' ? '#F0FDF4' : '#FAF5FF';
                    const badgeColor = type === 'work' ? '#1D4ED8' : type === 'home' ? '#15803D' : '#7E22CE';

                    return (
                      <div
                        key={addr.id}
                        onClick={() => handleSelectSavedAddress(addr)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: isSelected ? '2px solid #0D9488' : '1px solid #E2E8F0',
                          background: isSelected ? '#F0FDFA' : '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            background: badgeBg,
                            color: badgeColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: 2
                          }}
                        >
                          <TypeIcon size={16} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                color: badgeColor,
                                background: badgeBg,
                                padding: '1px 6px',
                                borderRadius: 4
                              }}
                            >
                              {type}
                            </span>
                            {addr.is_default && (
                              <span style={{ fontSize: 10, color: '#0D9488', fontWeight: 600 }}>
                                (Default)
                              </span>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 500, color: '#1E293B', lineHeight: 1.3 }}>
                            {addr.address_line}
                          </p>
                          {(addr.landmark || addr.city) && (
                            <small style={{ fontSize: 11, color: '#64748B', display: 'block', marginTop: 2 }}>
                              {[addr.landmark ? `Near ${addr.landmark}` : '', addr.city, addr.pincode].filter(Boolean).join(' • ')}
                            </small>
                          )}
                        </div>
                        {isSelected && (
                          <div style={{ color: '#0D9488', marginTop: 4 }}>
                            <Check size={18} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}


            {/* Address Details Card */}
            <div className="visily-card" style={{ marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div className="visily-icon-mint-box" style={{ width: 36, height: 36 }}>
                  <MapPin size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 14, color: '#0F172A' }}>Address Details</strong>
                  {detectedCoords && locationType === 'current' && (
                    <span style={{ fontSize: 11, color: '#0D9488', display: 'block', fontWeight: 500 }}>
                      📍 GPS: {detectedCoords.latitude.toFixed(4)}, {detectedCoords.longitude.toFixed(4)}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="visily-change-btn"
                  onClick={() => {
                    const custom = prompt('Enter service address:', addressLine);
                    if (custom) setAddressLine(custom);
                  }}
                >
                  Change
                </button>
              </div>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.4, margin: 0 }}>
                {addressLine}
              </p>
            </div>

            {/* Service Location City & District Confirmation */}
            <div className="visily-card" style={{ marginTop: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px 14px', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Target Service Delivery City
                </span>
                <span style={{ fontSize: 11, background: '#E0F2FE', color: '#0369A1', fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                  {destinationDistrict} District
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  value={destinationCity}
                  onChange={(e) => handleDestinationCityChange(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#0F172A',
                    background: '#FFFFFF',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {Object.values(KERALA_CITIES_MAP).map((c) => (
                    <option key={`${c.district}-${c.city}`} value={c.city}>
                      {c.city} ({c.district})
                    </option>
                  ))}
                </select>
              </div>

              {/* Area / Locality Input for specific sub-city pricing */}
              <div style={{ marginTop: 10 }}>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>
                  Locality / Area (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Town Center, West Fort, Kadavanthra"
                  value={destinationLocality}
                  onChange={(e) => setDestinationLocality(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    color: '#0F172A',
                    background: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <small style={{ fontSize: 11, color: '#64748B', display: 'block', marginTop: 6 }}>
                Authoritative dynamic pricing applies based on the selected city and locality.
              </small>
            </div>

            {/* Landmark / Instructions */}
            <div className="visily-form-group">
              <label className="visily-label">Landmark / Instructions (Optional)</label>
              <div className="visily-textarea-wrap">
                <textarea
                  className="visily-textarea"
                  value={landmark}
                  maxLength={200}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Near main gate, 3rd floor, apartment name..."
                  style={{ minHeight: 70 }}
                />
                <span className="visily-char-counter">{landmark.length}/200</span>
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 10 }}>
              <button
                className="visily-pill-btn"
                onClick={() => setStep(3)}
                disabled={!addressLine.trim() || detectingLocation}
              >
                {detectingLocation ? 'Detecting Location...' : 'Next'} <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ──────── SCREEN 3: Date & Time (English Calendar) ──────── */}
        {step === 3 && (() => {
          const daysInMonth = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();
          const firstDayIndex = new Date(calendarViewYear, calendarViewMonth, 1).getDay();
          const todayObj = new Date();
          todayObj.setHours(0, 0, 0, 0);

          const now = new Date();
          const isDateToday =
            selectedYear === now.getFullYear() &&
            selectedMonth === now.getMonth() &&
            selectedDay === now.getDate();
          const availableSlotsForDate = timeSlots.filter(isSlotAvailable);
          const todayHasNoSlots = isDateToday && availableSlotsForDate.length === 0;

          const yearsList = [
            initialDateObj.getFullYear(),
            initialDateObj.getFullYear() + 1,
            initialDateObj.getFullYear() + 2,
            initialDateObj.getFullYear() + 3,
            initialDateObj.getFullYear() + 4,
          ];

          return (
            <div className="visily-body">
              <div className="visily-title-group">
                <h3 className="visily-screen-title">Preferred Date & Time</h3>
                <p className="visily-screen-subtitle">When are you available? Choose date and time slot.</p>
              </div>

              {/* Quick Date Presets */}
              <div className="visily-date-row">
                <div
                  className={`visily-date-card ${dateSelection === 'today' ? 'active' : ''}`}
                  onClick={handleSelectToday}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: 'pointer', opacity: todayHasNoSlots ? 0.6 : 1 }}
                >
                  <strong>Today</strong>
                  <span>
                    {todayHasNoSlots
                      ? 'No slots left'
                      : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <div
                  className={`visily-date-card ${dateSelection === 'tomorrow' ? 'active' : ''}`}
                  onClick={handleSelectTomorrow}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                >
                  <strong>Tomorrow</strong>
                  <span>
                    {new Date(Date.now() + 86400000).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <div
                  className={`visily-date-card ${dateSelection === 'custom' ? 'active' : ''}`}
                  onClick={() => setDateSelection('custom')}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                >
                  <Calendar size={18} style={{ color: dateSelection === 'custom' ? '#0D9488' : '#64748B', marginBottom: 2 }} />
                  <strong>Calendar</strong>
                  <span>{formatSelectedDate()}</span>
                </div>
              </div>

              {/* English Calendar Container */}
              <div className="visily-calendar-wrap">
                <div className="visily-calendar-header">
                  <div className="visily-calendar-selectors">
                    {/* Month Customization */}
                    <div className="visily-calendar-select-wrap">
                      <label className="visily-calendar-select-label">Month</label>
                      <select
                        className="visily-calendar-select"
                        value={calendarViewMonth}
                        onChange={(e) => {
                          setCalendarViewMonth(Number(e.target.value));
                          setDateSelection('custom');
                        }}
                      >
                        {ENGLISH_MONTHS.map((mName, idx) => (
                          <option key={mName} value={idx}>
                            {mName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Year Customization */}
                    <div className="visily-calendar-select-wrap">
                      <label className="visily-calendar-select-label">Year</label>
                      <select
                        className="visily-calendar-select"
                        value={calendarViewYear}
                        onChange={(e) => {
                          setCalendarViewYear(Number(e.target.value));
                          setDateSelection('custom');
                        }}
                      >
                        {yearsList.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Previous / Next Month Quick Buttons */}
                  <div className="visily-calendar-nav">
                    <button
                      type="button"
                      className="visily-calendar-nav-btn"
                      onClick={handlePrevMonth}
                      title="Previous Month"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      className="visily-calendar-nav-btn"
                      onClick={handleNextMonth}
                      title="Next Month"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Weekdays Header: Sun Mon Tue Wed Thu Fri Sat */}
                <div className="visily-calendar-weekdays">
                  {WEEKDAYS.map((dayName) => (
                    <div key={dayName} className="visily-calendar-weekday">
                      {dayName}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="visily-calendar-days">
                  {/* Empty cells before month start */}
                  {Array.from({ length: firstDayIndex }).map((_, i) => (
                    <div key={`empty-${i}`} className="visily-calendar-day-empty" />
                  ))}

                  {/* Calendar Days */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const cellDate = new Date(calendarViewYear, calendarViewMonth, dayNum);
                    cellDate.setHours(0, 0, 0, 0);

                    const isPast = cellDate < todayObj;
                    const isToday = cellDate.getTime() === todayObj.getTime();
                    const isSelected =
                      selectedYear === calendarViewYear &&
                      selectedMonth === calendarViewMonth &&
                      selectedDay === dayNum;

                    return (
                      <button
                        key={dayNum}
                        type="button"
                        disabled={isPast}
                        className={`visily-calendar-day-btn ${isSelected ? 'selected' : ''} ${
                          isToday ? 'today' : ''
                        } ${isPast ? 'disabled' : ''}`}
                        onClick={() => handleSelectCalendarDay(dayNum)}
                      >
                        <span>{dayNum}</span>
                        {isToday && !isSelected && <span className="today-dot" />}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Date Summary Tag */}
                <div className="visily-calendar-summary-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={14} color="#0D9488" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                      Selected Appointment:
                    </span>
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#0D9488' }}>
                    {formatSelectedDateFull()}
                  </span>
                </div>
              </div>

              {/* Available Time Slots */}
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="visily-label" style={{ margin: 0 }}>
                    Available Time Slots
                  </label>
                  {isDateToday && (
                    <small style={{ fontSize: 11, color: '#64748B' }}>
                      Passed slots are disabled
                    </small>
                  )}
                </div>

                {todayHasNoSlots && (
                  <div
                    style={{
                      padding: '10px 14px',
                      background: '#FEF3C7',
                      border: '1px solid #FCD34D',
                      borderRadius: 10,
                      color: '#92400E',
                      fontSize: 12.5,
                      marginBottom: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>
                      All time slots for today have already passed. Please select tomorrow or another future date from the calendar.
                    </span>
                  </div>
                )}

                <div className="visily-slots-grid">
                  {timeSlots.map((slot) => {
                    const available = isSlotAvailable(slot);
                    const isSelected = selectedSlot === slot && available;

                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={!available}
                        className={`visily-slot-btn ${isSelected ? 'active' : ''} ${!available ? 'disabled' : ''}`}
                        onClick={() => {
                          if (available) setSelectedSlot(slot);
                        }}
                        style={{
                          opacity: available ? 1 : 0.45,
                          cursor: available ? 'pointer' : 'not-allowed',
                          position: 'relative',
                        }}
                      >
                        <span>{slot}</span>
                        {!available && (
                          <span
                            style={{
                              display: 'block',
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#DC2626',
                              marginTop: 2,
                              textTransform: 'uppercase',
                            }}
                          >
                            Unavailable
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: 10 }}>
                <button
                  className="visily-pill-btn"
                  onClick={() => setStep(4)}
                  disabled={!isSlotAvailable(selectedSlot)}
                >
                  Next <ArrowRight size={18} />
                </button>
              </div>
            </div>
          );
        })()}

        {/* ──────── SCREEN 4: Additional Details ──────── */}
        {step === 4 && (
          <div className="visily-body">
            <div className="visily-title-group">
              <h3 className="visily-screen-title">Additional Details</h3>
              <p className="visily-screen-subtitle">Help the professional prepare better.</p>
            </div>

            {/* Access Instructions */}
            <div className="visily-form-group">
              <label className="visily-label">Access Instructions (Optional)</label>
              <div className="visily-textarea-wrap">
                <textarea
                  className="visily-textarea"
                  value={accessInstructions}
                  maxLength={200}
                  onChange={(e) => setAccessInstructions(e.target.value)}
                  placeholder="e.g. Main door will be open..."
                  style={{ minHeight: 90 }}
                />
                <span className="visily-char-counter">{accessInstructions.length}/200</span>
              </div>
            </div>

            {/* Special Requirements */}
            <div className="visily-form-group">
              <label className="visily-label">Special Requirements (Optional)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div
                  className="visily-checkbox-item"
                  onClick={() => setReqBringTools((prev) => !prev)}
                >
                  <div className={`visily-checkbox-box ${reqBringTools ? 'checked' : ''}`}>
                    {reqBringTools && <Check size={14} strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: 13.5, color: '#1E293B', fontWeight: 500 }}>
                    Bring necessary tools
                  </span>
                </div>

                <div
                  className="visily-checkbox-item"
                  onClick={() => setReqNeedInvoice((prev) => !prev)}
                >
                  <div className={`visily-checkbox-box ${reqNeedInvoice ? 'checked' : ''}`}>
                    {reqNeedInvoice && <Check size={14} strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: 13.5, color: '#1E293B', fontWeight: 500 }}>
                    Need invoice
                  </span>
                </div>

                <div className="visily-checkbox-item" onClick={() => setReqOther((prev) => !prev)}>
                  <div className={`visily-checkbox-box ${reqOther ? 'checked' : ''}`}>
                    {reqOther && <Check size={14} strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: 13.5, color: '#1E293B', fontWeight: 500 }}>Other</span>
                </div>
              </div>
            </div>

            {/* Guarantee Note */}
            <div className="visily-trust-banner">
              <ShieldCheck size={22} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>You can also share photos or short videos after booking if needed.</div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 10 }}>
              <button className="visily-pill-btn" onClick={() => setStep(5)}>
                Next <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ──────── SCREEN 5: Choose a Professional ──────── */}
        {step === 5 && (
          <div className="visily-body">
            <div className="visily-title-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <h3 className="visily-screen-title" style={{ margin: 0 }}>Choose a Professional</h3>
                <span
                  style={{
                    background: currentMarkup === 30 ? '#FEE2E2' : currentMarkup === 20 ? '#FEF3C7' : '#E0F2FE',
                    color: currentMarkup === 30 ? '#991B1B' : currentMarkup === 20 ? '#92400E' : '#0369A1',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 9999,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <MapPin size={12} /> {destinationDistrict}
                  {currentMarkup > 0 ? ` (+${currentMarkup}% Surge)` : ' (Current Pricing)'}
                </span>
              </div>
              <p className="visily-screen-subtitle">
                Select from verified professionals available in {destinationDistrict}.
              </p>
              {isCrossDistrict && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    background: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    borderRadius: 10,
                    fontSize: 12,
                    color: '#92400E',
                    marginTop: 6,
                  }}
                >
                  <Info size={14} style={{ flexShrink: 0 }} />
                  <span>
                    Your service location is in <strong>{destinationDistrict}</strong>. Showing verified professionals stationed in this district.
                  </span>
                </div>
              )}
            </div>

            {/* Search Input */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Search
                size={16}
                color="#94A3B8"
                style={{ position: 'absolute', left: 14 }}
              />
              <input
                className="visily-select"
                style={{ paddingLeft: 38, paddingRight: 38 }}
                placeholder="Search professionals..."
                value={proSearch}
                onChange={(e) => setProSearch(e.target.value)}
              />
              <SlidersHorizontal
                size={16}
                color="#94A3B8"
                style={{ position: 'absolute', right: 14 }}
              />
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'top_rated', label: 'Top Rated' },
                { id: 'nearest', label: 'Nearest' },
                { id: 'experience', label: 'Experience' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setProFilter(id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 18,
                    fontSize: 12.5,
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: proFilter === id ? '#00796B' : '#E2E8F0',
                    background: proFilter === id ? '#00796B' : '#FFFFFF',
                    color: proFilter === id ? '#FFFFFF' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* List of Professionals */}
            {loadingPros ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px 20px',
                  gap: 12,
                }}
              >
                <Loader2 size={32} className="spin" color="#00796B" />
                <span style={{ fontSize: 13.5, color: '#64748B', fontWeight: 500 }}>
                  Searching verified {serviceCategory} professionals...
                </span>
              </div>
            ) : filteredPros.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  padding: '24px 20px',
                  background: '#F8FAFC',
                  borderRadius: 16,
                  border: '1px dashed #CBD5E1',
                  textAlign: 'center',
                  alignItems: 'center',
                }}
              >
                <div className="visily-icon-mint-box" style={{ width: 48, height: 48, borderRadius: '50%' }}>
                  <ShieldCheck size={26} color="#00796B" />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                    Auto-Match Specialist
                  </h4>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
                    No specific individual professional is listed for {serviceCategory} yet. Proceed with Auto-Matching and our system will notify and dispatch the nearest verified expert upon booking.
                  </p>
                </div>
                <div
                  className={`visily-radio-card ${selectedPro === null ? 'active' : ''}`}
                  onClick={() => setSelectedPro(null)}
                  style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
                >
                  <div className="visily-icon-mint-box" style={{ width: 38, height: 38 }}>
                    <CheckCircle2 size={18} color="#00796B" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 13.5, color: '#0F172A', display: 'block' }}>
                      Proceed with Auto-Matching
                    </strong>
                    <small style={{ fontSize: 12, color: '#64748B' }}>
                      Top verified specialist dispatched to your location
                    </small>
                  </div>
                  <div className={`visily-radio-circle ${selectedPro === null ? 'active' : ''}`}>
                    {selectedPro === null && <div className="visily-radio-circle-dot" />}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Auto-Match Card */}
                <div
                  className={`visily-pro-list-card ${selectedPro === null ? 'active' : ''}`}
                  onClick={() => setSelectedPro(null)}
                  style={{ background: selectedPro === null ? '#F0FDFA' : '#FFFFFF' }}
                >
                  <div className="visily-icon-mint-box" style={{ width: 48, height: 48, borderRadius: 14 }}>
                    <ShieldCheck size={24} color="#00796B" />
                  </div>
                  <div className="visily-pro-info-col">
                    <div className="visily-pro-name-row">
                      <span className="visily-pro-name">Auto-Match Best Available</span>
                      <span className="visily-verified-chip">
                        <CheckCircle2 size={12} /> Recommended
                      </span>
                    </div>
                    <div className="visily-pro-meta">
                      <span>Quickest response</span>
                      <span>•</span>
                      <span>Verified professionals nearby</span>
                    </div>
                  </div>
                  <div className={`visily-radio-circle ${selectedPro === null ? 'active' : ''}`}>
                    {selectedPro === null && <div className="visily-radio-circle-dot" />}
                  </div>
                </div>

                {filteredPros.map((pro) => {
                  const isSelected = selectedPro?.id === pro.id;
                  return (
                    <div
                      key={pro.id}
                      className={`visily-pro-list-card ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedPro(pro)}
                    >
                      <div className="visily-pro-avatar-wrap">
                        {pro.avatar ? (
                          <img
                            src={pro.avatar}
                            alt={pro.full_name}
                            className="visily-pro-avatar-img"
                          />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              borderRadius: '50%',
                              background: '#00796B',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 16,
                            }}
                          >
                            {pro.full_name?.charAt(0) || 'P'}
                          </div>
                        )}
                        <span className="visily-pro-verified-tick">✓</span>
                      </div>

                      <div className="visily-pro-info-col">
                        <div className="visily-pro-name-row">
                          <span className="visily-pro-name">{pro.full_name}</span>
                          <span className="visily-verified-chip">
                            <CheckCircle2 size={12} /> Verified
                          </span>
                        </div>
                        <div className="visily-pro-meta">
                          <span style={{ color: '#F59E0B', fontWeight: 700 }}>
                            ★ {pro.avg_rating}
                          </span>
                          <span>({pro.review_count} reviews)</span>
                          <span>•</span>
                          <span>{pro.experience_years}+ yrs exp</span>
                          <span>•</span>
                          <span style={{ color: '#0369A1', fontWeight: 600 }}>📍 {pro.work_location_name || pro.city || pro.district || destinationDistrict}</span>
                          {pro.distance_km && (
                            <>
                              <span>•</span>
                              <span>{pro.distance_km} km away</span>
                            </>
                          )}
                        </div>
                        <div className="visily-pro-tags">
                          {pro.tags.map((t, idx) => (
                            <span key={idx} className="visily-pro-tag">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <span className="visily-pro-price">₹{pro.hourly_rate}/hr</span>
                        {currentMarkup > 0 && (
                          <span style={{ fontSize: 10, color: '#D97706', fontWeight: 700, background: '#FEF3C7', padding: '1px 5px', borderRadius: 4 }}>
                            +{currentMarkup}% {destinationDistrict}
                          </span>
                        )}
                        <div className={`visily-radio-circle ${isSelected ? 'active' : ''}`}>
                          {isSelected && <div className="visily-radio-circle-dot" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: 'auto', paddingTop: 10 }}>
              <button
                className="visily-pill-btn"
                onClick={() => setStep(6)}
                disabled={loadingPros}
              >
                Next <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ──────── SCREEN 6: Booking Summary / Price Summary ──────── */}
        {step === 6 && (
          <div className="visily-body">
            <div className="visily-title-group">
              <h3 className="visily-screen-title">Booking Summary</h3>
              <p className="visily-screen-subtitle">Here's the estimated cost for your service.</p>
            </div>

            {/* Selected Professional Preview */}
            {selectedPro ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  background: '#F8FAFC',
                  borderRadius: 16,
                  border: '1px solid #E2E8F0',
                }}
              >
                {selectedPro.avatar ? (
                  <img
                    src={selectedPro.avatar}
                    alt={selectedPro.full_name}
                    style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: '#00796B',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  >
                    {selectedPro.full_name?.charAt(0) || 'P'}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <strong style={{ fontSize: 14, color: '#0F172A' }}>
                      {selectedPro.full_name}
                    </strong>
                    <span className="visily-verified-chip">
                      <CheckCircle2 size={11} /> Verified
                    </span>
                  </div>
                  <small style={{ fontSize: 12, color: '#64748B' }}>
                    ★ {selectedPro.avg_rating} ({selectedPro.review_count} reviews) •{' '}
                    {selectedPro.experience_years}+ yrs exp
                    {selectedPro.distance_km ? ` • ${selectedPro.distance_km} km away` : ''}
                  </small>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  background: '#F0FDFA',
                  borderRadius: 16,
                  border: '1px solid #99F6E4',
                }}
              >
                <div className="visily-icon-mint-box" style={{ width: 44, height: 44, borderRadius: '50%' }}>
                  <ShieldCheck size={22} color="#00796B" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <strong style={{ fontSize: 14, color: '#0F172A' }}>
                      Auto-Matching Specialist
                    </strong>
                    <span className="visily-verified-chip">
                      <CheckCircle2 size={11} /> Verified
                    </span>
                  </div>
                  <small style={{ fontSize: 12, color: '#00796B', fontWeight: 500 }}>
                    Top verified {serviceCategory} specialist will be assigned
                  </small>
                </div>
              </div>
            )}

            {/* Service & Location Recap */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="visily-icon-mint-box" style={{ width: 36, height: 36 }}>
                  <Wrench size={18} />
                </div>
                <div>
                  <strong style={{ fontSize: 13.5, color: '#0F172A', display: 'block' }}>
                    {subService}
                  </strong>
                  <small style={{ fontSize: 11.5, color: '#64748B' }}>
                    Fix leaking or faulty fittings and get smooth water flow.
                  </small>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="visily-icon-mint-box" style={{ width: 36, height: 36 }}>
                  <MapPin size={18} />
                </div>
                <div>
                  <strong style={{ fontSize: 13.5, color: '#0F172A', display: 'block' }}>
                    Service Location
                  </strong>
                  <small style={{ fontSize: 11.5, color: '#64748B' }}>{addressLine}</small>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="visily-icon-mint-box" style={{ width: 36, height: 36 }}>
                  <Calendar size={18} />
                </div>
                <div>
                  <strong style={{ fontSize: 13.5, color: '#0F172A', display: 'block' }}>
                    Date & Time
                  </strong>
                  <small style={{ fontSize: 11.5, color: '#64748B' }}>
                    {formatSelectedDate()}, {selectedSlot}
                  </small>
                </div>
              </div>
            </div>

            {/* Cost Breakdown Card */}
            <div className="visily-cost-card">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 8,
                  marginBottom: 8,
                  borderBottom: '1px dashed #CBD5E1',
                  fontSize: 12,
                }}
              >
                <span style={{ color: '#475569', fontWeight: 600 }}>Service Delivery Location</span>
                <span
                  style={{
                    background: '#E0F2FE',
                    color: '#0369A1',
                    fontWeight: 700,
                    fontSize: 11.5,
                    padding: '2px 8px',
                    borderRadius: 6,
                  }}
                >
                  {effectiveServiceLocality ? `${effectiveServiceLocality}, ` : ''}{effectiveServiceCity} • {effectiveServiceDistrict}
                </span>
              </div>

              <div className="visily-cost-row">
                <span>Base Labour Price</span>
                <strong>
                  {dynamicPricing.loading ? (
                    <span style={{ color: '#64748B' }}>Checking price...</span>
                  ) : dynamicPricing.available ? (
                    `₹${dynamicPricing.base_price}`
                  ) : (
                    <span style={{ color: '#DC2626' }}>Unavailable</span>
                  )}
                </strong>
              </div>

              {dynamicPricing.applied_adjustment && (
                <div className="visily-cost-row">
                  <span>
                    Location Adjustment ({dynamicPricing.applied_adjustment.scope === 'locality'
                      ? `Locality: ${dynamicPricing.locality || 'Specific Area'}`
                      : dynamicPricing.applied_adjustment.scope === 'city'
                      ? `City: ${dynamicPricing.city}`
                      : dynamicPricing.applied_adjustment.scope === 'district'
                      ? `District: ${dynamicPricing.district}`
                      : 'Default Standard'})
                  </span>
                  <span style={{ color: '#0369A1', fontWeight: 700 }}>
                    {dynamicPricing.applied_adjustment.formatted}
                  </span>
                </div>
              )}

              {dynamicPricing.exact_override && (
                <div className="visily-cost-row" style={{ background: '#FEF3C7', padding: '4px 8px', borderRadius: 6 }}>
                  <span style={{ color: '#92400E', fontWeight: 600 }}>
                    Exact Manual Override ({dynamicPricing.exact_override.scope || 'Area'})
                  </span>
                  <span style={{ color: '#92400E', fontWeight: 800 }}>
                    ₹{dynamicPricing.exact_override.exact_price}
                  </span>
                </div>
              )}

              <div className="visily-cost-row">
                <span>Final Labour Charge</span>
                <strong>
                  {dynamicPricing.available ? `₹${dynamicPricing.price}` : '—'}
                </strong>
              </div>



              <div className="visily-cost-row total">
                <span>Estimated Total</span>
                <span style={{ color: dynamicPricing.available ? '#0D9488' : '#DC2626' }}>
                  {dynamicPricing.loading
                    ? 'Loading...'
                    : dynamicPricing.available
                    ? `₹${bookingPayableTotal}`
                    : 'N/A'}
                </span>
              </div>
              <small style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic', display: 'block', marginTop: 4 }}>
                Authoritative location-specific calculation for {effectiveServiceLocality ? `${effectiveServiceLocality}, ` : ''}{effectiveServiceCity}, {effectiveServiceDistrict}.
              </small>
              <p style={{ fontSize: 11, color: '#64748B', marginTop: 6, fontStyle: 'italic', lineHeight: 1.4, margin: '6px 0 0 0' }}>
                * Clearly labeled estimate: Location-specific wage for the selected service address. No separate travel expenses.
              </p>
            </div>

            {/* Error or Missing Pricing Notice */}
            {!dynamicPricing.available && !dynamicPricing.loading && (
              <div
                style={{
                  padding: 12,
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: 12,
                  color: '#991B1B',
                  fontSize: 13,
                  marginTop: 10,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <strong>Pricing Unavailable</strong>
                  <p style={{ margin: '3px 0 0' }}>
                    {dynamicPricing.message || 'Pricing is not configured for this service location. Please contact support.'}
                  </p>
                </div>
              </div>
            )}

            {errorMsg && (
              <div
                style={{
                  padding: 12,
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: 12,
                  color: '#991B1B',
                  fontSize: 13,
                  marginTop: 10,
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* Zero Advance Payment / Cancellation Policy Notice */}
            {dynamicPricing.available && (
              <div className="visily-trust-banner" style={{ marginTop: 10 }}>
                <ShieldCheck size={20} color="#00796B" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <strong>Zero advance payment required.</strong> Pay ₹{bookingPayableTotal} directly to your professional after service completion. Free cancellation up to 2 hours before scheduled time.
                </div>
              </div>
            )}

            <div style={{ marginTop: 'auto', paddingTop: 12 }}>
              <button
                className="visily-pill-btn"
                onClick={handleFinalBooking}
                disabled={loading || dynamicPricing.loading || !dynamicPricing.available}
                style={{
                  opacity: (!dynamicPricing.available || dynamicPricing.loading) ? 0.6 : 1,
                  cursor: (!dynamicPricing.available || dynamicPricing.loading) ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="spin" /> Confirming Booking...
                  </>
                ) : dynamicPricing.loading ? (
                  <>
                    <Loader2 size={18} className="spin" /> Fetching Price...
                  </>
                ) : !dynamicPricing.available ? (
                  'Price Unavailable for Location'
                ) : (
                  <>
                    Confirm Booking (₹{bookingPayableTotal}) <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ──────── SCREEN 9: Booking Confirmed! ──────── */}
        {step === 9 && (
          <div className="visily-body">
            <div className="visily-confirmed-wrap">
              <div className="visily-confirmed-check-circle">
                <Check size={44} strokeWidth={3} />
              </div>

              <h3 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
                Booking Confirmed!
              </h3>
              <p
                style={{
                  fontSize: 13.5,
                  color: '#64748B',
                  maxWidth: 320,
                  lineHeight: 1.45,
                  margin: '0 auto 16px',
                }}
              >
                Your service has been successfully booked. You'll receive a confirmation message
                shortly.
              </p>

              {/* Booking ID with Copy */}
              <div
                className="visily-booking-id-chip"
                onClick={() =>
                  copyBookingId(
                    `#SM-${confirmedRequest?.id || '20250615-001'}`
                  )
                }
                style={{ cursor: 'pointer' }}
                title="Click to copy"
              >
                <span>Booking ID #SM-{confirmedRequest?.id || '20250615-001'}</span>
                <Copy size={13} />
                {copied && (
                  <span style={{ fontSize: 11, color: '#004D40', marginLeft: 4 }}>Copied!</span>
                )}
              </div>

              {/* Confirmed Details Card */}
              <div
                className="visily-card"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                {selectedPro ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {selectedPro.avatar ? (
                      <img
                        src={selectedPro.avatar}
                        alt={selectedPro.full_name}
                        style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: '#00796B',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 16,
                        }}
                      >
                        {selectedPro.full_name?.charAt(0) || 'P'}
                      </div>
                    )}
                    <div>
                      <strong style={{ fontSize: 14.5, color: '#0F172A', display: 'block' }}>
                        {selectedPro.full_name}
                      </strong>
                      <small style={{ fontSize: 12, color: '#64748B' }}>
                        {serviceCategory} • {selectedPro.experience_years}+ yrs exp • ★ {selectedPro.avg_rating}
                      </small>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="visily-icon-mint-box" style={{ width: 44, height: 44, borderRadius: '50%' }}>
                      <ShieldCheck size={22} color="#00796B" />
                    </div>
                    <div>
                      <strong style={{ fontSize: 14.5, color: '#0F172A', display: 'block' }}>
                        Auto-Matched Specialist
                      </strong>
                      <small style={{ fontSize: 12, color: '#64748B' }}>
                        {serviceCategory} • Top verified specialist will be assigned
                      </small>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: '#334155',
                    paddingTop: 8,
                    borderTop: '1px solid #F1F5F9',
                  }}
                >
                  <Calendar size={15} color="#00796B" />
                  <span>
                    {formatSelectedDateFull()}, {selectedSlot}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    fontSize: 13,
                    color: '#334155',
                    paddingTop: 8,
                    borderTop: '1px solid #F1F5F9',
                  }}
                >
                  <MapPin size={15} color="#00796B" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ lineHeight: 1.4 }}>{addressLine}</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    fontSize: 13,
                    color: '#334155',
                    paddingTop: 8,
                    borderTop: '1px solid #F1F5F9',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={15} color="#00796B" />
                    <span>Destination District</span>
                  </div>
                  <span
                    style={{
                      background: currentMarkup === 30 ? '#FEE2E2' : currentMarkup === 20 ? '#FEF3C7' : '#E0F2FE',
                      color: currentMarkup === 30 ? '#991B1B' : currentMarkup === 20 ? '#92400E' : '#0369A1',
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: 700,
                    }}
                  >
                    {destinationDistrict} ({currentMarkup > 0 ? `+${currentMarkup}%` : 'Standard'})
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    fontSize: 13,
                    color: '#334155',
                    paddingTop: 8,
                    borderTop: '1px solid #F1F5F9',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>Total Amount</span>
                  <strong style={{ fontSize: 16, color: '#00796B' }}>₹{bookingPayableTotal}</strong>
                </div>

                {/* Confirmed Payment Terms */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    fontSize: 13,
                    color: '#334155',
                    paddingTop: 8,
                    borderTop: '1px solid #F1F5F9',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={16} color="#00796B" />
                    <span>Payment Term</span>
                  </div>
                  <span
                    style={{
                      background: '#ECFDF5',
                      color: '#047857',
                      padding: '3px 9px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <CheckCircle2 size={13} /> Pay After Service
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: '#475569',
                    background: '#F0FDFA',
                    border: '1px solid #CCFBF1',
                    borderRadius: 8,
                    padding: '8px 12px',
                    lineHeight: 1.45,
                  }}
                >
                  Zero advance payment required. Pay ₹{bookingPayableTotal} directly to {selectedPro?.full_name || 'the professional'} via cash or UPI upon job completion.
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                <button
                  className="visily-pill-btn"
                  onClick={() => {
                    onSuccess && onSuccess(confirmedRequest);
                  }}
                >
                  View Booking Details
                </button>
                <button className="visily-pill-btn-outline" onClick={onClose}>
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BookingModal;
