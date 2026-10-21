import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { CommunityAsset, VerificationStatus, AssetReport, CommunityNeed } from '../types';
import { calculateDistanceKm, encodeGeohash, stringSimilarity, normalizeString } from '../utils/geo';
import { validateAssetInput, validateNeedInput, validateReportInput } from '../utils/validation';
import { handleFirestoreError, OperationType } from './errorHandler';
import { deleteStorageImage } from './storageService';

// Forward re-exports for needs & reports to maintain backwards-compatible imports
export { submitCommunityNeed, upvoteCommunityNeed, subscribeToNeeds } from './needService';
export { submitAssetReport as submitReport, subscribeToReports, resolveAssetReport as resolveReport } from './reportService';

const ASSETS_COLLECTION = 'assets';
const NOTIFICATIONS_COLLECTION = 'notifications';
const LOGS_COLLECTION = 'moderationLogs';

/**
 * Filter helper to exclude Police Stations from the community resources dataset
 */
export function isPoliceStationAsset(asset: { name?: string; categoryId?: string; subcategory?: string }): boolean {
  const nameLower = (asset?.name || '').toLowerCase();
  const subLower = (asset?.subcategory || '').toLowerCase();
  return (
    nameLower.includes('police station') ||
    nameLower.includes('police dept') ||
    nameLower.includes('police department') ||
    nameLower.includes('disha women protection') ||
    subLower.includes('police')
  );
}

/**
 * Normalizes raw Firestore document data to a full CommunityAsset
 */
export function normalizeAssetDoc(id: string, data: any): CommunityAsset {
  const categoryId = data.categoryId || data.category || 'other';
  const category = data.category || data.categoryId || 'other';
  const imageUrls: string[] = Array.isArray(data.imageUrls) 
    ? data.imageUrls 
    : Array.isArray(data.images) 
      ? data.images 
      : [];
  const status: VerificationStatus = data.status || data.verificationStatus || 'pending';
  const verified = data.verified !== undefined ? Boolean(data.verified) : status === 'verified';
  const createdBy = data.createdBy || data.submittedBy || '';
  const submittedBy = data.submittedBy || data.createdBy || '';
  const operatingHours = data.operatingHours || data.openingHours || '';
  const openingHours = data.openingHours || data.operatingHours || '';
  const contactNumber = data.contactNumber || data.phone || '';
  const phone = data.phone || data.contactNumber || '';

  return {
    id,
    name: data.name || '',
    normalizedName: data.normalizedName || normalizeString(data.name || ''),
    category,
    categoryId,
    subcategory: data.subcategory || '',
    description: data.description || '',
    address: data.address || '',
    landmark: data.landmark || '',
    city: data.city || 'Narsapur',
    state: data.state || 'Andhra Pradesh',
    postalCode: data.postalCode || '',
    latitude: typeof data.latitude === 'number' ? data.latitude : 16.4344,
    longitude: typeof data.longitude === 'number' ? data.longitude : 81.6985,
    geohash: data.geohash || encodeGeohash(data.latitude || 16.4344, data.longitude || 81.6985),
    phone,
    contactNumber,
    email: data.email || '',
    website: data.website || '',
    openingHours,
    operatingHours,
    accessibility: Array.isArray(data.accessibility) ? data.accessibility : [],
    facilities: Array.isArray(data.facilities) ? data.facilities : [],
    images: imageUrls,
    imageUrls,
    status,
    verified,
    verificationStatus: status,
    verificationNotes: data.verificationNotes || '',
    verifiedAt: data.verifiedAt,
    verifiedBy: data.verifiedBy,
    createdBy,
    submittedBy,
    submittedByName: data.submittedByName || data.createdByName || 'Community Contributor',
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString()
  };
}

/**
 * Real-time listener for assets.
 * If user is not moderator, returns verified assets + assets submitted by user.
 */
