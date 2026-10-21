import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Phone, 
  Globe, 
  Clock, 
  Accessibility, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Flag,
  Share2,
  Heart,
  Edit,
  Trash2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { CommunityAsset } from '../../types';
import { CategoryBadge } from '../common/CategoryBadge';
import { StatusBadge } from '../common/StatusBadge';
import { formatDistance } from '../../utils/geo';
import { useAuth } from '../../context/AuthContext';
import { deleteAsset } from '../../services/assetService';
import { EditAssetModal } from '../forms/EditAssetModal';

interface AssetDetailModalProps {
  asset: CommunityAsset | null;
  onClose: () => void;
  onReport: (asset: CommunityAsset) => void;
  onToggleFavorite?: (assetId: string) => void;
  isFavorited?: boolean;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  asset,
  onClose,
  onReport,
  onToggleFavorite,
  isFavorited = false
}) => {
  const { currentUser, isModerator, isAdmin } = useAuth();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!asset) return null;

  const images = (asset.images && asset.images.length > 0) 
    ? asset.images 
    : (asset.imageUrls && asset.imageUrls.length > 0) 
      ? asset.imageUrls 
      : [];

  const mainImage = images[activeImageIndex] || 
    'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80';

  const canEditOrDelete = !!currentUser && (
    currentUser.uid === asset.submittedBy ||
    currentUser.uid === asset.createdBy ||
    isModerator ||
    isAdmin
  );

  const handleDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${asset.latitude},${asset.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: asset.name,
        text: `Community Asset: ${asset.name} - ${asset.address}`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAsset(asset.id);
      onClose();
    } catch (err: any) {
      console.error('Failed to delete asset:', err);
      setDeleteError(err.message || 'Failed to delete asset from Firestore.');
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <div 
          id="asset-detail-modal"
          className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
        >
          {/* Top Banner & Photo */}
          <div className="relative h-56 sm:h-64 bg-slate-900 shrink-0">
            <img
              src={mainImage}
              alt={asset.name}
              className="w-full h-full object-cover opacity-85"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

            {/* Close & Action Buttons on Banner */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
              {onToggleFavorite && (
                <button
                  id="modal-fav-btn"
                  onClick={() => onToggleFavorite(asset.id)}
                  className="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-red-500 flex items-center justify-center shadow-md transition-all"
                  title="Save asset"
                >
                  <Heart className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                </button>
              )}
              <button
                id="modal-share-btn"
                onClick={handleShare}
                className="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-700 flex items-center justify-center shadow-md transition-all"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                id="modal-close-btn"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-700 flex items-center justify-center shadow-md transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Asset Title on Banner */}
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <CategoryBadge categoryId={asset.categoryId || asset.category || 'other'} />
                <StatusBadge status={asset.verificationStatus || asset.status || 'pending'} />
                {asset.distanceKm !== undefined && (
                  <span className="text-xs font-semibold bg-white/20 backdrop-blur-md text-white px-2 py-0.5 rounded-full">
                    {formatDistance(asset.distanceKm)}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white drop-shadow-sm leading-tight">
                {asset.name}
              </h2>
            </div>
          </div>

          {/* Delete Confirmation Alert if triggered */}
          {deleteConfirm && (
            <div className="p-4 bg-red-50 border-b border-red-200 text-xs text-red-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Are you sure you want to permanently delete this resource from Firestore?</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-2.5 py-1 bg-white border border-red-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 flex items-center gap-1.5"
                >
                  {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          )}

          {deleteError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs border-b border-red-200">
              {deleteError}
            </div>
          )}

          {/* Modal Scrollable Body */}
          <div className="p-6 overflow-y-auto space-y-6 text-slate-700 text-sm">
            {/* Description */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">About This Resource</h4>
              <p className="text-slate-700 leading-relaxed text-sm whitespace-pre-line">
                {asset.description}
              </p>
            </div>

            {/* Location & Quick Contact Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Address & Coordinates</span>
                </div>
                <div className="font-medium text-slate-800 text-xs">
                  {asset.address}
                  {asset.landmark && <span className="block text-slate-500">Landmark: {asset.landmark}</span>}
                  <span className="block text-slate-500">{asset.city || 'Narsapur'}, {asset.state || 'Andhra Pradesh'} {asset.postalCode || ''}</span>
                  <span className="block text-[11px] text-slate-400 mt-0.5 font-mono">
                    {asset.latitude.toFixed(5)}, {asset.longitude.toFixed(5)}
                  </span>
                </div>
              </div>

              {(asset.operatingHours || asset.openingHours) && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Operating Timings</span>
                  </div>
                  <div className="font-medium text-slate-800 text-xs">
                    {asset.operatingHours || asset.openingHours}
                  </div>
                </div>
              )}

              {(asset.contactNumber || asset.phone) && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Official Contact</span>
                  </div>
                  <a 
                    href={`tel:${asset.contactNumber || asset.phone}`} 
                    className="font-semibold text-emerald-700 hover:underline text-xs block"
                  >
                    {asset.contactNumber || asset.phone}
                  </a>
                </div>
              )}

              {asset.website && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Portal / Website</span>
                  </div>
                  <a 
                    href={asset.website} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="font-semibold text-emerald-700 hover:underline text-xs block truncate"
                  >
                    {asset.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>

            {/* Accessibility Features */}
            {asset.accessibility && asset.accessibility.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Accessibility className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Accessibility Provisions</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {asset.accessibility.map((feat, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>{feat}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Amenities & Facilities */}
            {asset.facilities && asset.facilities.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Available Amenities
                </h4>
                <div className="flex flex-wrap gap-2">
                  {asset.facilities.map((fac, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg"
                    >
                      • {fac}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Verification Transparency Block */}
            <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl p-3.5 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-semibold text-slate-900">
                  Civic Verification Record
                </div>
                <p className="text-slate-600">
                  {asset.verificationNotes || 'Information validated by regional civic moderators according to open public standards.'}
                </p>
                {asset.verifiedAt && (
                  <div className="text-[11px] text-slate-500">
                    Verified on {new Date(asset.verifiedAt).toLocaleDateString()} {asset.verifiedBy ? `by ${asset.verifiedBy}` : ''}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Bottom Actions */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                id="report-issue-btn"
                type="button"
                onClick={() => {
                  onClose();
                  onReport(asset);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors font-medium px-2 py-1"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Report Issue</span>
              </button>

              {/* Edit & Delete if authorized */}
              {canEditOrDelete && (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(true)}
                    className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-semibold px-2 py-1 rounded-md hover:bg-emerald-50 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(true)}
                    className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                id="directions-modal-btn"
                type="button"
                onClick={handleDirections}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-4 py-2 rounded-xl inline-flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Get Directions</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditAssetModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          asset={asset}
          onUpdated={() => {
            setShowEditModal(false);
            onClose();
          }}
        />
      )}
    </>
  );
};
