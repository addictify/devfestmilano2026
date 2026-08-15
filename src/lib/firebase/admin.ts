import "server-only";
import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
// Vercel stores the key with literal "\n" — restore real newlines.
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

// Shape checks, not just presence: a half-filled .env (a placeholder left in
// FIREBASE_ADMIN_PRIVATE_KEY, say) would otherwise read as "configured" and
// blow up inside cert() on the first request, taking the whole page down
// instead of falling back to seed content.
export const isAdminConfigured = Boolean(
  projectId &&
    clientEmail?.includes("@") &&
    privateKey?.includes("BEGIN PRIVATE KEY"),
);

let cachedDb: Firestore | null = null;
let initFailed = false;

/** Returns the Admin Firestore instance, or null when not configured. */
export function getAdminDb(): Firestore | null {
  if (!isAdminConfigured || initFailed) return null;
  if (cachedDb) return cachedDb;

  // Credentials can be well-formed but still rejected (revoked key, wrong
  // project). Callers treat null as "not configured" and serve seed content,
  // so degrade instead of throwing out of a server component.
  try {
    const app: App = getApps().length
      ? getApp()
      : initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
        });

    cachedDb = getFirestore(app);
    // Sessionize-derived docs carry optional fields; allow undefined.
    cachedDb.settings({ ignoreUndefinedProperties: true });
    return cachedDb;
  } catch (error) {
    initFailed = true; // don't retry (and re-log) on every request
    console.error(
      "[firebase-admin] initialization failed — serving seed content:",
      error,
    );
    return null;
  }
}

/** Returns the Admin Auth instance, or null when not configured. */
export function getAdminAuth(): Auth | null {
  const db = getAdminDb(); // ensures the default app is initialized
  if (!db) return null;
  return getAuth(getApp());
}
