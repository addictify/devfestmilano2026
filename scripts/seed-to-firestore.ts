/**
 * Copies the bundled seed content (sponsors, team) into Firestore.
 *
 * The seed exists so the site renders with no backend at all, but while a
 * collection is empty the data layer keeps falling back to it — which means
 * those entries can't be edited from /admin, and edits there would have nothing
 * to edit. Running this once promotes the seed to real, editable data.
 *
 *   pnpm seed:firestore          # skips collections that already have documents
 *   pnpm seed:firestore --force  # overwrites documents with the same id
 *
 * Never deletes: anything added in the admin panel is left alone.
 */
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { seedSponsors, seedTeam } from "../src/lib/data/seed";

const force = process.argv.includes("--force");

function db(): Firestore {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("FIREBASE_ADMIN_* missing — run with the project .env loaded");
  }
  const app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  const store = getFirestore(app);
  store.settings({ ignoreUndefinedProperties: true });
  return store;
}

async function push<T extends { id: string }>(
  store: Firestore,
  collection: string,
  items: T[],
): Promise<void> {
  const existing = await store.collection(collection).get();
  if (!existing.empty && !force) {
    console.log(
      `  ${collection}: ${existing.size} document(s) already there — skipped (use --force to overwrite)`,
    );
    return;
  }

  const batch = store.batch();
  for (const { id, ...rest } of items) {
    // merge so a --force run updates fields without dropping anything an
    // organizer added to the same document by hand.
    batch.set(store.collection(collection).doc(id), rest, { merge: true });
  }
  await batch.commit();
  console.log(`  ${collection}: wrote ${items.length} document(s)`);
}

async function main() {
  const store = db();
  console.log(force ? "Seeding Firestore (force)" : "Seeding Firestore");
  await push(store, "sponsors", seedSponsors);
  await push(store, "team", seedTeam);
  console.log("Done. Publish from /admin for the changes to reach the live site.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
