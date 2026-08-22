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
import { getStorage } from "firebase-admin/storage";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
// Vercel stores the key with literal "\n" — restore real newlines.
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

// Shape checks, not just presence: a half-filled .env (a placeholder left in
// FIREBASE_ADMIN_PRIVATE_KEY, say) would otherwise read as "configured" and
// blow up inside cert() on the first request, taking the whole page down
// instead of falling back to seed content.
const isAdminConfigured = Boolean(
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

  // Catches malformed credentials only: cert() parses the PEM locally and
  // neither initializeApp nor getFirestore does any network I/O. Credentials
  // that parse but are *rejected* (revoked key, wrong project) fail later, on
  // the first actual read — each caller in lib/data handles that itself.
  // Callers treat null as "not configured" and serve seed content, so degrade
  // instead of throwing out of a server component.
  try {
    const app: App = getApps().length
      ? getApp()
      : initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
        });

    const db = getFirestore(app);
    try {
      // Sessionize-derived docs carry optional fields; allow undefined.
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      // settings() is legal once per Firestore instance. Next re-evaluates this
      // module per worker/route while firebase-admin keeps its app registry
      // global, so we can reach a live instance that was already configured —
      // the setting is in effect either way. Swallowing this matters: letting it
      // reach the catch below would flip initFailed and serve seed content for
      // the rest of the worker's life despite valid credentials.
    }
    cachedDb = db;
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

/**
 * Returns the default Storage bucket, or null when not configured.
 *
 * The bucket name comes from the public client var — it's the same bucket, and
 * keeping one source avoids the two drifting apart.
 */
export function getAdminBucket() {
  const db = getAdminDb(); // ensures the default app is initialized
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!db || !bucketName) return null;
  return getStorage(getApp()).bucket(bucketName);
}
