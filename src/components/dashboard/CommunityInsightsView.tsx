import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { CommunityAsset, CommunityNeed } from '../../types';
import { ASSET_CATEGORIES } from '../../constants/categories';
import { ShieldCheck, Layers, MapPin, Users, HeartHandshake, CheckCircle2 } from 'lucide-react';

interface CommunityInsightsProps {
  assets: CommunityAsset[];
  needs: CommunityNeed[];
}

export const CommunityInsightsView: React.FC<CommunityInsightsProps> = ({ assets, needs }) => {
  // Aggregate data dynamically from real database records
  const totalVerified = assets.filter(a => a.verificationStatus === 'verified').length;
  const totalPending = assets.filter(a => a.verificationStatus === 'pending').length;
  const totalAccessible = assets.filter(a => a.accessibility && a.accessibility.length > 0).length;

  // Category distribution
  const categoryData = ASSET_CATEGORIES.map(cat => {
    const count = assets.filter(a => a.categoryId === cat.id).length;
    return {
      name: cat.name.split(' ')[0], // short name
      fullName: cat.name,
      count,
      color: cat.color
    };
  }).filter(c => c.count > 0);

  // Status breakdown
  const statusData = [
    { name: 'Verified', value: totalVerified, color: '#059669' },
    { name: 'Pending Review', value: totalPending, color: '#d97706' },
    { name: 'Under Review / Other', value: Math.max(0, assets.length - totalVerified - totalPending), color: '#6366f1' }
  ].filter(s => s.value > 0);

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Civic Assets</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{assets.length}</div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">Real database records</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Verified Facilities</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{totalVerified}</div>
          <div className="text-[11px] text-slate-500 mt-1">{assets.length > 0 ? `${Math.round((totalVerified / assets.length) * 100)}% verified` : '0%'}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Accessible Resources</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalAccessible}</div>
          <div className="text-[11px] text-slate-500 mt-1">Wheelchair / step-free</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Community Needs</span>
            <HeartHandshake className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600">{needs.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Reported resource gaps</div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category distribution bar chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Civic Resources by Category
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Distribution of mapped public facilities in the database
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" angle={-25} textAnchor="end" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: any, name: any, item: any) => [value, item.payload.fullName]}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Verification Status Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Verification Quality Breakdown
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Moderation states of currently registered community facilities
          </p>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs mt-2">
            {statusData.map((s, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}></span>
                <span className="text-slate-600 font-medium">{s.name}: {s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Indicative Gap Analysis Disclaimer */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed">
        <strong className="text-slate-800">Methodology Note on Resource Gap Analysis:</strong> Civic metrics and density figures are calculated directly from active records submitted to this platform. Gaps in data may reflect unmapped assets rather than an actual absence of civic services. Local citizens and NGOs are actively encouraged to contribute new entries.
      </div>
    </div>
  );
};
