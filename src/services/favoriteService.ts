import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../firebase';

const FAVORITES_COLLECTION = 'favorites';

/**
 * Subscribe in real-time to the current user's favorite asset IDs
 */
export function subscribeToUserFavorites(
  userId: string, 
  callback: (assetIds: string[]) => void
) {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, FAVORITES_COLLECTION), 
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const ids: string[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.assetId) {
          ids.push(data.assetId);
        }
      });
      callback(ids);
    },
    (err) => {
      console.warn('Firestore favorites subscription notice:', err.message);
    }
  );
}

/**
 * Toggle favorite status in Firestore (persisted by user UID)
 */
export async function toggleAssetFavorite(
  userId: string, 
  assetId: string, 
  isFavorited: boolean
): Promise<void> {
  if (!userId || !assetId) return;

  const favDocId = `${userId}_${assetId}`;
  const favRef = doc(db, FAVORITES_COLLECTION, favDocId);

  if (isFavorited) {
    await deleteDoc(favRef);
  } else {
    await setDoc(favRef, {
      userId,
      assetId,
      createdAt: new Date().toISOString()
    });
  }
}

/**
 * Fetch favorite IDs once
 */
export async function fetchUserFavoriteIds(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const q = query(
      collection(db, FAVORITES_COLLECTION), 
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    const ids: string[] = [];
    snap.forEach(d => {
      const data = d.data();
      if (data.assetId) ids.push(data.assetId);
    });
    return ids;
  } catch (err) {
    console.error('Error fetching favorites:', err);
    return [];
  }
}

// Aliases for compatibility
export const subscribeToFavorites = subscribeToUserFavorites;
export const toggleFavorite = toggleAssetFavorite;
