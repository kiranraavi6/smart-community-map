import React, { useState } from 'react';
import { 
  AlertCircle, 
  ThumbsUp, 
  Plus, 
  MapPin, 
  Clock, 
  Filter,
  CheckCircle2,
  Trash2,
  Loader2
} from 'lucide-react';
import { CommunityNeed } from '../../types';
import { ASSET_CATEGORIES, DEFAULT_MAP_CENTER } from '../../constants/categories';
import { CategoryBadge } from '../common/CategoryBadge';
import { createNeed, toggleUpvoteNeed, deleteNeed, updateNeedStatus } from '../../services/needService';
import { useAuth } from '../../context/AuthContext';

interface CommunityNeedsViewProps {
  needs: CommunityNeed[];
  onFocusNeedOnMap?: (need: CommunityNeed) => void;
}

export const CommunityNeedsView: React.FC<CommunityNeedsViewProps> = ({
  needs,
  onFocusNeedOnMap
}) => {
  const { currentUser, userProfile, isModerator, isAdmin } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterCat, setFilterCat] = useState('all');

  // Form states
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('water_sanitation');
  const [locality, setLocality] = useState('Narsapur');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState(DEFAULT_MAP_CENTER.lat.toString());
  const [longitude, setLongitude] = useState(DEFAULT_MAP_CENTER.lng.toString());
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredNeeds = filterCat === 'all' 
    ? needs 
    : needs.filter(n => n.categoryId === filterCat || n.category === filterCat);

  const handleUpvote = async (needId: string) => {
    if (!currentUser) {
      alert('Please sign in to upvote and prioritize community needs.');
      return;
    }
    try {
      await toggleUpvoteNeed(needId, currentUser.uid);
    } catch (err: any) {
      console.error('Failed to upvote need:', err);
    }
  };

  const handleDeleteNeed = async (needId: string) => {
    if (!confirm('Are you sure you want to remove this community need request?')) return;
    try {
      await deleteNeed(needId);
    } catch (err: any) {
      alert('Failed to delete need: ' + err.message);
    }
  };

  const handleCreateNeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim() || !locality.trim() || !description.trim()) {
      setErrorMsg('Title, locality, and description are required.');
      return;
    }

    if (!currentUser) {
      setErrorMsg('Please sign in to post a community resource gap report.');
      return;
    }

    setSubmitting(true);
    try {
      const submitterId = currentUser.uid;
      const submitterName = userProfile?.displayName || userProfile?.name || currentUser.displayName || 'Active Resident';

      await createNeed(
        {
          title: title.trim(),
          category: categoryId,
          locality: locality.trim(),
          address: locality.trim(),
          description: description.trim(),
          latitude: parseFloat(latitude) || DEFAULT_MAP_CENTER.lat,
          longitude: parseFloat(longitude) || DEFAULT_MAP_CENTER.lng,
          priority
        },
        submitterId,
        submitterName
      );

      setTitle('');
      setLocality('Narsapur');
      setDescription('');
      setShowAddForm(false);
    } catch (err: any) {
      console.error('Failed to submit need:', err);
      setErrorMsg(err.message || 'Failed to submit need report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            <h2 className="text-lg font-bold text-slate-900">Civic Resource Gap Mapping</h2>
          </div>
          <p className="text-xs text-slate-500">
            Citizens identify missing public amenities: primary clinics, water filtration plants, schools, or street lighting.
          </p>
        </div>

        <button
          id="btn-report-community-need"
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Report Needed Resource</span>
        </button>
      </div>

      {/* Submission Form Drawer */}
      {showAddForm && (
        <form onSubmit={handleCreateNeed} className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-sm space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Identify Neighborhood Resource Gap</h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Requirement Title</label>
              <input
                type="text"
                required
                placeholder="e.g. RO Drinking Water Kiosk Needed"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              >
                {ASSET_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Neighborhood / Locality</label>
              <input
                type="text"
                required
                placeholder="e.g. Ward 4, Near Bus Stand, Narsapur"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Urgency Level</label>
              <select
                value={priority}
                onChange={(e: any) => setPriority(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Description & Impact</label>
              <textarea
                rows={3}
                required
                placeholder="Explain why this resource is needed, how many households are affected, and what public action is requested..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white rounded-xl font-semibold flex items-center gap-1.5"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Submit to Firestore</span>
            </button>
          </div>
        </form>
      )}

      {/* Category Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setFilterCat('all')}
          className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 ${
            filterCat === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Needs ({needs.length})
        </button>
        {ASSET_CATEGORIES.map(c => {
          const count = needs.filter(n => n.categoryId === c.id || n.category === c.id).length;
          return (
            <button
              key={c.id}
              onClick={() => setFilterCat(c.id)}
              className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 ${
                filterCat === c.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {c.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Needs Listing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNeeds.map((need) => {
          const isCreator = !!currentUser && (currentUser.uid === need.createdBy || currentUser.uid === need.submittedBy);
          const canDelete = isCreator || isModerator || isAdmin;

          return (
            <div
              key={need.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <CategoryBadge categoryId={need.categoryId || need.category || 'other'} />
                    <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full uppercase">
                      {need.status ? need.status.replace('_', ' ') : 'Submitted'}
                    </span>
                  </div>
                  
                  {/* Upvote button */}
                  <div className="flex items-center gap-2">
                    <button
                      id={`upvote-btn-${need.id}`}
                      onClick={() => handleUpvote(need.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                        currentUser && need.upvotedBy?.includes(currentUser.uid)
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700'
                      }`}
                      title="Upvote to support this community requirement"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{need.upvotes || 0}</span>
                    </button>

                    {canDelete && (
                      <button
                        onClick={() => handleDeleteNeed(need.id)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded-md"
                        title="Delete this need"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug mb-1">
                  {need.title}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-3 mb-3 leading-relaxed">
                  {need.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1 truncate max-w-[200px]">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{need.locality || need.address || 'Narsapur'}</span>
                </div>

                {onFocusNeedOnMap && (
                  <button
                    onClick={() => onFocusNeedOnMap(need)}
                    className="text-emerald-700 hover:text-emerald-800 font-semibold"
                  >
                    View on Map
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredNeeds.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-700">No community needs submitted.</div>
            <div className="text-xs text-slate-400 mt-1">If your neighborhood is missing vital facilities, feel free to report one.</div>
          </div>
        )}
      </div>
    </div>
  );
};
