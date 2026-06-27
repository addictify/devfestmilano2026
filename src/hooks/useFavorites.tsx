"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { getDb } from "@/lib/firebase/client";
import { mergeFavorites, readLocal, writeLocal } from "@/lib/favorites";

type FavoritesState = {
  favorites: Set<string>;
  isFavorite: (id: string) => boolean;
  toggle: (id: string) => void;
  count: number;
  ready: boolean;
};

const FavoritesContext = createContext<FavoritesState>({
  favorites: new Set(),
  isFavorite: () => false,
  toggle: () => {},
  count: 0,
  ready: false,
});

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const mergedFor = useRef<string | null>(null);

  // Signed-out: hydrate from localStorage.
  useEffect(() => {
    if (user) return;
    const local = readLocal();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIds(new Set(local));
    setReady(true);
  }, [user]);

  // Signed-in: subscribe to Firestore, merging any local favorites once.
  useEffect(() => {
    const db = getDb();
    if (!user || !db) return;
    const col = collection(db, "users", user.uid, "favorites");

    // One-time merge of local → cloud on this sign-in.
    if (mergedFor.current !== user.uid) {
      mergedFor.current = user.uid;
      const local = readLocal();
      if (local.length) {
        const batch = writeBatch(db);
        for (const id of local) {
          batch.set(doc(col, id), { addedAt: serverTimestamp() }, { merge: true });
        }
        batch.commit().then(() => writeLocal([])).catch(() => {});
      }
    }

    const unsub = onSnapshot(col, (snap) => {
      const next = new Set<string>();
      snap.forEach((d) => next.add(d.id));
      // Union with any local ids still pending merge, for instant paint.
      setIds(new Set(mergeFavorites([...next], readLocal())));
      setReady(true);
    });
    return unsub;
  }, [user]);

  const toggle = useCallback(
    (id: string) => {
      const db = getDb();
      setIds((prev) => {
        const next = new Set(prev);
        const has = next.has(id);
        if (has) next.delete(id);
        else next.add(id);

        if (user && db) {
          const ref = doc(db, "users", user.uid, "favorites", id);
          (has ? deleteDoc(ref) : setDoc(ref, { addedAt: serverTimestamp() })).catch(() => {
            // rollback on failure
            setIds((cur) => {
              const rb = new Set(cur);
              if (has) rb.add(id);
              else rb.delete(id);
              return rb;
            });
          });
        } else {
          const arr = [...next];
          writeLocal(arr);
        }
        return next;
      });
    },
    [user],
  );

  const value = useMemo<FavoritesState>(
    () => ({
      favorites: ids,
      isFavorite: (id: string) => ids.has(id),
      toggle,
      count: ids.size,
      ready,
    }),
    [ids, toggle, ready],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export const useFavorites = () => useContext(FavoritesContext);
