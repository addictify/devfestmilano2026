"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { getDb } from "@/lib/firebase/client";
import { userFetch } from "@/lib/user-client";
import { localized } from "@/lib/localize";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import type { Badge } from "@/lib/data/game";

export function PlayHome({ badges }: { badges: Badge[] }) {
  const { user, enabled, signIn } = useAuth();
  const t = useTranslations("play");
  const locale = useLocale();
  const [points, setPoints] = useState(0);
  const [held, setHeld] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const db = getDb();
    if (!user || !db) return;
    const unsubP = onSnapshot(doc(db, "gameProfiles", user.uid), (d) => {
      setPoints(d.data()?.points ?? 0);
      setHeld(new Set<string>(d.data()?.badgeIds ?? []));
    });
    const unsubU = onSnapshot(doc(db, "users", user.uid), (d) => {
      if (d.data()?.displayName != null) setName(d.data()!.displayName);
      setOptIn(d.data()?.leaderboardOptIn === true);
    });
    return () => { unsubP(); unsubU(); };
  }, [user]);

  async function saveProfile() {
    setSaved(false);
    const res = await userFetch("/api/play/profile", { method: "POST", body: JSON.stringify({ displayName: name, leaderboardOptIn: optIn }) });
    if (res.ok) setSaved(true);
  }

  if (!enabled || !user) {
    return (
      <Section>
        <p className="mb-4 text-muted-foreground">{t("signIn")}</p>
        {enabled && <Button onClick={() => void signIn()}>{t("signIn")}</Button>}
      </Section>
    );
  }

  return (
    <Section>
      <p className="font-display text-5xl font-bold text-gdg-blue">{t("points", { points })}</p>
      <div className="mt-4 flex justify-center gap-2">
        <Button asChild><Link href="/play/scan">{t("scan")}</Link></Button>
        <Button asChild variant="outline"><Link href="/play/leaderboard">{t("leaderboard")}</Link></Button>
      </div>

      <h2 className="mb-3 mt-10 text-left font-display text-xl font-bold">{t("badges")}</h2>
      {badges.length === 0 ? (
        <p className="text-left text-muted-foreground">{t("noBadges")}</p>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {badges.map((b) => {
            const has = held.has(b.id);
            return (
              <li key={b.id} className={`rounded-2xl border border-border p-3 text-center ${has ? "" : "opacity-40 grayscale"}`}>
                <div className="text-3xl">{b.icon}</div>
                <div className="mt-1 text-xs font-medium">{localized(b.name, locale)}</div>
                <div className="text-[0.65rem] text-muted-foreground">{has ? localized(b.description, locale) : t("locked")}</div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-10 rounded-2xl border border-border p-5 text-left">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} /> {t("optIn")}
        </label>
        <label className="mt-3 block text-sm">{t("displayName")}
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40}
            className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3" />
        </label>
        <Button className="mt-3" size="sm" onClick={saveProfile} disabled={optIn && !name.trim()}>{t("save")}</Button>
        {saved && <span className="ml-2 text-sm text-gdg-green">{t("saved")}</span>}
      </div>
    </Section>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto max-w-xl px-5 py-16 text-center sm:px-8"><h1 className="mb-6 font-display text-3xl font-bold tracking-tight">DevFest Quest</h1>{children}</section>;
}
