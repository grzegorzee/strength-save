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
import { unregisterPushForUser } from '@/lib/push-notifications';
import { revokeAllGarminDevices } from '@/lib/garmin-api';
import { disableAppleWatchAccess } from '@/lib/watch-bridge';
import { readE2EAuthState } from '@/lib/e2e-auth';
import { mapAuthErrorMessage } from '@/lib/auth-errors';
import { trackTelemetryEvent } from '@/lib/app-telemetry';
import { useTranslation } from '@/contexts/LanguageContext';
import { markStartup } from '@/lib/startup-performance';

// Z222: flaga sesyjna łączy register_started z profile_created (backend nie
// sygnalizuje "utworzono" — najbliższy udany sync profilu po rejestracji = created).
export const FUNNEL_REGISTERED_KEY = 'strength-save:funnel-registered';

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
      markStartup('auth-restored');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setError(null);
      setLoading(false);
      markStartup('auth-restored');
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
      // Bug 10: anulowanie sheetu/popupu = cichy powrót; reszta kodów mapowana
      // na i18n zamiast surowego angielskiego komunikatu Firebase/pluginu.
      const errorMessage = mapAuthErrorMessage(err, t);
      if (errorMessage === null) return false;
      console.error('Login error:', err);
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
      // Bug 10: jak w signInWithGoogle wyżej — cichy powrót przy anulowaniu.
      const errorMessage = mapAuthErrorMessage(err, t);
      if (errorMessage === null) return false;
      console.error('Apple login error:', err);
      setError(errorMessage);
      return false;
    }
  };

  const registerWithEmail = async (email: string, password: string) => {
    try {
      setError(null);
      await setPersistence(auth, browserLocalPersistence);
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      // Z222: funnel — bufor lokalny, flush dojdzie po aktywacji konta.
      const uid = auth.currentUser?.uid;
      if (uid) {
        trackTelemetryEvent(uid, 'register_started');
        try { sessionStorage.setItem(FUNNEL_REGISTERED_KEY, uid); } catch { /* brak storage = brak pary created */ }
      }
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

  const finishLogout = async (devicesAlreadyRevoked: boolean) => {
    try {
      // Independent watch access must be revoked before Firebase auth disappears.
      // deleteOwnAccount already purged these docs, so it can skip the second callable.
      // Z237: cleanup równolegle z twardym timeoutem — dwa zimne callable wykonywane
      // sekwencyjnie trzymały UI 3-5 s bez feedbacku; signOut nie może na nich wisieć
      // w nieskończoność.
      const cleanup = Promise.allSettled([
        devicesAlreadyRevoked ? Promise.resolve() : revokeAllGarminDevices(),
        disableAppleWatchAccess(),
        unregisterPushForUser(),
      ]);
      await Promise.race([cleanup, new Promise((resolve) => setTimeout(resolve, 3000))]);
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err instanceof Error ? err.message : err);
    }
  };
  const logout = () => finishLogout(false);
  const logoutAfterAccountDeletion = () => finishLogout(true);

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
    logoutAfterAccountDeletion,
  };
};
