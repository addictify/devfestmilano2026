import "server-only";
import { getAdminAuth } from "@/lib/firebase/admin";

/** True only for a valid Firebase ID token carrying the `admin` custom claim. */
export async function verifyAdmin(req: Request): Promise<boolean> {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return false;
  const auth = getAdminAuth();
  if (!auth) return false;
  try {
    const decoded = await auth.verifyIdToken(token);
    return decoded.admin === true;
  } catch {
    return false;
  }
}