export function subscribeToAssets(
  callback: (assets: CommunityAsset[]) => void,
  userUid?: string,
  isModerator: boolean = false
) {
  const assetsRef = collection(db, ASSETS_COLLECTION);
  
  // Moderators see all submissions
  if (isModerator) {
    const q = query(assetsRef, orderBy('createdAt', 'desc'), limit(300));
    return onSnapshot(q, (snapshot) => {
      const list: CommunityAsset[] = [];
      snapshot.forEach((d) => {
        const item = normalizeAssetDoc(d.id, d.data());
        if (!isPoliceStationAsset(item)) {
          list.push(item);
        }
      });
      callback(list);
    }, (error) => {
      console.warn('Firestore asset subscription notice:', error);
      callback([]);
    });
  }

  // Citizens see all verified assets plus their own submissions
  let verifiedAssets: CommunityAsset[] = [];
  let userAssets: CommunityAsset[] = [];

  const updateMerged = () => {
    const map = new Map<string, CommunityAsset>();
    verifiedAssets.forEach(a => {
      if (!isPoliceStationAsset(a)) map.set(a.id, a);
    });
    userAssets.forEach(a => {
      if (!isPoliceStationAsset(a)) map.set(a.id, a);
    });
    callback(Array.from(map.values()));
  };

  // Query verified assets
  const qVerified = query(
    assetsRef, 
    where('verificationStatus', '==', 'verified'),
    limit(300)
  );

  const unsubVerified = onSnapshot(qVerified, (snapshot) => {
    verifiedAssets = [];
    snapshot.forEach((d) => {
      const item = normalizeAssetDoc(d.id, d.data());
      if (!isPoliceStationAsset(item)) {
        verifiedAssets.push(item);
      }
    });
    updateMerged();
  }, (error) => {
    console.warn('Firestore verified asset subscription error:', error);
    // Fallback query if status index is compiling
    const qFallback = query(assetsRef, limit(100));
    onSnapshot(qFallback, (snap) => {
      const list: CommunityAsset[] = [];
      snap.forEach(d => {
        const item = normalizeAssetDoc(d.id, d.data());
        if ((item.verificationStatus === 'verified' || item.verified) && !isPoliceStationAsset(item)) {
          list.push(item);
        }
      });
      callback(list);
    }, () => callback([]));
  });

  let unsubUser: (() => void) | null = null;
  if (userUid) {
    const qUser = query(assetsRef, where('submittedBy', '==', userUid), limit(100));
    unsubUser = onSnapshot(qUser, (snapshot) => {
      userAssets = [];
      snapshot.forEach((d) => {
        const item = normalizeAssetDoc(d.id, d.data());
        if (!isPoliceStationAsset(item)) {
          userAssets.push(item);
        }
      });
      updateMerged();
    }, (error) => {
      console.warn('Firestore user asset subscription error:', error);
    });
  }

  return () => {
    unsubVerified();
    if (unsubUser) unsubUser();
  };
}

/**
 * Fetch asset by ID
 */
