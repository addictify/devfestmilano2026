import { getFirebaseAuth } from "@/lib/firebase/client";
import { apiUrl } from "@/lib/api-base";

/** fetch() with the current signed-in user's ID token attached (any user). */
export async function userFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const auth = getFirebaseAuth();
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
  return fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
  });
}
