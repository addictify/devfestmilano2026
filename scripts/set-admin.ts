/**
 * Grant the Firebase admin custom claim.
 *
 *   pnpm set-admin <email>            # account must already exist
 *   pnpm set-admin <email> --create   # provision the account first
 *
 * Claims attach to an account, so the person normally has to sign in once
 * before this can run. `--create` covers the chicken-and-egg case of the very
 * first admin: it provisions the account now so the claim is already in place
 * when they first sign in. Their Google sign-in links to it rather than making
 * a second account, because the project allows one account per email address.
 *
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
  const args = process.argv.slice(2);
  const create = args.includes("--create");
  const email = args.find((a) => !a.startsWith("--"));
  if (!email) {
    console.error("Usage: pnpm set-admin <email> [--create]");
    process.exit(1);
  }
  const auth = adminAuth();
  if (!auth) {
    console.error("Admin SDK not configured — set FIREBASE_ADMIN_* env first.");
    process.exit(1);
  }

  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch (error) {
    const code = (error as { errorInfo?: { code?: string } }).errorInfo?.code;
    if (code !== "auth/user-not-found") throw error;
    if (!create) {
      console.error(`No Firebase account exists for ${email} yet.`);
      console.error("A custom claim attaches to an account, so either:");
      console.error("  • have them sign in once, then re-run this, or");
      console.error("  • re-run with --create to provision the account now.");
      process.exit(1);
    }
    user = await auth.createUser({ email });
    console.log(`Provisioned an account for ${email} (uid ${user.uid}).`);
  }

  await auth.setCustomUserClaims(user.uid, { admin: true });

  // Read it back rather than trusting the write.
  const claims = (await auth.getUser(user.uid)).customClaims ?? {};
  if (claims.admin !== true) {
    console.error(`Claim did not stick — customClaims is ${JSON.stringify(claims)}`);
    process.exit(1);
  }
  console.log(`✓ ${email} (uid ${user.uid}) is an admin — verified: ${JSON.stringify(claims)}`);
  console.log("  If they're already signed in, they must sign out and back in to pick it up.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
