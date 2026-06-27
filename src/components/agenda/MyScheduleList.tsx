"use client";

import { useTranslations } from "next-intl";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "@/i18n/navigation";
import { SessionCard } from "@/components/agenda/SessionCard";
import type { Session, Speaker, Track } from "@/types/models";

export function MyScheduleList({
  sessions,
  speakers,
  tracks,
}: {
  sessions: Session[];
  speakers: Speaker[];
  tracks: Track[];
}) {
  const { favorites, count, ready } = useFavorites();
  const { user, enabled } = useAuth();
  const t = useTranslations("myschedule");

  const mine = sessions
    .filter((s) => favorites.has(s.id))
    .sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));

  return (
    <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <h1 className="font-display text-4xl font-bold tracking-tight">{t("title")}</h1>
      {ready && <p className="mt-2 text-muted-foreground">{t("count", { count })}</p>}

      {enabled && !user && (
        <p className="mt-4 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm">
          {t("signInNudge")}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-4">
        {mine.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
            <p className="text-muted-foreground">{t("empty")}</p>
            <Link href="/agenda" className="mt-3 inline-block font-medium text-gdg-blue hover:underline">
              {t("browse")}
            </Link>
          </div>
        ) : (
          mine.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              speakers={speakers.filter((sp) => s.speakerIds.includes(sp.id))}
              track={tracks.find((tr) => tr.id === s.trackId)}
            />
          ))
        )}
      </div>
    </section>
  );
}
