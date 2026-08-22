import { getFirebaseAuth } from "@/lib/firebase/client";

/** fetch() against /api/admin/* with the current user's ID token attached. */
export async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const auth = getFirebaseAuth();
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
  // FormData must set its own content-type: the boundary is generated with the
  // body, and overriding the header makes the payload unparseable server-side.
  const isFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;
  return fetch(path, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.body && !isFormData ? { "content-type": "application/json" } : {}),
    },
  });
}
