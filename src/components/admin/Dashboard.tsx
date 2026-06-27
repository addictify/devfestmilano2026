"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { adminFetch } from "@/lib/admin-client";
import { localized } from "@/lib/localize";
import type { LocalizedString } from "@/types/models";

type Data = {
  subscribers: number;
  feedback: { sessionId: string; title: string; count: number; average: number; distribution: number[]; comments: string[] }[];
  game: {
    players: number;
    checkpoints: { id: string; name: LocalizedString; scans: number }[];
    badges: { id: string; name: LocalizedString; icon: string; holders: number }[];
    leaderboard: { displayName: string; points: number }[];
  };
};

export function Dashboard() {
  const locale = useLocale();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetch("/api/admin/dashboard")
      .then(async (r) => (r.ok ? ((await r.json()) as Data) : Promise.reject(r.status)))
      .then(setData)
      .catch((s) => setError(`Errore (${s}).`));
  }, []);

  if (error) return <p className="text-sm text-gdg-red">{error}</p>;
  if (!data) return <p className="text-muted-foreground">Caricamento…</p>;

  return (
    <div className="flex flex-col gap-10">
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Iscritti" value={data.subscribers} />
        <Stat label="Giocatori" value={data.game.players} />
        <Stat label="Checkpoint" value={data.game.checkpoints.length} />
        <Stat label="Sessioni valutate" value={data.feedback.length} />
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Feedback sessioni</h2>
        {data.feedback.length === 0 ? <p className="text-muted-foreground">Nessun feedback.</p> : (
          <div className="flex flex-col gap-4">
            {data.feedback.map((f) => (
              <div key={f.sessionId} className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{f.title}</p>
                  <p className="font-display font-bold">{f.average} ★ <span className="text-sm font-normal text-muted-foreground">({f.count})</span></p>
                </div>
                <div className="mt-2 flex gap-1">
                  {f.distribution.map((n, i) => (
                    <div key={i} className="flex-1 text-center text-[0.65rem] text-muted-foreground">
                      <div className="mx-auto w-full rounded bg-gdg-blue/20" style={{ height: `${8 + n * 12}px` }} />
                      {i + 1}★
                    </div>
                  ))}
                </div>
                {f.comments.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1 text-sm text-muted-foreground">
                    {f.comments.map((c, i) => <li key={i} className="border-l-2 border-border pl-2">&quot;{c}&quot;</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="mb-3 font-display text-lg font-bold">Checkpoint — scansioni</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {data.game.checkpoints.map((c) => (
              <li key={c.id} className="flex justify-between border-t border-border py-1"><span>{localized(c.name, locale)}</span><span className="font-mono">{c.scans}</span></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-display text-lg font-bold">Badge — possessori</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {data.game.badges.map((b) => (
              <li key={b.id} className="flex justify-between border-t border-border py-1"><span>{b.icon} {localized(b.name, locale)}</span><span className="font-mono">{b.holders}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Classifica (top 10)</h2>
        <ol className="flex flex-col gap-1 text-sm">
          {data.game.leaderboard.map((r, i) => (
            <li key={i} className="flex justify-between border-t border-border py-1"><span>{i + 1}. {r.displayName}</span><span className="font-mono">{r.points}</span></li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border p-4 text-center">
      <p className="font-display text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
