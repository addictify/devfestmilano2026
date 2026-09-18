"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Star, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { colorClasses } from "@/lib/design/tokens";
import { localized } from "@/lib/localize";
import { formatTime } from "@/lib/time";
import { collapseServiceSessions, matchesFilters } from "@/lib/agenda";
import { useFavorites } from "@/hooks/useFavorites";
import type { Session, Speaker, Track } from "@/types/models";
import { SessionCard } from "./SessionCard";

type Lang = "all" | "it" | "en";

export function AgendaView({
  sessions,
  tracks,
  speakers,
}: {
  sessions: Session[];
  tracks: Track[];
  speakers: Speaker[];
}) {
  const t = useTranslations("agendaPage");
  const tMine = useTranslations("myschedule");
  const locale = useLocale();
  const { favorites, count: favoriteCount, ready: favoritesReady } = useFavorites();
  const [track, setTrack] = useState<string>("all");
  const [lang, setLang] = useState<Lang>("all");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const speakerById = useMemo(
    () => new Map(speakers.map((s) => [s.id, s])),
    [speakers],
  );
  const trackById = useMemo(
    () => new Map(tracks.map((tr) => [tr.id, tr])),
    [tracks],
  );

  // One break is one row, however many rooms Sessionize repeated it across.
  const schedule = useMemo(
    () => collapseServiceSessions(sessions, tracks.length),
    [sessions, tracks.length],
  );

  const filtered = useMemo(
    () =>
      schedule.filter((s) =>
        matchesFilters(s, { track, lang, onlyFavorites, favorites }),
      ),
    [schedule, track, lang, onlyFavorites, favorites],
  );

  // Service sessions always pass, so they can't stand in for a real result.
  const talkCount = filtered.filter((s) => !s.isServiceSession).length;

  // Group by start time.
  const groups = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of filtered) {
      const key = s.startsAt ?? "tba";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const hasFilters = track !== "all" || lang !== "all" || onlyFavorites;

  return (
    <div>
      {/* Filters */}
      <div className="sticky top-16 z-30 -mx-5 mb-10 border-y border-border bg-background/85 px-5 py-4 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTrack("all")}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              track === "all"
                ? "border-foreground bg-foreground text-background"
                : "border-border hover:bg-muted",
            )}
          >
            {t("allTracks")}
          </button>
          {tracks.map((tr) => {
            const c = colorClasses[tr.color];
            const active = track === tr.id;
            return (
              <button
                key={tr.id}
                onClick={() => setTrack(tr.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? cn("border-transparent", c.solidBg, c.onSolid)
                    : "border-border hover:bg-muted",
                )}
              >
                <span className={cn("size-2 rounded-full", c.bg)} />
                {localized(tr.name, locale)}
              </button>
            );
          })}

          <span className="mx-1 hidden h-6 w-px bg-border sm:block" />

          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium outline-none focus:border-gdg-blue"
            aria-label={t("allLanguages")}
          >
            <option value="all">{t("allLanguages")}</option>
            <option value="it">{t("italian")}</option>
            <option value="en">{t("english")}</option>
          </select>

          <button
            onClick={() => setOnlyFavorites((v) => !v)}
            aria-pressed={onlyFavorites}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              onlyFavorites
                ? "border-transparent bg-gdg-yellow text-foreground"
                : "border-border hover:bg-muted",
            )}
          >
            <Star
              className={cn(
                "size-3.5",
                onlyFavorites ? "fill-foreground" : "text-muted-foreground",
              )}
            />
            {t("onlyFavorites")}
            {favoritesReady && favoriteCount > 0 && (
              <span className="font-mono text-xs tabular-nums opacity-70">
                {favoriteCount}
              </span>
            )}
          </button>

          {hasFilters && (
            <button
              onClick={() => {
                setTrack("all");
                setLang("all");
                setOnlyFavorites(false);
              }}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
              {t("clear")}
            </button>
          )}

          <Link
            href="/my-schedule"
            className="ml-auto text-sm font-medium text-gdg-blue hover:underline"
          >
            {tMine("title")}
          </Link>
        </div>
      </div>

      {/* Timeline */}
      {talkCount === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-muted-foreground">
            {onlyFavorites && favoriteCount === 0
              ? t("noFavoritesYet")
              : t("noResults")}
          </p>
          {onlyFavorites && favoriteCount === 0 && (
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Star className="size-4 fill-gdg-yellow text-gdg-yellow" />
              {t("favoritesHint")}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map(([time, items]) => (
            <div key={time} className="grid gap-4 sm:grid-cols-[88px_1fr]">
              <div className="sm:pt-1">
                <span className="font-mono text-sm font-semibold tabular-nums text-muted-foreground">
                  {time === "tba" ? "TBA" : formatTime(time, locale)}
                </span>
              </div>
              <div className="grid auto-rows-fr gap-4 md:grid-cols-2">
                {items.map((session) => {
                  const isFull =
                    session.isServiceSession || items.length === 1;
                  return (
                    <div
                      key={session.id}
                      className={cn(isFull && "md:col-span-2")}
                    >
                      <SessionCard
                        session={session}
                        showTime={false}
                        track={
                          session.trackId
                            ? trackById.get(session.trackId)
                            : undefined
                        }
                        speakers={session.speakerIds
                          .map((sid) => speakerById.get(sid))
                          .filter((x): x is Speaker => Boolean(x))}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
