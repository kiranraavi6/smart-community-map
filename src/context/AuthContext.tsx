import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { 
  registerWithEmail as authRegister, 
  loginWithEmail as authLogin, 
  loginWithGoogle as authGoogle, 
  logoutUser as authSignOut,
  getUserProfile,
  BOOTSTRAP_ADMIN_EMAIL,
  mapAuthErrorMessage
} from '../services/authService';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  role: UserRole;
  isModerator: boolean;
  isAdmin: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInDemoRole: (role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setUserProfile(profile);
          } else {
            // First time profile creation in Firestore if not already present
            const isRootAdmin = (user.email || '').toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
            const now = new Date().toISOString();
            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || user.email?.split('@')[0] || 'Community Member',
              email: user.email || '',
              photoURL: user.photoURL || undefined,
              role: isRootAdmin ? 'admin' : 'user',
              accountStatus: 'active',
              locality: 'Narsapur, Andhra Pradesh',
              createdAt: now,
              updatedAt: now,
              submissionsCount: 0,
              approvedCount: 0
            };
            await setDoc(doc(db, 'users', user.uid), {
              uid: newProfile.uid,
              name: newProfile.displayName,
              email: newProfile.email,
              role: newProfile.role,
              accountStatus: newProfile.accountStatus,
              locality: newProfile.locality,
              createdAt: newProfile.createdAt,
              updatedAt: newProfile.updatedAt
            }, { merge: true });
            setUserProfile(newProfile);
          }
        } catch (err) {
          console.error('Error fetching or initializing user profile:', err);
          const isRootAdmin = (user.email || '').toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
          setUserProfile({
            uid: user.uid,
            displayName: user.displayName || 'Community Member',
            email: user.email || '',
            role: isRootAdmin ? 'admin' : 'user',
            accountStatus: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const user = await authLogin(email, password);
      setCurrentUser(user);
      const profile = await getUserProfile(user.uid);
      if (profile) setUserProfile(profile);
    } catch (err: any) {
      throw new Error(mapAuthErrorMessage(err.code || err.message));
    }
  };

  const registerWithEmail = async (email: string, password: string, name: string) => {
    try {
      const { user, profile } = await authRegister(email, password, name);
      setCurrentUser(user);
      setUserProfile(profile);
    } catch (err: any) {
      throw new Error(mapAuthErrorMessage(err.code || err.message));
    }
  };

  const signInWithGoogle = async () => {
    try {
      const user = await authGoogle();
      setCurrentUser(user);
      const profile = await getUserProfile(user.uid);
      if (profile) setUserProfile(profile);
    } catch (err: any) {
      throw new Error(mapAuthErrorMessage(err.code || err.message));
    }
  };

  // Secure role switching for administrative previews and testing
  const signInDemoRole = async (targetRole: UserRole) => {
    if (!currentUser) {
      const demoId = `demo_${targetRole}_${Date.now()}`;
      setUserProfile({
        uid: demoId,
        displayName: targetRole === 'admin' ? 'Civic Lead Admin' : targetRole === 'moderator' ? 'Regional Moderator' : 'Active Contributor',
        email: `${targetRole}@civicmap.org`,
        role: targetRole,
        accountStatus: 'active',
        locality: 'Narsapur, Andhra Pradesh',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        submissionsCount: targetRole === 'admin' ? 24 : 5,
        approvedCount: targetRole === 'admin' ? 22 : 4
      });
      return;
    }

    const isBootstrap = currentUser.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
    const isDbAdmin = userProfile?.role === 'admin';

    if (isBootstrap || isDbAdmin) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, { role: targetRole, updatedAt: new Date().toISOString() }, { merge: true });
        setUserProfile(prev => prev ? { ...prev, role: targetRole } : null);
      } catch (err) {
        console.error('Administrative role update error:', err);
        setUserProfile(prev => prev ? { ...prev, role: targetRole } : null);
      }
    } else {
      console.warn('Security Notice: Unauthorized attempt to change role rejected.');
      throw new Error('Access Restricted: Only authorized Civic Administrators can assign user roles.');
    }
  };

  const signOut = async () => {
    await authSignOut();
    setCurrentUser(null);
    setUserProfile(null);
  };

  const refreshProfile = async () => {
    if (currentUser) {
      const profile = await getUserProfile(currentUser.uid);
      if (profile) setUserProfile(profile);
    }
  };

  const isBootstrapAdmin = (currentUser?.email || '').toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
  const role: UserRole = isBootstrapAdmin ? 'admin' : (userProfile?.role || 'user');
  const isAdmin = role === 'admin';
  const isModerator = role === 'moderator' || role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        role,
        isModerator,
        isAdmin,
        signInWithEmail,
        registerWithEmail,
        signInWithGoogle,
        signInDemoRole,
        signOut,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
