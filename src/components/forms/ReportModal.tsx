import React, { useState } from 'react';
import { Flag, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { CommunityAsset } from '../../types';
import { submitReport } from '../../services/assetService';
import { useAuth } from '../../context/AuthContext';

interface ReportModalProps {
  asset: CommunityAsset | null;
  onClose: () => void;
  onSuccess: () => void;
}

const REPORT_REASONS = [
  'Permanently Closed / Non-existent',
  'Incorrect Geographic Location / Wrong Marker',
  'Incorrect Contact Number or Website',
  'Inaccurate Accessibility Claims',
  'Operating Hours Changed',
  'Duplicate Entry',
  'Safety or Hygiene Hazard'
];

export const ReportModal: React.FC<ReportModalProps> = ({ asset, onClose, onSuccess }) => {
  const { currentUser, userProfile } = useAuth();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!asset) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    if (!currentUser) {
      alert('You must be signed in to file an inaccuracy report. Please sign in to authenticate your submission.');
      return;
    }

    setSubmitting(true);
    try {
      const reporterId = currentUser.uid;
      const reporterName = userProfile?.displayName || currentUser?.displayName || 'Concerned Citizen';
      await submitReport(asset.id, asset.name, reason, description.trim(), reporterId, reporterName);
      setSubmitted(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Report submission failed:', err);
      alert('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        id="report-modal"
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-bold text-slate-900">Report Inaccuracy</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900">Report Submitted</h4>
            <p className="text-xs text-slate-500">
              Thank you for keeping civic data accurate. Our moderators will review this notice.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-slate-700">
            <div>
              <label className="block font-medium text-slate-500 mb-1">Target Facility</label>
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800">
                {asset.name}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reason for Report</label>
              <select
                id="select-report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-xs"
              >
                {REPORT_REASONS.map((r, i) => (
                  <option key={i} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Correction Details / Evidence <span className="text-red-500">*</span>
              </label>
              <textarea
                id="input-report-desc"
                required
                rows={3}
                placeholder="Explain what is incorrect or what the updated status is..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-600"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 font-medium text-slate-600 hover:text-slate-800 text-xs"
              >
                Cancel
              </button>
              <button
                id="submit-report-btn"
                type="submit"
                disabled={submitting}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-xs"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
