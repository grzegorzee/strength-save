import { useState, useEffect } from 'react';
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { readE2EAuthState } from '@/lib/e2e-auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // E2E test mode — bypass Firebase auth
    if (import.meta.env.VITE_E2E_MODE === 'true') {
      const e2eState = readE2EAuthState();
      if (e2eState.scenario === 'unauthenticated') {
        setUser(null);
      } else {
        setUser({
          uid: 'e2e-test-user',
          email: e2eState.email || 'e2e@test.com',
          displayName: e2eState.displayName || 'E2E Tester',
          photoURL: '',
        } as User);
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setError(null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Błąd logowania';
      console.error('Login error:', errorMessage);
      setError(errorMessage);
      return false;
    }
  };

  const registerWithEmail = async (email: string, password: string) => {
    try {
      setError(null);
      await setPersistence(auth, browserLocalPersistence);
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Błąd rejestracji';
      console.error('Register error:', errorMessage);
      setError(errorMessage);
      return false;
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      setError(null);
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Błąd logowania';
      console.error('Email login error:', errorMessage);
      setError(errorMessage);
      return false;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email.trim());
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Błąd resetu hasła';
      console.error('Reset password error:', errorMessage);
      setError(errorMessage);
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err instanceof Error ? err.message : err);
    }
  };

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    signInWithGoogle,
    registerWithEmail,
    loginWithEmail,
    resetPassword,
    logout,
  };
};
