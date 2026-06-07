import "server-only";
import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
// Vercel stores the key with literal "\n" — restore real newlines.
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

export const isAdminConfigured = Boolean(
  projectId && clientEmail && privateKey,
);

let cachedDb: Firestore | null = null;

/** Returns the Admin Firestore instance, or null when not configured. */
export function getAdminDb(): Firestore | null {
  if (!isAdminConfigured) return null;
  if (cachedDb) return cachedDb;

  const app: App = getApps().length
    ? getApp()
    : initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });

  cachedDb = getFirestore(app);
  // Sessionize-derived docs carry optional fields; allow undefined.
  cachedDb.settings({ ignoreUndefinedProperties: true });
  return cachedDb;
}
