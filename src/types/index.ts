export type UserRole = 'user' | 'member' | 'verified_contributor' | 'moderator' | 'admin' | 'guest';

export interface UserProfile {
  uid: string;
  name?: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: UserRole;
  accountStatus: 'active' | 'suspended';
  bio?: string;
  locality?: string;
  createdAt: string;
  updatedAt: string;
  submissionsCount?: number;
  approvedCount?: number;
}

export type VerificationStatus = 
  | 'pending'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'needs_correction'
  | 'archived';

export interface CommunityAsset {
  id: string;
  name: string;
  normalizedName?: string;
  category?: string;
  categoryId: string;
  subcategory?: string;
  description: string;
  address: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  geohash?: string;
  phone?: string;
  contactNumber?: string;
  email?: string;
  website?: string;
  openingHours?: string;
  operatingHours?: string;
  accessibility: string[];
  facilities: string[];
  images?: string[];
  imageUrls: string[];
  status?: string;
  verified?: boolean;
  createdBy?: string;
  submittedBy: string;
  submittedByName?: string;
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
  // Computed client-side:
  distanceKm?: number;
}

export interface AssetCategory {
  id: string;
  name: string;
  description: string;
  iconName: string;
  color: string;
  bgLight: string;
  active: boolean;
}

export interface CommunityNeed {
  id: string;
  title: string;
  category?: string;
  categoryId: string;
  description: string;
  latitude: number;
  longitude: number;
  locality: string;
  address?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  createdBy?: string;
  submittedBy: string;
  submittedByName?: string;
  status: 'submitted' | 'under_review' | 'acknowledged' | 'in_progress' | 'addressed' | 'closed';
  upvotes: number;
  upvotedBy?: string[];
  createdAt: string;
  updatedAt: string;
  distanceKm?: number;
}

export interface AssetReport {
  id: string;
  assetId: string;
  assetName?: string;
  reportedBy: string;
  reportedByName?: string;
  reason: string;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  resolutionNotes?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface UserFavorite {
  id?: string;
  userId: string;
  assetId: string;
  createdAt: string;
}

export interface InAppNotification {
  id: string;
  userId: string;
  type: 'submission_received' | 'asset_approved' | 'asset_rejected' | 'correction_needed' | 'report_resolved' | 'need_updated';
  title: string;
  message: string;
  relatedEntityId?: string;
  readAt?: string;
  createdAt: string;
}

export interface ModerationLog {
  id: string;
  moderatorId: string;
  moderatorName: string;
  action: string;
  entityType: 'asset' | 'report' | 'communityNeed' | 'user';
  entityId: string;
  reason?: string;
  createdAt: string;
}
