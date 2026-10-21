import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle, Archive, ShieldAlert } from 'lucide-react';
import { VerificationStatus } from '../../types';

interface StatusBadgeProps {
  status: VerificationStatus;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  className = '', 
  showIcon = true,
  size = 'md'
}) => {
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-[11px] gap-1' 
    : 'px-2.5 py-0.5 text-xs gap-1.5';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  switch (status) {
    case 'verified':
      return (
        <span className={`inline-flex items-center font-semibold bg-emerald-50/90 text-emerald-800 border border-emerald-200/80 rounded-md whitespace-nowrap ${sizeClasses} ${className}`}>
          {showIcon && <CheckCircle2 className={`${iconSize} text-emerald-600 shrink-0`} />}
          <span className="leading-none">Verified</span>
        </span>
      );
    case 'pending':
      return (
        <span className={`inline-flex items-center font-medium bg-amber-50/90 text-amber-800 border border-amber-200/80 rounded-md whitespace-nowrap ${sizeClasses} ${className}`}>
          {showIcon && <Clock className={`${iconSize} text-amber-600 shrink-0`} />}
          <span className="leading-none">Pending Review</span>
        </span>
      );
    case 'under_review':
      return (
        <span className={`inline-flex items-center font-medium bg-blue-50/90 text-blue-800 border border-blue-200/80 rounded-md whitespace-nowrap ${sizeClasses} ${className}`}>
          {showIcon && <ShieldAlert className={`${iconSize} text-blue-600 shrink-0`} />}
          <span className="leading-none">Under Review</span>
        </span>
      );
    case 'needs_correction':
      return (
        <span className={`inline-flex items-center font-medium bg-orange-50/90 text-orange-800 border border-orange-200/80 rounded-md whitespace-nowrap ${sizeClasses} ${className}`}>
          {showIcon && <AlertTriangle className={`${iconSize} text-orange-600 shrink-0`} />}
          <span className="leading-none">Needs Correction</span>
        </span>
      );
    case 'rejected':
      return (
        <span className={`inline-flex items-center font-medium bg-rose-50/90 text-rose-800 border border-rose-200/80 rounded-md whitespace-nowrap ${sizeClasses} ${className}`}>
          {showIcon && <XCircle className={`${iconSize} text-rose-600 shrink-0`} />}
          <span className="leading-none">Rejected</span>
        </span>
      );
    case 'archived':
      return (
        <span className={`inline-flex items-center font-medium bg-slate-100 text-slate-700 border border-slate-200 rounded-md whitespace-nowrap ${sizeClasses} ${className}`}>
          {showIcon && <Archive className={`${iconSize} text-slate-500 shrink-0`} />}
          <span className="leading-none">Archived</span>
        </span>
      );
    default:
      return null;
  }
};
