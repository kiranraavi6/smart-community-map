import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  updateProfile,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { UserProfile, UserRole } from '../types';

export const BOOTSTRAP_ADMIN_EMAIL = 'vinayalakshmi1021@gmail.com';

/**
 * Maps Firebase Auth error codes to helpful user messages
 */
export function mapAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in instead.';
    case 'auth/invalid-email':
      return 'The email address format is invalid.';
    case 'auth/operation-not-allowed':
      return 'Email/password authentication is not enabled in Firebase Console.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing.';
    case 'auth/cancelled-popup-request':
      return 'Sign-in cancelled.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.';
    default:
      return 'Authentication failed. Please verify your credentials.';
  }
}

/**
 * Register a new user with email & password, and create their users/{uid} Firestore record
 */
export async function registerWithEmail(
  email: string, 
  password: string, 
  name: string
): Promise<{ user: User; profile: UserProfile }> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const user = cred.user;

  // Update Firebase Auth profile
  if (name.trim()) {
    try {
      await updateProfile(user, { displayName: name.trim() });
    } catch (e) {
      console.warn('Could not set displayName on auth user:', e);
    }
  }

  const now = new Date().toISOString();
  const isAdmin = email.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

  // Create users/{uid} document with required fields:
  // uid, name, email, role, createdAt, updatedAt
  const profile: UserProfile = {
    uid: user.uid,
    displayName: name.trim() || email.split('@')[0],
    email: user.email || email.trim(),
    role: isAdmin ? 'admin' : 'user' as UserRole,
    accountStatus: 'active',
    locality: 'Narsapur, Andhra Pradesh',
    createdAt: now,
    updatedAt: now,
    submissionsCount: 0,
    approvedCount: 0
  };

  const userDocRef = doc(db, 'users', user.uid);
  await setDoc(userDocRef, {
    uid: profile.uid,
    name: profile.displayName,
    email: profile.email,
    role: profile.role,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    accountStatus: profile.accountStatus,
    locality: profile.locality
  });

  return { user, profile };
}

/**
 * Sign in with email & password
 */
export async function loginWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

/**
 * Sign in with Google popup
 */
export async function loginWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  const user = cred.user;

  // Ensure user profile document exists in Firestore
  const userDocRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userDocRef);

  if (!snap.exists()) {
    const now = new Date().toISOString();
    const isAdmin = (user.email || '').toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

    await setDoc(userDocRef, {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Community Member',
      email: user.email || '',
      role: isAdmin ? 'admin' : 'user',
      createdAt: now,
      updatedAt: now,
      accountStatus: 'active',
      locality: 'Narsapur, Andhra Pradesh'
    });
  }

  return user;
}

/**
 * Sign out current user
 */
export async function logoutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Retrieve user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const data = snap.data();
      return {
        uid: data.uid || uid,
        displayName: data.name || data.displayName || 'Community Member',
        email: data.email || '',
        photoURL: data.photoURL,
        role: data.role || 'user',
        accountStatus: data.accountStatus || 'active',
        bio: data.bio,
        locality: data.locality || 'Narsapur, Andhra Pradesh',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        submissionsCount: data.submissionsCount || 0,
        approvedCount: data.approvedCount || 0
      };
    }
  } catch (err) {
    console.error('Failed to load user profile from Firestore:', err);
  }
  return null;
}
