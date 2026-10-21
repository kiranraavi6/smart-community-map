import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  doc,
  updateDoc,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import { ModerationLog, UserProfile, UserRole } from '../types';
import { handleFirestoreError, OperationType } from './errorHandler';

const LOGS_COLLECTION = 'moderationLogs';
const USERS_COLLECTION = 'users';

/**
 * Real-time subscription to immutable moderation audit logs.
 * Restricted to Moderators and Admins by security rules.
 */
export function subscribeToAuditLogs(callback: (logs: ModerationLog[]) => void) {
  const q = query(
    collection(db, LOGS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(100)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const logs: ModerationLog[] = [];
      snapshot.forEach(d => logs.push({ id: d.id, ...d.data() } as ModerationLog));
      callback(logs);
    },
    (err) => {
      console.warn('Audit logs subscription error (restricted to authorized staff):', err);
    }
  );
}

/**
 * Fetch registered users for administrative audit and management
 */
export async function fetchUsersForAdmin(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(query(collection(db, USERS_COLLECTION), limit(100)));
    const users: UserProfile[] = [];
    snap.forEach(d => users.push({ ...d.data() } as UserProfile));
    return users;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, USERS_COLLECTION);
  }
}

/**
 * Assign a user role (Admin only operation)
 */
export async function updateUserRoleByAdmin(
  targetUserId: string,
  newRole: UserRole,
  adminId: string,
  adminName: string
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, targetUserId);
  const now = new Date().toISOString();

  try {
    await updateDoc(userRef, {
      role: newRole,
      updatedAt: now
    });

    // Write audit log entry
    const { addDoc } = await import('firebase/firestore');
    await addDoc(collection(db, LOGS_COLLECTION), {
      moderatorId: adminId,
      moderatorName: adminName,
      action: `role_change_to_${newRole}`,
      entityType: 'user',
      entityId: targetUserId,
      reason: `Role updated to ${newRole} by administrator ${adminName}`,
      createdAt: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${targetUserId}`);
  }
}
