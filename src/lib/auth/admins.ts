/**
 * Rules for who may be granted or stripped of the `admin` claim.
 *
 * Kept free of Firebase imports so the decisions can be unit-tested directly —
 * these are the checks that stop the project locking itself out of its own
 * admin panel.
 */

/**
 * The account that always keeps admin rights. It's provisioned before anyone
 * signs in, and can't be removed through the UI, so there is always one way
 * back into the panel even if the admin list is mismanaged.
 */
export const BOOTSTRAP_ADMIN_EMAIL = "d.tresoldi5@gmail.com";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isBootstrapAdmin(email: string | null | undefined): boolean {
  return !!email && normalizeEmail(email) === normalizeEmail(BOOTSTRAP_ADMIN_EMAIL);
}

export type RemovalRefusal = "self" | "bootstrap" | "last-admin";

/**
 * Why a removal must be refused, or null when it's allowed.
 *
 * Ordered by how surprising the outcome would be: removing yourself is the
 * easiest mistake to make and locks you out of the page you're standing on.
 */
export function refuseRemoval(params: {
  targetUid: string;
  targetEmail: string | null;
  requesterUid: string;
  totalAdmins: number;
}): RemovalRefusal | null {
  if (params.targetUid === params.requesterUid) return "self";
  if (isBootstrapAdmin(params.targetEmail)) return "bootstrap";
  if (params.totalAdmins <= 1) return "last-admin";
  return null;
}

/** Basic shape check; Firebase is the real authority on whether it can exist. */
export function isPlausibleEmail(email: string): boolean {
  const e = normalizeEmail(email);
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e.length < 254;
}
