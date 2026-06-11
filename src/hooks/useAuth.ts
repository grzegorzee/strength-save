import { useState, useEffect } from 'react';
import {
  User,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { auth, googleProvider, appleProvider } from '@/lib/firebase';
import { logInPurchases, logOutPurchases } from '@/lib/purchases';
import { readE2EAuthState } from '@/lib/e2e-auth';
import { useTranslation } from '@/contexts/LanguageContext';

export const useAuth = () => {
  const { t } = useTranslation();
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
      // RevenueCat: zwiąż/odwiąż zakupy z kontem (no-op poza natywnym iOS).
      if (user) {
        void logInPurchases(user.uid);
      } else {
        void logOutPurchases();
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      if (Capacitor.isNativePlatform()) {
        // Native (iOS/Android): popup nie działa w WebView. Natywny plugin tworzy
        // credential Google, a logujemy się przez JS SDK (spójny stan z Firestore).
        const result = await FirebaseAuthentication.signInWithGoogle();
        const credential = GoogleAuthProvider.credential(
          result.credential?.idToken,
          result.credential?.accessToken,
        );
        await signInWithCredential(auth, credential);
      } else {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithPopup(auth, googleProvider);
      }
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('auth.err.login');
      console.error('Login error:', errorMessage);
      setError(errorMessage);
      return false;
    }
  };

  const signInWithApple = async () => {
    try {
      setError(null);
      if (Capacitor.isNativePlatform()) {
        // Native (iOS): natywne „Zaloguj przez Apple", potem logowanie przez JS SDK
        // tym samym credentialem (spójny stan z Firestore — jak w Google wyżej).
        const result = await FirebaseAuthentication.signInWithApple();
        const provider = new OAuthProvider('apple.com');
        const credential = provider.credential({
          idToken: result.credential?.idToken,
          rawNonce: result.credential?.nonce,
        });
        await signInWithCredential(auth, credential);
      } else {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithPopup(auth, appleProvider);
      }
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('auth.err.login');
      console.error('Apple login error:', errorMessage);
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
      const errorMessage = err instanceof Error ? err.message : t('auth.err.register');
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
      const errorMessage = err instanceof Error ? err.message : t('auth.err.login');
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
      const errorMessage = err instanceof Error ? err.message : t('auth.err.reset');
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
    signInWithApple,
    registerWithEmail,
    loginWithEmail,
    resetPassword,
    logout,
  };
};
