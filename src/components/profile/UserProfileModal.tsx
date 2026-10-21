import React, { useState } from 'react';
import { 
  User, 
  ShieldCheck, 
  MapPin, 
  Mail, 
  Calendar, 
  Award, 
  CheckCircle2, 
  Layers, 
  Heart,
  LogOut,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CommunityAsset } from '../../types';
import { AssetCard } from '../assets/AssetCard';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAssets: CommunityAsset[];
  savedAssets: CommunityAsset[];
  onSelectAsset: (asset: CommunityAsset) => void;
  onViewAllSaved?: () => void;
  onOpenAuthModal?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userAssets,
  savedAssets,
  onSelectAsset,
  onOpenAuthModal
}) => {
  const { currentUser, userProfile, role, signOut, signInDemoRole, signInWithGoogle } = useAuth();
  const [activeTab, setActiveTab] = useState<'contributions' | 'saved'>('contributions');

  if (!isOpen) return null;

  const approvedCount = userAssets.filter(a => a.verificationStatus === 'verified').length;
  const pendingCount = userAssets.filter(a => a.verificationStatus === 'pending').length;

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      alert('Google authentication error: ' + (err.message || 'Please check popup settings.'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        id="user-profile-modal"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
      >
        {/* Banner */}
        <div className="p-6 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-lg"
          >
            ✕
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white text-emerald-800 font-bold text-2xl flex items-center justify-center shadow-lg border-2 border-emerald-400">
              {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">{userProfile?.displayName || 'Active Citizen'}</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  {role.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">{currentUser?.email || 'citizen@communitymap.org'}</p>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-300 mt-1">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span>{userProfile?.locality || 'Vijayawada, Andhra Pradesh'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contribution Metrics */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50 text-center py-3 text-xs">
          <div>
            <div className="font-bold text-slate-900 text-base">{userAssets.length}</div>
            <div className="text-slate-500 text-[11px]">Total Submitted</div>
          </div>
          <div>
            <div className="font-bold text-emerald-700 text-base">{approvedCount}</div>
            <div className="text-slate-500 text-[11px]">Verified Assets</div>
          </div>
          <div>
            <div className="font-bold text-amber-700 text-base">{pendingCount}</div>
            <div className="text-slate-500 text-[11px]">Under Review</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('contributions')}
            className={`py-3 px-2 border-b-2 transition-colors ${
              activeTab === 'contributions'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            My Contributions ({userAssets.length})
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`py-3 px-2 border-b-2 transition-colors ${
              activeTab === 'saved'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Saved Favorites ({savedAssets.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3 text-xs">
          {activeTab === 'contributions' && (
            userAssets.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-1">
                <Layers className="w-8 h-8 mx-auto text-slate-300" />
                <div className="font-medium text-slate-600">No assets submitted yet</div>
                <p className="text-[11px]">Click "Add Resource" on the map to contribute your first facility.</p>
              </div>
            ) : (
              userAssets.map(asset => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onSelect={(a) => {
                    onSelectAsset(a);
                    onClose();
                  }}
                />
              ))
            )
          )}

          {activeTab === 'saved' && (
            savedAssets.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-1">
                <Heart className="w-8 h-8 mx-auto text-slate-300" />
                <div className="font-medium text-slate-600">You haven't favorited any assets yet.</div>
                <p className="text-[11px]">Click the heart icon on any civic resource card to save it for quick access.</p>
              </div>
            ) : (
              savedAssets.map(asset => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  isFavorited={true}
                  onSelect={(a) => {
                    onSelectAsset(a);
                    onClose();
                  }}
                />
              ))
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          {currentUser ? (
            <button
              onClick={() => {
                signOut();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 text-xs text-red-600 font-semibold hover:text-red-700"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out Session</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenAuthModal?.();
                }}
                className="inline-flex items-center gap-1.5 text-xs text-white bg-emerald-700 hover:bg-emerald-800 font-semibold px-3.5 py-1.5 rounded-lg shadow-xs transition-colors"
              >
                <span>Sign In / Register</span>
              </button>
              <button
                onClick={handleGoogleSignIn}
                className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 font-semibold px-3 py-1.5 rounded-lg shadow-xs transition-colors"
              >
                <span>Google</span>
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
