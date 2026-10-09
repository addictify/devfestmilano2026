"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

type AuthState = {
  user: User | null;
  loading: boolean;
  /** Whether Google Sign-In is available (Firebase configured). */
  enabled: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  enabled: false,
  signIn: async () => {},
  signOut: async () => {},
});

/**
 * Whether Firebase's sign-in pages are served from this site (public/__/auth,
 * authDomain = the site's host). Only then does a redirect survive browsers
 * that keep storage per site; with the helper on firebaseapp.com a redirect
 * is exactly what breaks ("missing initial state"), so stay on the popup.
 */
function helperOnThisSite(auth: Auth): boolean {
  return auth.config.authDomain === window.location.host;
}

/** The installed app (Home Screen / standalone window). */
function isInstalledApp(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

const POPUP_UNUSABLE = new Set(["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"]);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Only "loading" when there's an auth provider to wait for.
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    // Back from a redirect sign-in: complete it. A failure here (cancelled,
    // expired) just leaves the user signed out, as before they tried.
    if (helperOnThisSite(auth)) getRedirectResult(auth).catch(() => {});
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      enabled: isFirebaseConfigured,
      signIn: async () => {
        const auth = getFirebaseAuth();
        if (!auth) return;
        const provider = new GoogleAuthProvider();
        const canRedirect = helperOnThisSite(auth);
        // In the installed app a popup opens in a separate browser that can't
        // report back to the app: go by redirect, which stays in the app.
        if (canRedirect && isInstalledApp()) return signInWithRedirect(auth, provider);
        try {
          await signInWithPopup(auth, provider);
        } catch (error) {
          if (canRedirect && POPUP_UNUSABLE.has((error as { code?: string }).code ?? "")) {
            return signInWithRedirect(auth, provider);
          }
          throw error;
        }
      },
      signOut: async () => {
        const auth = getFirebaseAuth();
        if (!auth) return;
        await firebaseSignOut(auth);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