export async function getAssetById(id: string): Promise<CommunityAsset | null> {
  try {
    const ref = doc(db, ASSETS_COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return normalizeAssetDoc(snap.id, snap.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${ASSETS_COLLECTION}/${id}`);
  }
}

/**
 * Submit a new asset with duplicate checking, input validation, and geohash computation
 */
export async function submitAsset(
  assetData: Partial<CommunityAsset>,
  userId: string,
  userName: string
): Promise<{ id: string; duplicateWarning?: string }> {
  // Input validation
  const validation = validateAssetInput(assetData);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(' '));
  }

  const name = (assetData.name || '').trim();
  const latitude = Number(assetData.latitude);
  const longitude = Number(assetData.longitude);

  // Check for possible duplicates within 150 meters with similar names
  let potentialDuplicate: string | null = null;
  try {
    const existingSnap = await getDocs(query(collection(db, ASSETS_COLLECTION), limit(100)));
    existingSnap.forEach(d => {
      const existing = d.data();
      const dist = calculateDistanceKm(latitude, longitude, existing.latitude, existing.longitude);
      if (dist < 0.15) { // within 150m
        const sim = stringSimilarity(name, existing.name || '');
        if (sim > 0.6) {
          potentialDuplicate = `Potential duplicate detected: "${existing.name}" is located within 150m.`;
        }
      }
    });
  } catch (err) {
    console.warn('Duplicate checking query skipped:', err);
  }

  const geohash = encodeGeohash(latitude, longitude);
  const now = new Date().toISOString();
  const categoryId = assetData.categoryId || assetData.category || 'other';
  const images = assetData.images || assetData.imageUrls || [];

  // Schema matching required fields:
  // id, name, description, category, subcategory, latitude, longitude, address, phone, email, website, openingHours, images, status, verified, createdBy, createdAt, updatedAt
  const docData = {
    name,
    normalizedName: normalizeString(name),
    description: (assetData.description || '').trim(),
    category: categoryId,
    categoryId,
    subcategory: (assetData.subcategory || '').trim(),
    latitude,
    longitude,
    geohash,
    address: (assetData.address || '').trim(),
    landmark: (assetData.landmark || '').trim() || undefined,
    city: (assetData.city || 'Narsapur').trim(),
    state: (assetData.state || 'Andhra Pradesh').trim(),
    postalCode: (assetData.postalCode || '').trim() || undefined,
    phone: (assetData.phone || assetData.contactNumber || '').trim() || undefined,
    contactNumber: (assetData.contactNumber || assetData.phone || '').trim() || undefined,
    email: (assetData.email || '').trim() || undefined,
    website: (assetData.website || '').trim() || undefined,
    openingHours: (assetData.openingHours || assetData.operatingHours || '').trim() || undefined,
    operatingHours: (assetData.operatingHours || assetData.openingHours || '').trim() || undefined,
    accessibility: assetData.accessibility || [],
    facilities: assetData.facilities || [],
    images,
    imageUrls: images,
    status: 'pending',
    verificationStatus: 'pending' as VerificationStatus,
    verified: false,
    createdBy: userId,
    submittedBy: userId,
    submittedByName: userName,
    createdAt: now,
    updatedAt: now
  };

  try {
    const docRef = await addDoc(collection(db, ASSETS_COLLECTION), docData);

    // Create in-app notification for contributor
    await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      userId,
      type: 'submission_received',
      title: 'Asset Submission Received',
      message: `Thank you for contributing "${name}". Our regional civic moderation team is reviewing the verification details.`,
      relatedEntityId: docRef.id,
      createdAt: now
    }).catch(err => console.warn('Could not dispatch notification:', err));

    return { id: docRef.id, duplicateWarning: potentialDuplicate || undefined };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, ASSETS_COLLECTION);
  }
}

/**
 * Update an existing asset in Firestore (authorized creator or moderator/admin)
 */
export async function updateAsset(
  assetId: string,
  updatedData: Partial<CommunityAsset>,
  userId: string
): Promise<void> {
  const assetRef = doc(db, ASSETS_COLLECTION, assetId);
  const now = new Date().toISOString();

  const payload: any = {
    updatedAt: now
  };

  if (updatedData.name !== undefined) {
    payload.name = updatedData.name.trim();
    payload.normalizedName = normalizeString(updatedData.name);
  }
  if (updatedData.description !== undefined) payload.description = updatedData.description.trim();
  if (updatedData.address !== undefined) payload.address = updatedData.address.trim();
  if (updatedData.landmark !== undefined) payload.landmark = updatedData.landmark.trim();
  if (updatedData.city !== undefined) payload.city = updatedData.city.trim();
  if (updatedData.state !== undefined) payload.state = updatedData.state.trim();
  if (updatedData.postalCode !== undefined) payload.postalCode = updatedData.postalCode.trim();

  if (updatedData.latitude !== undefined && updatedData.longitude !== undefined) {
    payload.latitude = Number(updatedData.latitude);
    payload.longitude = Number(updatedData.longitude);
    payload.geohash = encodeGeohash(Number(updatedData.latitude), Number(updatedData.longitude));
  }

  const cat = updatedData.categoryId || updatedData.category;
  if (cat !== undefined) {
    payload.categoryId = cat;
    payload.category = cat;
  }
  if (updatedData.subcategory !== undefined) payload.subcategory = updatedData.subcategory.trim();

  const ph = updatedData.phone || updatedData.contactNumber;
  if (ph !== undefined) {
    payload.phone = ph.trim();
    payload.contactNumber = ph.trim();
  }
  if (updatedData.email !== undefined) payload.email = updatedData.email.trim();
  if (updatedData.website !== undefined) payload.website = updatedData.website.trim();

  const hours = updatedData.openingHours || updatedData.operatingHours;
  if (hours !== undefined) {
    payload.openingHours = hours.trim();
    payload.operatingHours = hours.trim();
  }

  const imgs = updatedData.images || updatedData.imageUrls;
  if (imgs !== undefined) {
    payload.images = imgs;
    payload.imageUrls = imgs;
  }

  if (updatedData.accessibility !== undefined) payload.accessibility = updatedData.accessibility;
  if (updatedData.facilities !== undefined) payload.facilities = updatedData.facilities;

  try {
    await updateDoc(assetRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ASSETS_COLLECTION}/${assetId}`);
  }
}

/**
 * Delete an asset from Firestore and clean up any Firebase Storage images
 */
export async function deleteAsset(assetId: string): Promise<void> {
  const assetRef = doc(db, ASSETS_COLLECTION, assetId);
  try {
    const snap = await getDoc(assetRef);
    if (snap.exists()) {
      const data = snap.data();
      const images: string[] = data.images || data.imageUrls || [];
      for (const img of images) {
        await deleteStorageImage(img).catch(() => {});
      }
    }
    await deleteDoc(assetRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${ASSETS_COLLECTION}/${assetId}`);
  }
}

/**
 * Moderator action: Approve, Reject, or Request Correction with Audit Logging
 */
export async function moderateAsset(
  assetId: string,
  newStatus: VerificationStatus,
  notes: string,
  moderatorId: string,
  moderatorName: string
): Promise<void> {
  const assetRef = doc(db, ASSETS_COLLECTION, assetId);
  const snap = await getDoc(assetRef);
  if (!snap.exists()) throw new Error('Asset not found');

  const asset = snap.data();
  const now = new Date().toISOString();
  const isVerified = newStatus === 'verified';

  try {
    await updateDoc(assetRef, {
      status: newStatus,
      verificationStatus: newStatus,
      verified: isVerified,
      verificationNotes: notes || '',
      verifiedAt: isVerified ? now : null,
      verifiedBy: isVerified ? moderatorName : null,
      updatedAt: now
    });

    // Write to immutable audit log (moderationLogs)
    await addDoc(collection(db, LOGS_COLLECTION), {
      moderatorId,
      moderatorName,
      action: `asset_${newStatus}`,
      entityType: 'asset',
      entityId: assetId,
      reason: notes || '',
      createdAt: now
    });

    // Notify submitter of moderation result
    const submitterId = asset.submittedBy || asset.createdBy;
    if (submitterId) {
      const titles: Record<VerificationStatus, string> = {
        verified: 'Asset Approved & Verified!',
        rejected: 'Asset Submission Update',
        needs_correction: 'Correction Requested for Asset',
        pending: 'Status Reset to Pending',
        under_review: 'Asset Under Active Verification',
        archived: 'Asset Archived'
      };

      const messages: Record<VerificationStatus, string> = {
        verified: `Your submission "${asset.name}" has been officially verified and is now live on the public community map.`,
        rejected: `Your submission "${asset.name}" could not be verified. Note: ${notes || 'Information did not meet quality guidelines.'}`,
        needs_correction: `A moderator requested updates for "${asset.name}". Reason: ${notes}`,
        pending: `Status changed to pending.`,
        under_review: `A regional moderator is currently checking details for "${asset.name}".`,
        archived: `Asset "${asset.name}" was archived.`
      };

      await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
        userId: submitterId,
        type: newStatus === 'verified' ? 'asset_approved' : 'asset_rejected',
        title: titles[newStatus] || 'Submission Update',
        message: messages[newStatus] || notes,
        relatedEntityId: assetId,
        createdAt: now
      }).catch(err => console.warn('Could not send notification:', err));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ASSETS_COLLECTION}/${assetId}`);
  }
}
