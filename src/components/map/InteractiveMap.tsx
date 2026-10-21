import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Supercluster from 'supercluster';
import { CommunityAsset, CommunityNeed } from '../../types';
import { ASSET_CATEGORIES } from '../../constants/categories';

interface InteractiveMapProps {
  assets: CommunityAsset[];
  communityNeeds?: CommunityNeed[];
  selectedAsset: CommunityAsset | null;
  onSelectAsset: (asset: CommunityAsset) => void;
  centerCoordinates: { lat: number; lng: number; zoom: number };
  userLocation?: { lat: number; lng: number } | null;
  showNeedsLayer?: boolean;
  searchRadiusCenter?: { lat: number; lng: number } | null;
  radiusKm?: number | null;
  onMapCenterChange?: (coords: { lat: number; lng: number; zoom: number }) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  assets,
  communityNeeds = [],
  selectedAsset,
  onSelectAsset,
  centerCoordinates,
  userLocation,
  showNeedsLayer = false,
  searchRadiusCenter,
  radiusKm
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const needsLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const superclusterRef = useRef<Supercluster<CommunityAsset, any> | null>(null);
  const activePopupsRef = useRef<Map<string, L.Marker>>(new Map());

  // 1. Initialize Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [centerCoordinates.lat, centerCoordinates.lng],
        zoom: centerCoordinates.zoom,
        zoomControl: false,
        preferCanvas: true
      });

      // Standard OpenStreetMap tiles - clean, reliable, no API key or watermark required
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom zoom control
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Dedicated layer groups
      markersLayerRef.current = L.layerGroup().addTo(map);
      needsLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    // Auto-invalidate map size when viewport or split-view container resizes
    const container = mapContainerRef.current;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const observer = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 120);
    });

    if (container) {
      observer.observe(container);
    }

    return () => {
      observer.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Build Supercluster Spatial Index when assets change
  useEffect(() => {
    const clusterIndex = new Supercluster<CommunityAsset, any>({
      radius: 48,
      maxZoom: 16,
      minPoints: 2
    });

    const points = assets.map(asset => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [asset.longitude, asset.latitude] as [number, number]
      },
      properties: asset
    }));

    clusterIndex.load(points);
    superclusterRef.current = clusterIndex;
    renderVisibleClusters();
  }, [assets]);

  // 3. Cluster rendering engine
  const renderVisibleClusters = useCallback(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const clusterIndex = superclusterRef.current;

    if (!map || !markersLayer || !clusterIndex) return;

    markersLayer.clearLayers();
    activePopupsRef.current.clear();

    const bounds = map.getBounds();
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth()
    ];
    const currentZoom = Math.floor(map.getZoom());

    const clusters = clusterIndex.getClusters(bbox, currentZoom);

    clusters.forEach(feature => {
      const [lng, lat] = feature.geometry.coordinates;
      const isCluster = (feature.properties as any).cluster;

      if (isCluster) {
        // Render Cluster Marker
        const pointCount = (feature.properties as any).point_count as number;
        const clusterId = (feature.properties as any).cluster_id as number;

        const size = pointCount < 10 ? 36 : pointCount < 50 ? 42 : 48;
        const fontSize = pointCount < 10 ? 12 : 13;

        const clusterHtml = `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: ${size}px;
            height: ${size}px;
            border-radius: 9999px;
            background: #047857;
            color: #ffffff;
            font-weight: 700;
            font-size: ${fontSize}px;
            box-shadow: 0 4px 14px rgba(4, 120, 87, 0.45);
            border: 2.5px solid #ffffff;
            cursor: pointer;
            transition: transform 0.15s ease;
          " onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'">
            ${pointCount}
          </div>
        `;

        const clusterIcon = L.divIcon({
          className: 'custom-cluster-marker',
          html: clusterHtml,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2]
        });

        const clusterMarker = L.marker([lat, lng], {
          icon: clusterIcon,
          title: `${pointCount} civic facilities in this area`
        });

        clusterMarker.on('click', () => {
          const expansionZoom = clusterIndex.getClusterExpansionZoom(clusterId);
          map.flyTo([lat, lng], Math.min(expansionZoom, 18), { duration: 0.6 });
        });

        markersLayer.addLayer(clusterMarker);
      } else {
        // Render Individual Asset Marker
        const asset = feature.properties as CommunityAsset;
        const category = ASSET_CATEGORIES.find(c => c.id === asset.categoryId) || ASSET_CATEGORIES[ASSET_CATEGORIES.length - 1];
        const isSelected = selectedAsset?.id === asset.id;
        const markerColor = category.color;

        const markerHtml = `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: ${isSelected ? '36px' : '30px'};
            height: ${isSelected ? '36px' : '30px'};
            background-color: ${markerColor};
            color: #ffffff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 3px 10px rgba(15, 23, 42, 0.3);
            border: 2.5px solid ${isSelected ? '#ffffff' : '#ffffff'};
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          ">
            ${isSelected ? '<div style="position: absolute; inset: -6px; border-radius: 50%; border: 2px solid #059669; opacity: 0.8;"></div>' : ''}
            <div style="transform: rotate(45deg); width: 8px; height: 8px; border-radius: 50%; background: #ffffff;"></div>
          </div>
        `;

        const customIcon = L.divIcon({
          className: 'custom-asset-marker',
          html: markerHtml,
          iconSize: [isSelected ? 36 : 30, isSelected ? 36 : 30],
          iconAnchor: [isSelected ? 18 : 15, isSelected ? 36 : 30]
        });

        const marker = L.marker([asset.latitude, asset.longitude], {
          icon: customIcon,
          title: asset.name,
          zIndexOffset: isSelected ? 1000 : 0
        });

        const isVerified = asset.verificationStatus === 'verified';
        const popupContent = `
          <div style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; min-width: 220px; max-width: 260px; padding: 12px 14px; background: #ffffff; border-radius: 14px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 6px;">
              <span style="display: inline-block; font-size: 10px; font-weight: 700; color: ${category.color}; background: ${category.color}15; border: 1px solid ${category.color}25; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.03em;">
                ${category.name}
              </span>
              <span style="font-size: 10px; font-weight: 600; color: ${isVerified ? '#047857' : '#b45309'}; background: ${isVerified ? '#ecfdf5' : '#fffbeb'}; border: 1px solid ${isVerified ? '#a7f3d0' : '#fde68a'}; padding: 1px 6px; border-radius: 4px;">
                ${isVerified ? '✓ Verified' : '• ' + asset.verificationStatus}
              </span>
            </div>
            <h4 style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.3;">
              ${asset.name}
            </h4>
            <p style="margin: 0 0 6px; font-size: 11px; color: #475569; line-height: 1.35;">
              📍 ${asset.address}${asset.city ? ', ' + asset.city : ''}
            </p>
            ${asset.operatingHours ? `<p style="margin: 0 0 6px; font-size: 11px; color: #64748b; font-weight: 500;">🕒 ${asset.operatingHours}</p>` : ''}
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #f1f5f9; text-align: right;">
              <span style="font-size: 11px; font-weight: 600; color: #047857;">
                Click to inspect details →
              </span>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, { offset: [0, -28] });

        marker.on('click', () => {
          onSelectAsset(asset);
        });

        markersLayer.addLayer(marker);
        activePopupsRef.current.set(asset.id, marker);

        if (isSelected) {
          setTimeout(() => {
            marker.openPopup();
          }, 100);
        }
      }
    });
  }, [selectedAsset, onSelectAsset]);

  // 4. Attach viewport change listeners to re-render clusters smoothly
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    let moveTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleMove = () => {
      if (moveTimeout) clearTimeout(moveTimeout);
      moveTimeout = setTimeout(() => {
        renderVisibleClusters();
      }, 50);
    };

    map.on('moveend', handleMove);
    map.on('zoomend', handleMove);

    return () => {
      if (moveTimeout) clearTimeout(moveTimeout);
      map.off('moveend', handleMove);
      map.off('zoomend', handleMove);
    };
  }, [renderVisibleClusters]);

  // 5. Center coordinates update
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(
        [centerCoordinates.lat, centerCoordinates.lng],
        centerCoordinates.zoom,
        { duration: 1.0 }
      );
    }
  }, [centerCoordinates]);

  // 6. Synchronized Selected Asset Reaction
  useEffect(() => {
    if (!selectedAsset || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const targetLat = selectedAsset.latitude;
    const targetLng = selectedAsset.longitude;

    // Check if zoomed in enough to uncluster
    const currentZoom = map.getZoom();
    const desiredZoom = Math.max(currentZoom, 16);

    map.flyTo([targetLat, targetLng], desiredZoom, {
      duration: 0.8
    });

    // Once map moves, trigger popup
    setTimeout(() => {
      renderVisibleClusters();
      const marker = activePopupsRef.current.get(selectedAsset.id);
      if (marker) {
        marker.openPopup();
      }
    }, 850);
  }, [selectedAsset, renderVisibleClusters]);

  // 7. Render Live GPS User Location
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `
          <div style="position: relative; width: 24px; height: 24px;">
            <div style="position: absolute; inset: 0; border-radius: 9999px; background: #059669; opacity: 0.35; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; inset: 3px; border-radius: 9999px; background: #059669; border: 2.5px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
        icon: userIcon,
        title: 'Your Approximate GPS Location',
        zIndexOffset: 900
      }).addTo(mapInstanceRef.current);

      userMarkerRef.current.bindPopup(`
        <div style="font-family: system-ui, sans-serif; font-size: 12px; font-weight: 600; color: #065f46;">
          📍 Your Current GPS Location
        </div>
      `);
    }
  }, [userLocation]);

  // 8. Render Visual Radius Filter Circle
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (radiusCircleRef.current) {
      radiusCircleRef.current.remove();
      radiusCircleRef.current = null;
    }

    const center = searchRadiusCenter || userLocation;
    if (center && radiusKm && radiusKm > 0) {
      radiusCircleRef.current = L.circle([center.lat, center.lng], {
        radius: radiusKm * 1000,
        color: '#059669',
        fillColor: '#10b981',
        fillOpacity: 0.08,
        weight: 1.75,
        dashArray: '6, 6'
      }).addTo(mapInstanceRef.current);
    }
  }, [searchRadiusCenter, userLocation, radiusKm]);

  // 9. Community Needs Layer
  useEffect(() => {
    if (!needsLayerRef.current) return;

    needsLayerRef.current.clearLayers();

    if (showNeedsLayer && communityNeeds.length > 0) {
      communityNeeds.forEach(need => {
        const needHtml = `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            background-color: #dc2626;
            color: #ffffff;
            border-radius: 9999px;
            box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.25), 0 3px 6px rgba(0,0,0,0.3);
            border: 2px solid #ffffff;
            font-size: 11px;
            font-weight: 800;
          ">
            !
          </div>
        `;

        const needIcon = L.divIcon({
          className: 'custom-need-marker',
          html: needHtml,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const needMarker = L.marker([need.latitude, need.longitude], {
          icon: needIcon,
          title: `Need: ${need.title}`
        });

        const needPopup = `
          <div style="font-family: system-ui, sans-serif; min-width: 210px;">
            <span style="display: inline-block; font-size: 10px; font-weight: 700; color: #dc2626; background: #fee2e2; padding: 1px 6px; border-radius: 4px; margin-bottom: 4px;">
              COMMUNITY NEED REPORT
            </span>
            <h4 style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: #0f172a;">
              ${need.title}
            </h4>
            <p style="margin: 0 0 4px; font-size: 11px; color: #475569;">
              ${need.locality}
            </p>
            <div style="font-size: 11px; font-weight: 600; color: #b91c1c;">
              ▲ ${need.upvotes || 0} Citizens Supported
            </div>
          </div>
        `;

        needMarker.bindPopup(needPopup, { offset: [0, -10] });
        needsLayerRef.current?.addLayer(needMarker);
      });
    }
  }, [communityNeeds, showNeedsLayer]);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(
        [centerCoordinates.lat, centerCoordinates.lng],
        centerCoordinates.zoom,
        { duration: 0.8 }
      );
    }
  };

  const handleLocateMe = () => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 16, { duration: 0.8 });
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-100 min-h-[400px]">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      
      {/* Floating Map Quick Controls */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
        <button
          type="button"
          onClick={handleRecenter}
          className="w-9 h-9 rounded-lg bg-white/95 backdrop-blur-xs text-slate-700 hover:text-emerald-700 hover:bg-white shadow-md border border-slate-200/80 flex items-center justify-center transition-colors text-xs font-semibold"
          title="Recenter Map"
        >
          📍
        </button>
        {userLocation && (
          <button
            type="button"
            onClick={handleLocateMe}
            className="w-9 h-9 rounded-lg bg-white/95 backdrop-blur-xs text-slate-700 hover:text-emerald-700 hover:bg-white shadow-md border border-slate-200/80 flex items-center justify-center transition-colors text-xs font-semibold"
            title="Focus On My GPS Location"
          >
            🎯
          </button>
        )}
      </div>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-xl p-3 shadow-lg text-xs text-slate-700 hidden sm:block max-w-xs">
        <div className="font-bold text-slate-900 mb-2 flex items-center justify-between gap-4 pb-1.5 border-b border-slate-100">
          <span className="text-[11px] uppercase tracking-wider text-slate-500">Civic Cartography</span>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{assets.length} assets</span>
        </div>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0"></span>
            <span className="font-medium text-slate-700">Verified Civic Resource</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-emerald-700 text-white text-[9px] font-bold flex items-center justify-center shrink-0">#</span>
            <span className="text-slate-600">Spatial Clusters (click to zoom)</span>
          </div>
          {radiusKm && (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full border border-emerald-600 bg-emerald-100 shrink-0"></span>
              <span className="text-slate-600">{radiusKm} km Search Boundary</span>
            </div>
          )}
          {showNeedsLayer && (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0"></span>
              <span className="text-slate-600">Citizen Reported Need</span>
            </div>
          )}
          {userLocation && (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shrink-0"></span>
              <span className="text-slate-600">Your Current Position</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
