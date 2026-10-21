import { AssetCategory } from '../types';

export const ASSET_CATEGORIES: AssetCategory[] = [
  {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'Hospitals, Primary Health Centers (PHCs), clinics, pharmacies, and blood banks',
    iconName: 'HeartPulse',
    color: '#059669', // Emerald
    bgLight: '#ecfdf5',
    active: true
  },
  {
    id: 'education',
    name: 'Education & Literacy',
    description: 'Government schools, public libraries, colleges, and Anganwadi centers',
    iconName: 'GraduationCap',
    color: '#0284c7', // Sky blue
    bgLight: '#f0f9ff',
    active: true
  },
  {
    id: 'water_sanitation',
    name: 'Water & Sanitation',
    description: 'Public purified drinking water RO plants, community borewells, and public sanitation complexes',
    iconName: 'Droplets',
    color: '#0891b2', // Cyan
    bgLight: '#ecfeff',
    active: true
  },
  {
    id: 'public_infrastructure',
    name: 'Public Infrastructure',
    description: 'Panchayat offices, Municipal Ward Secretariats, post offices, and civic centers',
    iconName: 'Building2',
    color: '#4f46e5', // Indigo
    bgLight: '#eef2ff',
    active: true
  },
  {
    id: 'community_centers',
    name: 'Community Centers',
    description: 'Kalyana Mandapams, community halls, elder care centers, and recreation spaces',
    iconName: 'Users',
    color: '#d97706', // Amber
    bgLight: '#fffbeb',
    active: true
  },
  {
    id: 'government_services',
    name: 'Government Services',
    description: 'MeeSeva centres, Aadhaar seva kendras, ration distribution depots (FP Shops), police stations',
    iconName: 'ShieldCheck',
    color: '#7c3aed', // Purple
    bgLight: '#f5f3ff',
    active: true
  },
  {
    id: 'ngos_social',
    name: 'NGOs & Social Orgs',
    description: 'Charities, food banks, shelters, animal welfare, and women empowerment SHGs',
    iconName: 'HandHeart',
    color: '#db2777', // Pink
    bgLight: '#fdf2f8',
    active: true
  },
  {
    id: 'environment_parks',
    name: 'Green Spaces & Parks',
    description: 'Public parks, botanical gardens, lakes, eco-tourism centers, and waste composting facilities',
    iconName: 'Trees',
    color: '#16a34a', // Green
    bgLight: '#f0fdf4',
    active: true
  },
  {
    id: 'emergency_services',
    name: 'Emergency Services',
    description: 'Fire stations, 108 ambulance base points, disaster relief centers, and disaster response teams',
    iconName: 'Flame',
    color: '#dc2626', // Red
    bgLight: '#fef2f2',
    active: true
  },
  {
    id: 'transportation',
    name: 'Public Transportation',
    description: 'APSRTC bus stations, railway halts, auto stands, and cycle hubs',
    iconName: 'Bus',
    color: '#ca8a04', // Yellow-amber
    bgLight: '#fefce8',
    active: true
  },
  {
    id: 'public_utilities',
    name: 'Public Utilities',
    description: 'Electricity sub-stations, gas customer centers, public Wi-Fi zones, and waste collection points',
    iconName: 'Zap',
    color: '#ea580c', // Orange
    bgLight: '#fff7ed',
    active: true
  },
  {
    id: 'other',
    name: 'Other Community Assets',
    description: 'Cultural centers, historical landmarks, religious shrines with community feeding, and skill centers',
    iconName: 'MapPin',
    color: '#475569', // Slate
    bgLight: '#f8fafc',
    active: true
  }
];

export const ACCESSIBILITY_FEATURES = [
  'Wheelchair Ramp',
  'Accessible Restrooms',
  'Elevator / Lift',
  'Tactile Paving',
  'Braille Signage',
  'Designated Accessible Parking',
  'Ground Floor Accessible',
  'Audio Announcements / Assistance'
];

export const COMMON_FACILITIES = [
  'Free Drinking Water',
  'Clean Public Restroom',
  '24/7 Emergency Access',
  'Power Backup / Generator',
  'Waiting Area / Seating',
  'Free Wi-Fi',
  'First Aid Available',
  'Two-Wheeler / Car Parking',
  'CCTV Surveillance',
  'Help Desk / Greeter'
];

export const DEFAULT_MAP_CENTER = {
  lat: parseFloat(import.meta.env.VITE_DEFAULT_LAT || '16.4344'),
  lng: parseFloat(import.meta.env.VITE_DEFAULT_LNG || '81.6985'),
  zoom: 13,
  city: import.meta.env.VITE_DEFAULT_CITY || 'Narsapur',
  state: import.meta.env.VITE_DEFAULT_STATE || 'Andhra Pradesh',
  region: 'West Godavari District'
};

export const SUPPORTED_REGIONS = [
  { name: 'Narsapur Town & Godavari Riverfront', lat: 16.4344, lng: 81.6985, zoom: 14 },
  { name: 'Palakollu Municipal Area', lat: 16.5256, lng: 81.7289, zoom: 14 },
  { name: 'Bhimavaram Commercial Hub', lat: 16.5449, lng: 81.5212, zoom: 14 },
  { name: 'Vijayawada Central & Rail Hub', lat: 16.5135, lng: 80.6225, zoom: 14 },
  { name: 'Benz Circle & MG Road Commercial', lat: 16.5015, lng: 80.6515, zoom: 14 },
  { name: 'Gunadala & Health University Hub', lat: 16.5204, lng: 80.6651, zoom: 14 },
  { name: 'Bhavanipuram & Krishna Riverfront', lat: 16.5255, lng: 80.5901, zoom: 14 },
  { name: 'Amaravati Capital City (Rayapudi)', lat: 16.5414, lng: 80.5157, zoom: 13 },
  { name: 'Visakhapatnam Metropolitan', lat: 17.6868, lng: 83.2185, zoom: 12 },
  { name: 'Tirupati Temple Region', lat: 13.6288, lng: 79.4192, zoom: 13 }
];
