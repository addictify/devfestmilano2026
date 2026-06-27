import "server-only";
import { getAdminAuth } from "@/lib/firebase/admin";

/** The uid for a valid Firebase ID token, else null. Any signed-in user. */
export async function verifyUser(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  const auth = getAdminAuth();
  if (!auth) return null;
  try {
    const decoded = await auth.verifyIdToken(token);
    return typeof decoded.uid === "string" ? decoded.uid : null;
  } catch {
    return null;
  }
}
