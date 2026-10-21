import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { AssetReport } from '../types';

const REPORTS_COLLECTION = 'reports';

/**
 * Submit an inaccuracy or closure report
 */
export async function submitAssetReport(
  assetId: string,
  assetName: string,
  reason: string,
  description: string,
  reporterId: string,
  reporterName: string
): Promise<string> {
  const now = new Date().toISOString();
  const reportData = {
    assetId,
    assetName,
    reportedBy: reporterId,
    reportedByName: reporterName,
    reason,
    description: description.trim(),
    status: 'pending',
    createdAt: now
  };

  const docRef = await addDoc(collection(db, REPORTS_COLLECTION), reportData);
  return docRef.id;
}

/**
 * Subscribe in real-time to submitted reports (Moderators & Admins)
 */
export function subscribeToReports(callback: (reports: AssetReport[]) => void) {
  const q = query(
    collection(db, REPORTS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(100)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: AssetReport[] = [];
      snapshot.forEach(d => {
        list.push({ id: d.id, ...d.data() } as AssetReport);
      });
      callback(list);
    },
    (err) => {
      console.warn('Reports subscription notice:', err.message);
    }
  );
}

/**
 * Resolve a report (Moderator or Admin)
 */
export async function resolveAssetReport(
  reportId: string,
  arg2: string,
  arg3: string,
  arg4?: 'resolved' | 'dismissed' | string
): Promise<void> {
  const now = new Date().toISOString();
  const ref = doc(db, REPORTS_COLLECTION, reportId);
  
  // Detect if called as (reportId, notes, resolverId, resolverName) vs (reportId, resolverId, notes, status)
  let resolverId = arg2;
  let resolutionNotes = arg3;
  let status: 'resolved' | 'dismissed' = 'resolved';

  if (arg4 === 'dismissed' || arg4 === 'resolved') {
    status = arg4;
    resolverId = arg2;
    resolutionNotes = arg3;
  } else if (typeof arg4 === 'string') {
    // Called as (reportId, notes, resolverId, resolverName)
    resolutionNotes = arg2;
    resolverId = arg3;
  }

  await updateDoc(ref, {
    status,
    resolutionNotes,
    resolvedAt: now,
    resolvedBy: resolverId
  });
}

