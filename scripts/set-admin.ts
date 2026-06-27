/**
 * Grant the Firebase admin custom claim. Usage: pnpm set-admin <email>
 * Requires FIREBASE_ADMIN_* env (service account) in the shell / .env.
 *
 * Initializes firebase-admin directly (not via src/lib/firebase/admin.ts,
 * which is server-only-guarded and would crash under a plain tsx run).
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function adminAuth() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return getAuth(app);
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: pnpm set-admin <email>");
    process.exit(1);
  }
  const auth = adminAuth();
  if (!auth) {
    console.error("Admin SDK not configured — set FIREBASE_ADMIN_* env first.");
    process.exit(1);
  }
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { admin: true });
  console.log(`✓ ${email} (uid ${user.uid}) is now an admin. They must re-sign-in for the claim to take effect.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
