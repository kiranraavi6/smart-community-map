import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  arrayUnion,
  arrayRemove,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { CommunityNeed } from '../types';

const NEEDS_COLLECTION = 'needs';

export interface NeedInput {
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  address?: string;
  locality?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

/**
 * Real-time listener for community needs
 */
export function subscribeToNeeds(callback: (needs: CommunityNeed[]) => void) {
  const q = query(
    collection(db, NEEDS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(150)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: CommunityNeed[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          title: data.title || '',
          categoryId: data.categoryId || data.category || 'other',
          description: data.description || '',
          latitude: typeof data.latitude === 'number' ? data.latitude : 16.4344,
          longitude: typeof data.longitude === 'number' ? data.longitude : 81.6985,
          locality: data.locality || data.address || 'Narsapur',
          submittedBy: data.createdBy || data.submittedBy || '',
          submittedByName: data.submittedByName || data.createdByName || 'Community Member',
          status: data.status || 'submitted',
          upvotes: typeof data.upvotes === 'number' ? data.upvotes : (data.upvotedBy?.length || 0),
          upvotedBy: data.upvotedBy || [],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        } as CommunityNeed);
      });
      callback(list);
    },
    (err) => {
      console.warn('Firestore needs subscription notice:', err.message);
    }
  );
}

/**
 * Submit a new community resource gap / need to Firestore
 */
export async function createNeed(
  input: NeedInput,
  userId: string,
  userName: string
): Promise<string> {
  const now = new Date().toISOString();
  const payload = {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    categoryId: input.category,
    latitude: input.latitude,
    longitude: input.longitude,
    address: input.address || input.locality || 'Narsapur',
    locality: input.locality || input.address || 'Narsapur',
    priority: input.priority || 'medium',
    status: 'submitted',
    createdBy: userId,
    submittedBy: userId,
    submittedByName: userName,
    upvotes: 1,
    upvotedBy: [userId],
    createdAt: now,
    updatedAt: now
  };

  const docRef = await addDoc(collection(db, NEEDS_COLLECTION), payload);
  return docRef.id;
}

/**
 * Toggle upvote for a community need
 */
export async function toggleUpvoteNeed(needId: string, userId: string): Promise<void> {
  if (!needId || !userId) return;

  const needRef = doc(db, NEEDS_COLLECTION, needId);
  const snap = await getDoc(needRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const upvotedBy: string[] = data.upvotedBy || [];
  const isUpvoted = upvotedBy.includes(userId);

  if (isUpvoted) {
    await updateDoc(needRef, {
      upvotedBy: arrayRemove(userId),
      upvotes: Math.max(0, (data.upvotes || 1) - 1),
      updatedAt: new Date().toISOString()
    });
  } else {
    await updateDoc(needRef, {
      upvotedBy: arrayUnion(userId),
      upvotes: (data.upvotes || 0) + 1,
      updatedAt: new Date().toISOString()
    });
  }
}

/**
 * Update need status (Moderator / Admin)
 */
export async function updateNeedStatus(
  needId: string,
  status: CommunityNeed['status'],
  moderatorId: string
): Promise<void> {
  const ref = doc(db, NEEDS_COLLECTION, needId);
  await updateDoc(ref, {
    status,
    updatedAt: new Date().toISOString(),
    moderatedBy: moderatorId
  });
}

/**
 * Delete a community need
 */
export async function deleteNeed(needId: string): Promise<void> {
  await deleteDoc(doc(db, NEEDS_COLLECTION, needId));
}

// Aliases for backwards compatibility with assetService and legacy views
export async function submitCommunityNeed(
  input: {
    title: string;
    categoryId?: string;
    category?: string;
    locality?: string;
    address?: string;
    description: string;
    latitude: number;
    longitude: number;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  },
  userId: string,
  userName: string
): Promise<string> {
  return createNeed({
    title: input.title,
    description: input.description,
    category: input.categoryId || input.category || 'other',
    latitude: input.latitude,
    longitude: input.longitude,
    address: input.address || input.locality,
    locality: input.locality || input.address,
    priority: input.priority
  }, userId, userName);
}

export const upvoteCommunityNeed = toggleUpvoteNeed;

