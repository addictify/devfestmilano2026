"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";

type Row = { id: string; displayName: string; points: number };

export function Leaderboard() {
  const t = useTranslations("play");
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const db = getDb();
    if (!db) return;
    const q = query(collection(db, "leaderboard"), orderBy("points", "desc"), limit(50));
    return onSnapshot(q, (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Row, "id">) }))));
  }, []);

  return (
    <section className="mx-auto max-w-xl px-5 py-16 sm:px-8">
      <h1 className="mb-6 font-display text-3xl font-bold tracking-tight">{t("leaderboard")}</h1>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">{t("emptyBoard")}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li key={r.id} className={`flex items-center justify-between rounded-2xl border border-border px-4 py-3 ${r.id === user?.uid ? "border-gdg-blue bg-gdg-blue/5" : ""}`}>
              <span className="flex items-center gap-3">
                <span className="w-6 font-mono text-muted-foreground">{i + 1}</span>
                <span className="font-medium">{r.displayName}{r.id === user?.uid && ` (${t("you")})`}</span>
              </span>
              <span className="font-display font-bold">{r.points}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
