"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Whether the signed-in user carries the `admin` custom claim.
 *
 * `null` means "not known yet" — either nobody is signed in, or the token is
 * still being read. Callers must treat that as *not* admin for rendering, but
 * it's kept distinct from `false` so the admin gate can show "checking…" rather
 * than flashing "access denied" at a legitimate admin.
 *
 * The claim is read from the ID token, which is refreshed on sign-in; a claim
 * granted while someone is already signed in only appears after they sign out
 * and back in.
 */
export function useIsAdmin(): boolean | null {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAdmin(null);
      return;
    }
    let active = true;
    user
      .getIdTokenResult()
      .then((r) => {
        if (active) setIsAdmin(r.claims.admin === true);
      })
      .catch(() => {
        // A token we can't read is not a token that grants admin.
        if (active) setIsAdmin(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  return isAdmin;
}
