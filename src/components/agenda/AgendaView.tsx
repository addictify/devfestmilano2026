"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { colorClasses } from "@/lib/design/tokens";
import { localized } from "@/lib/localize";
import { formatTime } from "@/lib/time";
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
  const locale = useLocale();
  const [track, setTrack] = useState<string>("all");
  const [lang, setLang] = useState<Lang>("all");

  const speakerById = useMemo(
    () => new Map(speakers.map((s) => [s.id, s])),
    [speakers],
  );
  const trackById = useMemo(
    () => new Map(tracks.map((tr) => [tr.id, tr])),
    [tracks],
  );

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (s.isServiceSession) return track === "all" && lang === "all";
      if (track !== "all" && s.trackId !== track) return false;
      if (lang !== "all" && s.language !== lang) return false;
      return true;
    });
  }, [sessions, track, lang]);

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

  const hasFilters = track !== "all" || lang !== "all";

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

          {hasFilters && (
            <button
              onClick={() => {
                setTrack("all");
                setLang("all");
              }}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
              {t("clear")}
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      {groups.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          {t("noResults")}
        </p>
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
