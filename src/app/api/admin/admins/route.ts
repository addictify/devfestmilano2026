import { NextResponse } from "next/server";
import type { UserRecord } from "firebase-admin/auth";
import { getAdminAuth } from "@/lib/firebase/admin";
import { verifyAdminIdentity } from "@/lib/auth/admin-guard";
import {
  isBootstrapAdmin,
  isPlausibleEmail,
  normalizeEmail,
  refuseRemoval,
} from "@/lib/auth/admins";

export const dynamic = "force-dynamic";

/**
 * Manage who holds the `admin` claim.
 *
 * Firebase can't query users by custom claim, so the list is built by walking
 * the user directory. That's fine at this scale (an organizer team, not a user
 * base) and it reads the claim itself rather than a mirror of it that could
 * drift from reality.
 */

// Safety valve: stop walking rather than paging forever if the directory grows.
const MAX_USERS_SCANNED = 2000;

type AdminRow = {
  uid: string;
  email: string | null;
  displayName: string | null;
  bootstrap: boolean;
  lastSignInAt: string | null;
};

function toRow(u: UserRecord): AdminRow {
  return {
    uid: u.uid,
    email: u.email ?? null,
    displayName: u.displayName ?? null,
    bootstrap: isBootstrapAdmin(u.email),
    lastSignInAt: u.metadata.lastSignInTime || null,
  };
}

async function listAdmins(auth: NonNullable<ReturnType<typeof getAdminAuth>>) {
  const admins: AdminRow[] = [];
  let pageToken: string | undefined;
  let scanned = 0;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      if (u.customClaims?.admin === true) admins.push(toRow(u));
    }
    scanned += page.users.length;
    pageToken = page.pageToken;
  } while (pageToken && scanned < MAX_USERS_SCANNED);
  admins.sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));
  return admins;
}

export async function GET(req: Request) {
  const caller = await verifyAdminIdentity(req);
  if (!caller) return NextResponse.json({ ok: false }, { status: 403 });
  const auth = getAdminAuth();
  if (!auth) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });

  const admins = await listAdmins(auth);
  return NextResponse.json({ ok: true, admins, callerUid: caller.uid });
}

export async function POST(req: Request) {
  const caller = await verifyAdminIdentity(req);
  if (!caller) return NextResponse.json({ ok: false }, { status: 403 });
  const auth = getAdminAuth();
  if (!auth) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  if (!isPlausibleEmail(email)) {
    return NextResponse.json({ ok: false, reason: "invalid-email" }, { status: 400 });
  }

  // Provision the account when it doesn't exist yet, so the claim is waiting at
  // their first sign-in rather than needing a second pass afterwards.
  let user;
  let created = false;
  try {
    user = await auth.getUserByEmail(email);
  } catch (error) {
    const code = (error as { errorInfo?: { code?: string } }).errorInfo?.code;
    if (code !== "auth/user-not-found") throw error;
    user = await auth.createUser({ email });
    created = true;
  }

  if (user.customClaims?.admin === true) {
    return NextResponse.json({ ok: true, alreadyAdmin: true, uid: user.uid });
  }

  // Preserve any other claims rather than overwriting the whole object.
  await auth.setCustomUserClaims(user.uid, { ...user.customClaims, admin: true });

  return NextResponse.json({ ok: true, created, uid: user.uid });
}

export async function DELETE(req: Request) {
  const caller = await verifyAdminIdentity(req);
  if (!caller) return NextResponse.json({ ok: false }, { status: 403 });
  const auth = getAdminAuth();
  if (!auth) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });

  const uid = new URL(req.url).searchParams.get("uid");
  if (!uid) return NextResponse.json({ ok: false, reason: "missing-uid" }, { status: 400 });

  let target;
  try {
    target = await auth.getUser(uid);
  } catch {
    return NextResponse.json({ ok: false, reason: "not-found" }, { status: 404 });
  }

  const admins = await listAdmins(auth);
  const refusal = refuseRemoval({
    targetUid: uid,
    targetEmail: target.email ?? null,
    requesterUid: caller.uid,
    totalAdmins: admins.length,
  });
  if (refusal) {
    return NextResponse.json({ ok: false, reason: refusal }, { status: 409 });
  }

  const { admin: _dropped, ...rest } = target.customClaims ?? {};
  await auth.setCustomUserClaims(uid, rest);
  // The claim lives inside already-issued ID tokens, so without this they'd keep
  // working until expiry. verifyAdmin passes checkRevoked, so this takes effect
  // on their next request.
  await auth.revokeRefreshTokens(uid);

  return NextResponse.json({ ok: true, uid });
}
