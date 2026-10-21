import React from 'react';
import { 
  MapPin, 
  Phone, 
  ExternalLink, 
  Heart, 
  Share2, 
  Clock, 
  Accessibility, 
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Navigation2
} from 'lucide-react';
import { CommunityAsset } from '../../types';
import { CategoryBadge, CategoryIcon } from '../common/CategoryBadge';
import { ASSET_CATEGORIES } from '../../constants/categories';
import { formatDistance } from '../../utils/geo';

interface AssetCardProps {
  asset: CommunityAsset;
  isSelected?: boolean;
  onSelect?: (asset: CommunityAsset) => void;
  onToggleFavorite?: (assetId: string) => void;
  isFavorited?: boolean;
  onViewDetails?: (asset: CommunityAsset) => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({
  asset,
  isSelected = false,
  onSelect,
  onToggleFavorite,
  isFavorited = false,
  onViewDetails
}) => {
  const category = ASSET_CATEGORIES.find(c => c.id === asset.categoryId) || ASSET_CATEGORIES[0];
  const primaryImage = asset.imageUrls && asset.imageUrls.length > 0 ? asset.imageUrls[0] : null;
  const isVerified = asset.verificationStatus === 'verified' || asset.status === 'verified';

  // Helper for operating status tag
  const isAlwaysOpen = asset.operatingHours?.toLowerCase().includes('24 hour') || asset.operatingHours?.toLowerCase().includes('24/7');

  const handleDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `https://www.google.com/maps/dir/?api=1&destination=${asset.latitude},${asset.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: asset.name,
        text: `Explore ${asset.name} on Community Asset Map`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/?asset=${asset.id}`);
      alert('Asset link copied to clipboard!');
    }
  };

  return (
    <div
      id={`asset-card-${asset.id}`}
      onClick={() => onSelect?.(asset)}
      className={`group relative bg-white rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col ${
        isSelected
          ? 'border-teal-600/90 shadow-md ring-2 ring-teal-500/20 bg-slate-50/40'
          : 'border-slate-200/90 hover:border-slate-300 hover:shadow-md hover:shadow-slate-100 hover:-translate-y-0.5'
      }`}
    >
      {/* Thumbnail or Category Header */}
      <div className="relative w-full h-36 bg-slate-100 overflow-hidden shrink-0">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={asset.name}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div 
            className="w-full h-full flex flex-col items-center justify-center p-4"
            style={{ background: `linear-gradient(135deg, ${category.bgLight || '#f1f5f9'} 0%, #ffffff 100%)` }}
          >
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs mb-1"
              style={{ backgroundColor: `${category.color}15`, color: category.color }}
            >
              <CategoryIcon iconName={category.iconName} className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {category.name}
            </span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-black/10" />

        {/* Top Badges overlay: Category & Verified Status */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <span 
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold backdrop-blur-md shadow-xs"
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.94)', 
              color: category.color 
            }}
          >
            <CategoryIcon iconName={category.iconName} className="w-3.5 h-3.5" />
            <span>{category.name}</span>
          </span>

          {/* Action buttons (Fav & Share) on thumbnail */}
          <div className="flex items-center gap-1">
            {onToggleFavorite && (
              <button
                id={`fav-btn-${asset.id}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(asset.id);
                }}
                className={`w-7 h-7 rounded-lg backdrop-blur-md flex items-center justify-center transition-all ${
                  isFavorited
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-white/90 text-slate-600 hover:text-rose-500 hover:bg-white'
                }`}
                title={isFavorited ? 'Remove from saved' : 'Save resource'}
              >
                <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-current' : ''}`} />
              </button>
            )}

            <button
              id={`share-btn-${asset.id}`}
              type="button"
              onClick={handleShare}
              className="w-7 h-7 rounded-lg bg-white/90 backdrop-blur-md text-slate-600 hover:text-slate-900 hover:bg-white flex items-center justify-center transition-colors shadow-xs"
              title="Share resource"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom tags on thumbnail: Distance & Hours Indicator */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white font-medium z-10">
          {asset.distanceKm !== undefined ? (
            <span className="inline-flex items-center gap-1 bg-slate-950/70 backdrop-blur-md px-2 py-0.5 rounded-md text-slate-100 font-mono text-[10px]">
              <Navigation2 className="w-2.5 h-2.5 text-teal-400" />
              <span>{formatDistance(asset.distanceKm)}</span>
            </span>
          ) : (
            <span className="text-[11px] text-slate-200 truncate">
              {asset.city || 'Andhra Pradesh'}
            </span>
          )}

          {isAlwaysOpen ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              24/7 Open
            </span>
          ) : asset.operatingHours ? (
            <span className="inline-flex items-center gap-1 text-[10px] bg-slate-950/70 text-slate-200 px-2 py-0.5 rounded-md backdrop-blur-md truncate max-w-[140px]">
              <Clock className="w-2.5 h-2.5 text-slate-300" />
              <span className="truncate">{asset.operatingHours}</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* Content Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Title & Verified Indicator */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-1 tracking-tight">
              {asset.name}
            </h3>

            {isVerified && (
              <span 
                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md shrink-0"
                title="Officially verified civic infrastructure"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Verified</span>
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
            {asset.description}
          </p>

          {/* Address */}
          <div className="flex items-start gap-1.5 text-xs text-slate-500 mb-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="truncate text-slate-600">
              {asset.address}{asset.city ? `, ${asset.city}` : ''}
            </span>
          </div>

          {/* Accessibility pill tags */}
          {asset.accessibility && asset.accessibility.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md">
                <Accessibility className="w-3 h-3 text-teal-600" />
                <span>{asset.accessibility[0]}</span>
                {asset.accessibility.length > 1 && (
                  <span className="text-slate-400 font-semibold">+{asset.accessibility.length - 1}</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            id={`btn-directions-${asset.id}`}
            type="button"
            onClick={handleDirections}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors py-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Directions</span>
          </button>

          {onViewDetails && (
            <button
              id={`btn-details-${asset.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(asset);
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-950 group-hover:translate-x-0.5 transition-all py-1 px-2 rounded-lg hover:bg-slate-100"
            >
              <span>View Details</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
