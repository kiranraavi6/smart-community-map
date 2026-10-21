import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Flag,
  UserCheck,
  Search,
  ExternalLink,
  History,
  Lock,
  UserCog
} from 'lucide-react';
import { CommunityAsset, AssetReport, VerificationStatus, UserRole, ModerationLog, UserProfile } from '../../types';
import { moderateAsset, resolveReport } from '../../services/assetService';
import { subscribeToAuditLogs, fetchUsersForAdmin, updateUserRoleByAdmin } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { CategoryBadge } from '../common/CategoryBadge';
import { StatusBadge } from '../common/StatusBadge';

interface AdminDashboardProps {
  assets: CommunityAsset[];
  reports: AssetReport[];
  onSelectAsset: (asset: CommunityAsset) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  assets,
  reports,
  onSelectAsset
}) => {
  const { userProfile, role, isAdmin, isModerator } = useAuth();
  const [activeTab, setActiveTab] = useState<'moderation' | 'reports' | 'logs' | 'users'>('moderation');
  const [modNotes, setModNotes] = useState<Record<string, string>>({});
  const [reportNotes, setReportNotes] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Audit logs and User Management
  const [auditLogs, setAuditLogs] = useState<ModerationLog[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);

  // Submissions requiring review
  const pendingAssets = assets.filter(
    a => a.verificationStatus === 'pending' || a.verificationStatus === 'under_review' || a.verificationStatus === 'needs_correction'
  );

  const pendingReports = reports.filter(r => r.status === 'pending');

  // Load audit logs in real-time if moderator/admin
  useEffect(() => {
    if (isModerator) {
      const unsub = subscribeToAuditLogs((logs) => {
        setAuditLogs(logs);
      });
      return () => unsub();
    }
  }, [isModerator]);

  // Load registered users if on 'users' tab and user is admin
  useEffect(() => {
    if (activeTab === 'users' && isAdmin) {
      setLoadingUsers(true);
      fetchUsersForAdmin()
        .then(users => setUsersList(users))
        .catch(err => console.warn('User list load notice:', err))
        .finally(() => setLoadingUsers(false));
    }
  }, [activeTab, isAdmin]);

  const handleModerate = async (assetId: string, status: VerificationStatus) => {
    if (!isModerator) {
      alert('Access Denied: Only verified Regional Moderators or Civic Admins can approve or reject civic assets.');
      return;
    }

    setProcessingId(assetId);
    try {
      const notes = modNotes[assetId] || (status === 'verified' ? 'Approved by moderator' : 'Rejected after moderation inspection');
      const modId = userProfile?.uid || 'moderator';
      const modName = userProfile?.displayName || 'Lead Moderator';
      await moderateAsset(assetId, status, notes, modId, modName);
      alert(`Asset status updated to: ${status}. Audit log entry recorded.`);
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleResolveReport = async (reportId: string) => {
    if (!isModerator) {
      alert('Access Denied: Only verified Regional Moderators or Civic Admins can resolve reports.');
      return;
    }

    setProcessingId(reportId);
    try {
      const notes = reportNotes[reportId] || 'Issue inspected and resolved.';
      const modId = userProfile?.uid || 'moderator';
      const modName = userProfile?.displayName || 'Lead Moderator';
      await resolveReport(reportId, notes, modId, modName);
      alert('Report marked as resolved. Audit log entry recorded.');
    } catch (err: any) {
      alert('Error resolving report: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRoleChange = async (targetUser: UserProfile, newRole: UserRole) => {
    if (!isAdmin) {
      alert('Access Denied: Only Civic Administrators can assign user roles.');
      return;
    }

    setRoleUpdatingId(targetUser.uid);
    try {
      const adminId = userProfile?.uid || 'admin';
      const adminName = userProfile?.displayName || 'Civic Administrator';
      await updateUserRoleByAdmin(targetUser.uid, newRole, adminId, adminName);
      setUsersList(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, role: newRole } : u));
      alert(`Role successfully changed to ${newRole} for ${targetUser.displayName}.`);
    } catch (err: any) {
      alert('Failed to update role: ' + err.message);
    } finally {
      setRoleUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Top Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold">Civic Moderation & Security Control Center</h2>
            <span className="text-[11px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded uppercase">
              Authenticated Role: {role}
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-xl">
            Protected moderation workflow with strict role enforcement, immutable audit logging, ownership checks, and privilege boundaries.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Server Rules Active</span>
          </div>
        </div>
      </div>

      {/* Access Gate Warning for Non-Privileged Visitors */}
      {!isModerator && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Restricted Civic Control Center</div>
            <p className="text-amber-700 mt-0.5">
              You are currently authenticated as a standard citizen ({role}). Sensitive operations such as approving asset submissions, resolving citizen reports, inspecting audit logs, and altering user roles are strictly protected by Firestore security rules.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('moderation')}
          className={`pb-3 px-3 transition-colors border-b-2 shrink-0 ${
            activeTab === 'moderation'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Asset Moderation Queue ({pendingAssets.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 px-3 transition-colors border-b-2 shrink-0 ${
            activeTab === 'reports'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Inaccuracy Reports ({pendingReports.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 px-3 transition-colors border-b-2 shrink-0 flex items-center gap-1.5 ${
            activeTab === 'logs'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Audit Log Trail ({auditLogs.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-3 transition-colors border-b-2 shrink-0 flex items-center gap-1.5 ${
            activeTab === 'users'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCog className="w-3.5 h-3.5" />
          <span>Role Administration</span>
        </button>
      </div>

      {/* Tab 1: Moderation Queue */}
      {activeTab === 'moderation' && (
        <div className="space-y-4">
          {pendingAssets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-800">Moderation Queue is Clear</div>
              <div className="text-xs text-slate-500 mt-1">All submitted civic facilities have been reviewed.</div>
            </div>
          ) : (
            pendingAssets.map((asset) => (
              <div
                key={asset.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CategoryBadge categoryId={asset.categoryId} />
                      <StatusBadge status={asset.verificationStatus} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{asset.name}</h3>
                    <p className="text-xs text-slate-500">
                      Submitted by: <strong className="text-slate-700">{asset.submittedByName || 'Citizen'}</strong> (UID: <span className="font-mono">{asset.submittedBy.substring(0, 8)}...</span>) on {new Date(asset.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <button
                    onClick={() => onSelectAsset(asset)}
                    className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold hover:underline"
                  >
                    <span>View Location & Details</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 space-y-1">
                  <div><strong>Address:</strong> {asset.address}, {asset.city} ({asset.latitude.toFixed(5)}, {asset.longitude.toFixed(5)})</div>
                  <div><strong>Description:</strong> {asset.description}</div>
                  {asset.contactNumber && <div><strong>Phone:</strong> {asset.contactNumber}</div>}
                  {asset.accessibility?.length > 0 && (
                    <div><strong>Accessibility:</strong> {asset.accessibility.join(', ')}</div>
                  )}
                  {asset.imageUrls?.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <strong>Images ({asset.imageUrls.length}):</strong>
                      {asset.imageUrls.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noreferrer" className="text-emerald-700 underline truncate max-w-[200px]">
                          Photo {idx + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Moderation Actions & Notes */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <input
                    type="text"
                    placeholder="Moderator verification note / audit reason..."
                    value={modNotes[asset.id] || ''}
                    onChange={(e) => setModNotes({ ...modNotes, [asset.id]: e.target.value })}
                    className="text-xs border border-slate-300 rounded-lg p-2 flex-1 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleModerate(asset.id, 'needs_correction')}
                      disabled={processingId === asset.id || !isModerator}
                      className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 rounded-lg border border-amber-200 transition-colors"
                    >
                      Request Correction
                    </button>
                    <button
                      onClick={() => handleModerate(asset.id, 'rejected')}
                      disabled={processingId === asset.id || !isModerator}
                      className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 rounded-lg border border-red-200 transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleModerate(asset.id, 'verified')}
                      disabled={processingId === asset.id || !isModerator}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve & Verify</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-800">No reports found.</div>
              <div className="text-xs text-slate-500 mt-1">Resource data is actively validated and no flags are pending.</div>
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full uppercase">
                      {report.reason}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1.5">
                      Target: {report.assetName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Reported by {report.reportedByName} on {new Date(report.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    report.status === 'resolved' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {report.status}
                  </span>
                </div>

                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  {report.description}
                </p>

                {report.status === 'pending' && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Resolution notes..."
                      value={reportNotes[report.id] || ''}
                      onChange={(e) => setReportNotes({ ...reportNotes, [report.id]: e.target.value })}
                      className="text-xs border border-slate-300 rounded-lg p-2 flex-1"
                    />
                    <button
                      onClick={() => handleResolveReport(report.id)}
                      disabled={processingId === report.id || !isModerator}
                      className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg"
                    >
                      Mark Resolved
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Immutable Moderation Audit Log */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" />
                <span>Immutable Moderation Audit Log</span>
              </h3>
              <p className="text-xs text-slate-500">
                Protected audit trail in <span className="font-mono font-semibold">moderationLogs</span>. Updates and deletions are permanently prohibited by security rules.
              </p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-mono">
              {auditLogs.length} Events Logged
            </span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No audit log entries recorded yet in current session. Moderation events will appear here in real-time.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] uppercase">
                        {log.action}
                      </span>
                      <span>Target: {log.entityType} ({log.entityId.substring(0, 16)})</span>
                    </div>
                    {log.reason && (
                      <p className="text-slate-600 mt-1 italic">"{log.reason}"</p>
                    )}
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Moderator: <strong className="text-slate-600">{log.moderatorName}</strong> (UID: <span className="font-mono">{log.moderatorId.substring(0, 8)}...</span>)
                    </div>
                  </div>
                  <div className="text-slate-400 text-[11px] shrink-0 font-mono">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Role Administration & Access Control */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs text-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserCog className="w-4 h-4 text-emerald-600" />
                <span>Civic Role Administration</span>
              </h3>
              <p className="text-slate-500">
                Manage roles with strict server-side validation. Privileged roles can only be granted by verified Administrators.
              </p>
            </div>
          </div>

          {loadingUsers ? (
            <div className="py-8 text-center text-slate-400">Loading registered users...</div>
          ) : usersList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-3">User</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Current Role</th>
                    <th className="py-2.5 px-3">Assign Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersList.map((user) => (
                    <tr key={user.uid} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {user.displayName || 'Citizen'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {user.email || 'N/A'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : user.role === 'moderator'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {isAdmin ? (
                          <select
                            disabled={roleUpdatingId === user.uid}
                            value={user.role}
                            onChange={(e) => handleRoleChange(user, e.target.value as UserRole)}
                            className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="member">Member</option>
                            <option value="verified_contributor">Verified Contributor</option>
                            <option value="moderator">Regional Moderator</option>
                            <option value="admin">Civic Administrator</option>
                          </select>
                        ) : (
                          <span className="text-slate-400 italic">Admin Only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-4 text-slate-500 text-xs">
              No registered user records retrieved or you are signed in as guest. Users populate automatically upon Google sign-in.
            </div>
          )}

          {/* Guidelines */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>Registered Member</span>
              </div>
              <p className="text-slate-500">Can submit assets to pending queue, file inaccuracy reports, save personal favorites, and upvote needs.</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Regional Moderator</span>
              </div>
              <p className="text-slate-500">Can review moderation queue, verify or reject facilities, resolve citizen reports, and view audit trail.</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                <span>Civic Administrator</span>
              </div>
              <p className="text-slate-500">Full control over asset records, system configuration, audit logs, and user role assignments.</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>Audit & Security Rules</span>
              </div>
              <p className="text-slate-500">All administrative operations write immutable records to the audit log. Client role self-escalation is blocked.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
