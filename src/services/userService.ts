import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import { InAppNotification } from '../types';

export function subscribeToFavorites(userId: string, callback: (assetIds: string[]) => void) {
  const q = query(collection(db, 'favorites'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const ids: string[] = [];
    snapshot.forEach(d => {
      const data = d.data();
      if (data.assetId) ids.push(data.assetId);
    });
    callback(ids);
  });
}

export async function toggleFavorite(userId: string, assetId: string, isCurrentlyFavorited: boolean) {
  const favDocId = `${userId}_${assetId}`;
  const ref = doc(db, 'favorites', favDocId);
  if (isCurrentlyFavorited) {
    await deleteDoc(ref);
  } else {
    await setDoc(ref, {
      userId,
      assetId,
      createdAt: new Date().toISOString()
    });
  }
}

export function subscribeToNotifications(userId: string, callback: (notifs: InAppNotification[]) => void) {
  const q = query(
    collection(db, 'notifications'), 
    where('userId', '==', userId)
  );
  return onSnapshot(q, (snapshot) => {
    const list: InAppNotification[] = [];
    snapshot.forEach(d => list.push({ id: d.id, ...d.data() } as InAppNotification));
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(list);
  });
}

export async function markNotificationAsRead(notifId: string) {
  const ref = doc(db, 'notifications', notifId);
  await setDoc(ref, { readAt: new Date().toISOString() }, { merge: true });
}
