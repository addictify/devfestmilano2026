import "server-only";
import { getAdminAuth } from "@/lib/firebase/admin";

/**
 * The admin behind the request, or null if there isn't a valid one.
 *
 * Same check as verifyAdmin, but returns who it was — the admin-management
 * routes need the caller's uid to stop someone removing their own access.
 */
export async function verifyAdminIdentity(
  req: Request,
): Promise<{ uid: string; email: string | null } | null> {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  const auth = getAdminAuth();
  if (!auth) return null;
  try {
    const decoded = await auth.verifyIdToken(token, true);
    if (decoded.admin !== true) return null;
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    return null;
  }
}

/** True only for a valid Firebase ID token carrying the `admin` custom claim. */
export async function verifyAdmin(req: Request): Promise<boolean> {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return false;
  const auth = getAdminAuth();
  if (!auth) return false;
  try {
    // checkRevoked: the claim is baked into the token, so revoking someone's
    // admin rights would otherwise leave their existing token working until it
    // expired (up to an hour). Removing an admin revokes their refresh tokens,
    // and this is the half that makes that take effect immediately. It costs a
    // lookup per call, which is fine on admin-only routes.
    const decoded = await auth.verifyIdToken(token, true);
    return decoded.admin === true;
  } catch {
    return false;
  }
}
