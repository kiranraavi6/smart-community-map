import React, { useState, useEffect, useMemo } from 'react';
import { 
  Map, 
  ListFilter, 
  Search, 
  Plus, 
  Layers, 
  Sparkles, 
  Bell, 
  User, 
  ShieldCheck, 
  BarChart3, 
  Heart, 
  Navigation, 
  X, 
  Compass, 
  CheckCircle2,
  Database,
  RefreshCw,
  Loader2,
  MapPin,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { 
  CommunityAsset, 
  CommunityNeed, 
  AssetReport, 
  InAppNotification 
} from './types';
import { ASSET_CATEGORIES, DEFAULT_MAP_CENTER, SUPPORTED_REGIONS } from './constants/categories';
import { 
  subscribeToAssets, 
  subscribeToNeeds, 
  subscribeToReports 
} from './services/assetService';
import { 
  subscribeToFavorites, 
  subscribeToNotifications, 
  toggleFavorite 
} from './services/userService';
import { 
  seedInitialDataIfNeeded, 
  getInitialAssets, 
  getInitialNeeds,
  isPoliceStationAsset
} from './services/seedService';
import { calculateDistanceKm } from './utils/geo';
import { useAuth } from './context/AuthContext';

// Components
import { InteractiveMap } from './components/map/InteractiveMap';
import { AssetCard } from './components/assets/AssetCard';
import { AssetDetailModal } from './components/assets/AssetDetailModal';
import { AddAssetModal } from './components/forms/AddAssetModal';
import { ReportModal } from './components/forms/ReportModal';
import { AIAssistantModal } from './components/ai/AIAssistantModal';
import { CommunityNeedsView } from './components/needs/CommunityNeedsView';
import { CommunityInsightsView } from './components/dashboard/CommunityInsightsView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { NotificationsDrawer } from './components/notifications/NotificationsDrawer';
import { UserProfileModal } from './components/profile/UserProfileModal';
import { AuthModal } from './components/auth/AuthModal';
import { CategoryIcon } from './components/common/CategoryBadge';

export default function App() {
  const { currentUser, userProfile, isModerator, isAdmin } = useAuth();

  // Core Data States
  const [assets, setAssets] = useState<CommunityAsset[]>([]);
  const [needs, setNeeds] = useState<CommunityNeed[]>([]);
  const [reports, setReports] = useState<AssetReport[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);

  // Layout and Navigation
  const [activeTab, setActiveTab] = useState<'map' | 'directory' | 'needs' | 'insights' | 'admin'>('map');
  const [mapLayoutMode, setMapLayoutMode] = useState<'split' | 'map_only' | 'list_only'>('split');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [radiusKm, setRadiusKm] = useState<number>(0); // 0 = any radius
  const [filterAccessibleOnly, setFilterAccessibleOnly] = useState(false);
  const [filterVerifiedOnly, setFilterVerifiedOnly] = useState(false);
  const [showNeedsMapLayer, setShowNeedsMapLayer] = useState(false);

  // Map Navigation Coordinates
  const [mapCenter, setMapCenter] = useState({
    lat: DEFAULT_MAP_CENTER.lat,
    lng: DEFAULT_MAP_CENTER.lng,
    zoom: DEFAULT_MAP_CENTER.zoom
  });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Modals & Drawers
  const [selectedAsset, setSelectedAsset] = useState<CommunityAsset | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [reportTargetAsset, setReportTargetAsset] = useState<CommunityAsset | null>(null);

  // 1. Initial Firestore Real-time Subscriptions with auto-seed check
  useEffect(() => {
    let unsubscribeAssets: () => void = () => {};
    let unsubscribeNeeds: () => void = () => {};
    let unsubscribeReports: () => void = () => {};

    const initializeData = async () => {
      setLoadingData(true);

      // Preload verified civic dataset into view immediately so markers and cards show on load
      const initialAssets = getInitialAssets();
      const initialNeeds = getInitialNeeds();
      setAssets((current) => (current.length === 0 ? initialAssets : current.filter(a => !isPoliceStationAsset(a))));
      setNeeds((current) => (current.length === 0 ? initialNeeds : current));

      // Auto-check and seed initial verified civic dataset to Firestore in background
      try {
        const seedResult = await seedInitialDataIfNeeded(false);
        if (seedResult.assets && seedResult.assets.length > 0) {
          setAssets((current) => (current.length === 0 ? seedResult.assets : current.filter(a => !isPoliceStationAsset(a))));
        }
        if (seedResult.needs && seedResult.needs.length > 0) {
          setNeeds((current) => (current.length === 0 ? seedResult.needs : current));
        }
      } catch (e) {
        console.warn('Initial civic seed check:', e);
      }

      unsubscribeAssets = subscribeToAssets((incoming) => {
        const filtered = (incoming || []).filter(a => !isPoliceStationAsset(a));
        if (filtered && filtered.length > 0) {
          setAssets(filtered);
        } else {
          // If Firestore returns empty list, ensure 15 verified civic assets remain in view
          setAssets((current) => {
            const curFiltered = current.filter(a => !isPoliceStationAsset(a));
            return curFiltered.length > 0 ? curFiltered : initialAssets;
          });
        }
        setLoadingData(false);
      }, currentUser?.uid, isModerator);

      unsubscribeNeeds = subscribeToNeeds((incomingNeeds) => {
        if (incomingNeeds && incomingNeeds.length > 0) {
          setNeeds(incomingNeeds);
        } else {
          setNeeds((current) => (current.length > 0 ? current : initialNeeds));
        }
      });

      if (isModerator) {
        unsubscribeReports = subscribeToReports((incomingReports) => {
          setReports(incomingReports || []);
        });
      }
    };

    initializeData();

    return () => {
      unsubscribeAssets();
      unsubscribeNeeds();
      unsubscribeReports();
    };
  }, [currentUser?.uid, isModerator]);

  // 2. Favorites & Notifications Listener for authenticated user
  useEffect(() => {
    const uid = currentUser?.uid || userProfile?.uid;
    if (!uid) {
      setFavoriteIds([]);
      setNotifications([]);
      return;
    }

    const unsubFav = subscribeToFavorites(uid, (ids) => setFavoriteIds(ids));
    const unsubNotif = subscribeToNotifications(uid, (n) => setNotifications(n));

    return () => {
      unsubFav();
      unsubNotif();
    };
  }, [currentUser?.uid, userProfile?.uid]);

  // Deep-link to asset if URL contains ?asset=...
  useEffect(() => {
    if (assets.length === 0) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const targetAssetId = params.get('asset');
      if (targetAssetId) {
        const found = assets.find(a => a.id === targetAssetId);
        if (found) {
          setSelectedAsset(found);
          setMapCenter({ lat: found.latitude, lng: found.longitude, zoom: 16 });
          setIsDetailModalOpen(true);
        }
      }
    } catch {
      // ignore in iframe
    }
  }, [assets]);

  // Manual Trigger to Seed Verified Civic Data
  const handleSeedCivicData = async (force: boolean = false) => {
    setIsSeeding(true);

    // 1. Immediately load 15 verified civic assets into local/app state so map and directory populate instantly
    const initialAssets = getInitialAssets();
    const initialNeeds = getInitialNeeds();
    setAssets(initialAssets);
    setNeeds(initialNeeds);

    // 2. Concurrently, attempt to write the batch to Firestore's assets collection
    try {
      const result = await seedInitialDataIfNeeded(force);
      setSeedNotice(result.message);
      setTimeout(() => setSeedNotice(null), 6000);
    } catch (err: any) {
      console.warn('Firestore seeding notice:', err);
      // If Firestore returns error, catch gracefully and show helpful message without blocking display
      setSeedNotice('15 civic assets loaded into view. Sign in as Admin to permanently sync to Cloud Firestore.');
      setTimeout(() => setSeedNotice(null), 6000);
    } finally {
      setIsSeeding(false);
    }
  };

  // User Geolocation Request
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser or device.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setUserLocation(coords);
        setMapCenter({ lat: coords.lat, lng: coords.lng, zoom: 15 });
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        alert('Could not retrieve current location. Centering on Narsapur town center.');
        setMapCenter({ lat: DEFAULT_MAP_CENTER.lat, lng: DEFAULT_MAP_CENTER.lng, zoom: 14 });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Reference location for distance calculations
  const activeReferenceLocation = useMemo(() => {
    return userLocation || { lat: mapCenter.lat, lng: mapCenter.lng };
  }, [userLocation, mapCenter.lat, mapCenter.lng]);

  // Filtered Assets Pipeline
  const filteredAssets = useMemo(() => {
    return assets
      .map(asset => {
        const dist = calculateDistanceKm(
          activeReferenceLocation.lat,
          activeReferenceLocation.lng,
          asset.latitude,
          asset.longitude
        );
        return { ...asset, distanceKm: dist };
      })
      .filter(asset => {
        // Category filter
        if (selectedCategory !== 'all' && asset.categoryId !== selectedCategory) {
          return false;
        }
        // Verification filter
        if (filterVerifiedOnly && asset.verificationStatus !== 'verified') {
          return false;
        }
        // Accessibility filter
        if (filterAccessibleOnly && (!asset.accessibility || asset.accessibility.length === 0)) {
          return false;
        }
        // Radius filter
        if (radiusKm > 0 && asset.distanceKm !== undefined && asset.distanceKm > radiusKm) {
          return false;
        }
        // Search text query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = asset.name.toLowerCase().includes(q);
          const matchesAddress = asset.address.toLowerCase().includes(q);
          const matchesCity = asset.city.toLowerCase().includes(q);
          const matchesDesc = asset.description.toLowerCase().includes(q);
          const matchesLandmark = asset.landmark ? asset.landmark.toLowerCase().includes(q) : false;
          return matchesName || matchesAddress || matchesCity || matchesDesc || matchesLandmark;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
          return a.distanceKm - b.distanceKm;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [
    assets,
    activeReferenceLocation,
    selectedCategory,
    filterVerifiedOnly,
    filterAccessibleOnly,
    radiusKm,
    searchQuery
  ]);

  const handleToggleFavorite = async (assetId: string) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    const uid = currentUser.uid;
    const isFavorited = favoriteIds.includes(assetId);
    await toggleFavorite(uid, assetId, isFavorited);
  };

  const handleOpenReport = (asset: CommunityAsset) => {
    setReportTargetAsset(asset);
    setIsReportModalOpen(true);
  };

  const unreadNotifsCount = notifications.filter(n => !n.readAt).length;

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans antialiased">
      {/* 1. Global Floating Top Navigation Bar (Mapbox / Linear / Apple Maps style) */}
      <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between z-30 shrink-0">
        {/* Brand Identity & Location Badge */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-700 to-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Navigation className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Community Asset Map
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/80">
                Civic Grid
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Godavari Region • Narsapur
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="hidden sm:inline text-slate-400">Open Public Registry</span>
            </div>
          </div>
        </div>

        {/* Center Navigation Pills */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 text-xs font-semibold">
          <button
            id="nav-tab-map"
            onClick={() => setActiveTab('map')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'map'
                ? 'bg-white text-teal-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Map</span>
          </button>

          <button
            id="nav-tab-directory"
            onClick={() => setActiveTab('directory')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'directory'
                ? 'bg-white text-teal-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Directory</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700 font-mono">
              {assets.length}
            </span>
          </button>

          <button
            id="nav-tab-needs"
            onClick={() => setActiveTab('needs')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'needs'
                ? 'bg-white text-teal-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Needs</span>
            {needs.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 font-mono">
                {needs.length}
              </span>
            )}
          </button>

          <button
            id="nav-tab-insights"
            onClick={() => setActiveTab('insights')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'insights'
                ? 'bg-white text-teal-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Insights</span>
          </button>

          <button
            id="nav-tab-admin"
            onClick={() => setActiveTab('admin')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'admin'
                ? 'bg-white text-teal-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Control Center</span>
          </button>
        </nav>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Seed Action button if database is empty */}
          {assets.length === 0 && (
            <button
              id="btn-seed-civic-data-header"
              onClick={() => handleSeedCivicData(true)}
              disabled={isSeeding}
              className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-all animate-pulse"
              title="Populate 15 authentic facilities for Narsapur & Godavari"
            >
              {isSeeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5 text-amber-700" />}
              <span className="hidden sm:inline">Initialize Verified Data</span>
            </button>
          )}

          {/* AI Resource Assistant */}
          <button
            id="btn-open-ai-assistant"
            onClick={() => setIsAIAssistantOpen(true)}
            className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            title="Ask Grounded Community Resource Assistant"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-200" />
            <span className="hidden sm:inline">AI Resource Guide</span>
          </button>

          {/* Contribute Asset Button */}
          <button
            id="btn-open-add-asset"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold px-3 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4 text-teal-700" />
            <span className="hidden sm:inline">Contribute Asset</span>
          </button>

          {/* Notifications Button */}
          <button
            id="btn-open-notifications"
            onClick={() => setIsNotificationsOpen(true)}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
            )}
          </button>

          {/* User Profile or Sign In */}
          {currentUser ? (
            <button
              id="btn-open-profile"
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center border border-teal-200">
                {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : (userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : 'C')}
              </div>
              <span className="text-xs font-semibold hidden md:inline max-w-[100px] truncate">
                {userProfile?.displayName || userProfile?.name || 'Citizen'}
              </span>
            </button>
          ) : (
            <button
              id="btn-open-auth-modal"
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Seed Notice Banner if action taken */}
      {seedNotice && (
        <div className="bg-teal-600 text-white text-xs font-medium px-4 py-2 flex items-center justify-between z-40 shrink-0 shadow-sm animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-200" />
            <span>{seedNotice}</span>
          </div>
          <button onClick={() => setSeedNotice(null)} className="text-teal-200 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Empty Data Alert Banner if assets === 0 and not currently loading */}
      {!loadingData && assets.length === 0 && (
        <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950">
                Database currently has 0 civic records for Narsapur & Godavari region
              </p>
              <p className="text-[11px] text-amber-800">
                Populate 15 authentic public facilities (Government Hospitals, RO Water plants, Bus stations, Knowledge centers, and Coastal shelters).
              </p>
            </div>
          </div>
          <button
            id="btn-seed-civic-data-banner"
            onClick={() => handleSeedCivicData(true)}
            disabled={isSeeding}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all shrink-0"
          >
            {isSeeding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Writing to Firestore...</span>
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                <span>Initialize 15 Verified Civic Assets</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 2. Main Content Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col pb-14 md:pb-0">
        {activeTab === 'map' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Unified Search & Filter Bar (Apple Maps / Linear aesthetic) */}
            <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0 z-20 shadow-xs">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="map-search-input"
                  type="text"
                  placeholder="Search hospital, water RO plant, transit, PHC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all text-slate-800 placeholder:text-slate-400 font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Geographic Region & Locality Switcher */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    id="region-preset-select"
                    onChange={(e) => {
                      const found = SUPPORTED_REGIONS.find(r => r.name === e.target.value);
                      if (found) {
                        setMapCenter({ lat: found.lat, lng: found.lng, zoom: found.zoom });
                      }
                    }}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 appearance-none cursor-pointer"
                  >
                    <option value="">Jump to Town / Locality...</option>
                    {SUPPORTED_REGIONS.map(r => (
                      <option key={r.name} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* GPS Current Location button */}
                <button
                  id="btn-get-current-gps"
                  onClick={handleRequestLocation}
                  className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    userLocation
                      ? 'bg-teal-50 border-teal-300 text-teal-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  title={userLocation ? 'GPS active: click to recenter' : 'Locate my position via GPS'}
                >
                  <Compass className={`w-4 h-4 ${userLocation ? 'text-teal-600' : 'text-slate-500'}`} />
                  <span className="hidden sm:inline">{userLocation ? 'GPS Active' : 'Near Me'}</span>
                </button>
              </div>

              {/* Geographic Radius & Additional Filter Pills */}
              <div className="flex items-center gap-1.5 text-xs flex-wrap">
                {/* Distance radius selector */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                  <span className="text-[11px] text-slate-500 font-medium hidden md:inline">Radius:</span>
                  <select
                    id="map-radius-select"
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="text-xs bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value={0}>Any Radius</option>
                    <option value={1}>Within 1 km</option>
                    <option value={3}>Within 3 km</option>
                    <option value={5}>Within 5 km</option>
                    <option value={10}>Within 10 km</option>
                    <option value={25}>Within 25 km</option>
                  </select>
                </div>

                {/* Verified Only Toggle */}
                <button
                  onClick={() => setFilterVerifiedOnly(!filterVerifiedOnly)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 ${
                    filterVerifiedOnly
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  title="Filter verified civic resources only"
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 ${filterVerifiedOnly ? 'text-emerald-200' : 'text-slate-400'}`} />
                  <span>Verified</span>
                </button>

                {/* Accessibility Toggle */}
                <button
                  onClick={() => setFilterAccessibleOnly(!filterAccessibleOnly)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    filterAccessibleOnly
                      ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  title="Show only locations with wheelchair or tactile access"
                >
                  Accessible
                </button>

                {/* Needs Layer Toggle */}
                <button
                  onClick={() => setShowNeedsMapLayer(!showNeedsMapLayer)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 ${
                    showNeedsMapLayer
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  title="Overlay reported community infrastructure gaps"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${showNeedsMapLayer ? 'bg-white' : 'bg-rose-500'}`}></span>
                  <span>Needs Layer</span>
                </button>

                {/* Split/Map/List Toggle */}
                <div className="hidden lg:flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/70">
                  <button
                    onClick={() => setMapLayoutMode('split')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${mapLayoutMode === 'split' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Split
                  </button>
                  <button
                    onClick={() => setMapLayoutMode('map_only')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${mapLayoutMode === 'map_only' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Map
                  </button>
                  <button
                    onClick={() => setMapLayoutMode('list_only')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${mapLayoutMode === 'list_only' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    List
                  </button>
                </div>
              </div>
            </div>

            {/* Category Scroll Bar */}
            <div className="bg-white border-b border-slate-200/70 px-4 py-2 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0 no-scrollbar">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-full font-bold transition-all shrink-0 ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Resources ({assets.length})
              </button>

              {ASSET_CATEGORIES.map(c => {
                const count = assets.filter(a => a.categoryId === c.id).length;
                const isSelected = selectedCategory === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 border ${
                      isSelected
                        ? 'text-white shadow-xs border-transparent'
                        : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50'
                    }`}
                    style={isSelected ? { backgroundColor: c.color } : {}}
                  >
                    <CategoryIcon iconName={c.iconName} className="w-3.5 h-3.5" />
                    <span>{c.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Split Screen Container */}
            <div className="flex-1 flex overflow-hidden relative">
              {/* Left Side: Asset Cards List */}
              {mapLayoutMode !== 'map_only' && (
                <div className="w-full lg:w-[430px] shrink-0 border-r border-slate-200 bg-slate-50/70 overflow-y-auto p-4 space-y-3.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span>Showing <strong>{filteredAssets.length}</strong> resources</span>
                    {userLocation && <span className="text-teal-700 font-medium">Sorted by distance</span>}
                  </div>

                  {filteredAssets.map(asset => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      isSelected={selectedAsset?.id === asset.id}
                      onSelect={(a) => {
                        setSelectedAsset(a);
                        // On small screens, if list item clicked, focus map
                        if (window.innerWidth < 1024) {
                          setMapCenter({ lat: a.latitude, lng: a.longitude, zoom: 16 });
                        }
                      }}
                      onViewDetails={(a) => {
                        setSelectedAsset(a);
                        setIsDetailModalOpen(true);
                      }}
                      onToggleFavorite={handleToggleFavorite}
                      isFavorited={favoriteIds.includes(asset.id)}
                    />
                  ))}

                  {filteredAssets.length === 0 && (
                    <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <Layers className="w-6 h-6 text-slate-400" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {assets.length === 0 ? 'No community assets loaded in database' : 'No resources match your filters'}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                          {assets.length === 0
                            ? 'Initialize the verified civic infrastructure dataset for Narsapur, Bhimavaram, and Palakollu.'
                            : 'Try widening your search radius, resetting category filters, or checking back later.'}
                        </p>
                      </div>
                      {assets.length === 0 ? (
                        <button
                          onClick={() => handleSeedCivicData(true)}
                          disabled={isSeeding}
                          className="text-xs bg-teal-700 hover:bg-teal-800 text-white font-bold px-4 py-2 rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all"
                        >
                          {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                          <span>Initialize 15 Verified Civic Assets</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedCategory('all');
                            setFilterAccessibleOnly(false);
                            setFilterVerifiedOnly(false);
                            setRadiusKm(0);
                          }}
                          className="text-xs text-teal-700 font-bold underline"
                        >
                          Reset All Filters
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Right Side: Interactive Leaflet Map */}
              {mapLayoutMode !== 'list_only' && (
                <div className="flex-1 h-full relative">
                  <InteractiveMap
                    assets={filteredAssets}
                    communityNeeds={needs}
                    selectedAsset={selectedAsset}
                    onSelectAsset={(asset) => {
                      setSelectedAsset(asset);
                    }}
                    centerCoordinates={mapCenter}
                    userLocation={userLocation}
                    showNeedsLayer={showNeedsMapLayer}
                    searchRadiusCenter={radiusKm > 0 ? activeReferenceLocation : null}
                    radiusKm={radiusKm > 0 ? radiusKm : null}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Directory Tab View */}
        {activeTab === 'directory' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
            {/* Header & Metrics Summary */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Civic Resource Directory</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Comprehensive public registry of verified facilities, government services, healthcare centers, and water points across the Godavari delta.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search resources by name, area, or service..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs pl-9 pr-8 py-2.5 bg-white border border-slate-200/90 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {assets.length === 0 && (
                    <button
                      onClick={() => handleSeedCivicData(true)}
                      disabled={isSeeding}
                      className="px-3.5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 shrink-0"
                    >
                      {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                      <span>Seed Data</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Category Pills inside Directory */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3.5 py-1.5 rounded-full font-bold transition-all shrink-0 ${
                    selectedCategory === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  All ({assets.length})
                </button>
                {ASSET_CATEGORIES.map(c => {
                  const count = assets.filter(a => a.categoryId === c.id).length;
                  const isSelected = selectedCategory === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategory(c.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 border ${
                        isSelected
                          ? 'text-white shadow-xs border-transparent'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                      style={isSelected ? { backgroundColor: c.color } : {}}
                    >
                      <CategoryIcon iconName={c.iconName} className="w-3.5 h-3.5" />
                      <span>{c.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Asset Grid: 3-column responsive cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssets.map(asset => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onSelect={(a) => {
                    setSelectedAsset(a);
                    setIsDetailModalOpen(true);
                  }}
                  onViewDetails={(a) => {
                    setSelectedAsset(a);
                    setIsDetailModalOpen(true);
                  }}
                  onToggleFavorite={handleToggleFavorite}
                  isFavorited={favoriteIds.includes(asset.id)}
                />
              ))}
            </div>

            {filteredAssets.length === 0 && (
              <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Database className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {assets.length === 0 ? 'No civic resources in directory' : 'No matching resources found'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {assets.length === 0 
                      ? 'Initialize the verified public dataset for Narsapur, Bhimavaram, and Palakollu.'
                      : 'Try changing your search query or choosing another category filter.'}
                  </p>
                </div>
                {assets.length === 0 && (
                  <button
                    onClick={() => handleSeedCivicData(true)}
                    disabled={isSeeding}
                    className="mt-2 text-xs bg-teal-700 hover:bg-teal-800 text-white font-bold px-4 py-2 rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all"
                  >
                    {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                    <span>Initialize 15 Verified Civic Assets</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Community Needs Tab */}
        {activeTab === 'needs' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-5xl mx-auto w-full">
            <CommunityNeedsView
              needs={needs}
              onFocusNeedOnMap={(need) => {
                setActiveTab('map');
                setShowNeedsMapLayer(true);
                setMapCenter({ lat: need.latitude, lng: need.longitude, zoom: 15 });
              }}
            />
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-6xl mx-auto w-full">
            <CommunityInsightsView assets={assets} needs={needs} />
          </div>
        )}

        {/* Admin Control Center Tab */}
        {activeTab === 'admin' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-6xl mx-auto w-full space-y-6">
            {/* Database Management Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-teal-700" />
                  <h3 className="text-sm font-bold text-slate-900">Regional Database Management</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                    Firestore Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Currently managing <strong>{assets.length}</strong> live civic assets and <strong>{needs.length}</strong> community needs.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-admin-reseed-data"
                  onClick={() => handleSeedCivicData(true)}
                  disabled={isSeeding}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs flex items-center gap-2 transition-all"
                >
                  {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  <span>{assets.length === 0 ? 'Initialize Civic Data' : 'Reset / Reload 15 Facilities'}</span>
                </button>
              </div>
            </div>

            <AdminDashboard
              assets={assets}
              reports={reports}
              onSelectAsset={(a) => {
                setSelectedAsset(a);
                setIsDetailModalOpen(true);
              }}
            />
          </div>
        )}
      </main>

      {/* Modals and Overlays */}
      <AssetDetailModal
        asset={selectedAsset}
        onClose={() => setIsDetailModalOpen(false)}
        onReport={handleOpenReport}
        onToggleFavorite={handleToggleFavorite}
        isFavorited={selectedAsset ? favoriteIds.includes(selectedAsset.id) : false}
      />

      <AddAssetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultLocation={userLocation || { lat: DEFAULT_MAP_CENTER.lat, lng: DEFAULT_MAP_CENTER.lng }}
        onSuccess={() => {
          alert('Community resource submitted to moderation queue! Thank you for contributing.');
        }}
      />

      <ReportModal
        asset={reportTargetAsset}
        onClose={() => {
          setIsReportModalOpen(false);
          setReportTargetAsset(null);
        }}
        onSuccess={() => {
          alert('Report submitted successfully to the civic moderation queue. Community moderators will review and update the listing.');
        }}
      />

      <AIAssistantModal
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        assets={assets}
        userLocation={userLocation}
        onSelectAsset={(a) => {
          setSelectedAsset(a);
          setMapCenter({ lat: a.latitude, lng: a.longitude, zoom: 16 });
          setActiveTab('map');
        }}
      />

      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onNavigateToEntity={(entityId: string) => {
          const found = assets.find(a => a.id === entityId);
          if (found) {
            setSelectedAsset(found);
            setIsDetailModalOpen(true);
          }
        }}
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userAssets={assets.filter(a => a.submittedBy === (currentUser?.uid || userProfile?.uid))}
        savedAssets={assets.filter(a => favoriteIds.includes(a.id))}
        onSelectAsset={(a) => {
          setSelectedAsset(a);
          setIsDetailModalOpen(true);
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* 3. Ergonomic Mobile Bottom Navigation */}
      <nav aria-label="Mobile Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-1.5 px-3 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors ${
            activeTab === 'map' ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Map className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Map</span>
        </button>

        <button
          onClick={() => setActiveTab('directory')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors ${
            activeTab === 'directory' ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ListFilter className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Directory</span>
        </button>

        <button
          onClick={() => setActiveTab('needs')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg relative transition-colors ${
            activeTab === 'needs' ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="relative">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block"></span>
          </div>
          <span className="text-[10px] mt-0.5">Needs</span>
        </button>

        <button
          onClick={() => setActiveTab('insights')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors ${
            activeTab === 'insights' ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Insights</span>
        </button>

        <button
          onClick={() => setActiveTab('admin')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors ${
            activeTab === 'admin' ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Admin</span>
        </button>
      </nav>
    </div>
  );
}
