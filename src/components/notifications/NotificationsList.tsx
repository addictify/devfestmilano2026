"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { BellRing, RotateCw } from "lucide-react";
import { apiUrl } from "@/lib/api-base";
import { formatTime } from "@/lib/time";
import { localizeAnnouncement, type PublicAnnouncement } from "@/lib/push/announcements";
import { cn } from "@/lib/utils";

type State =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; items: PublicAnnouncement[] };

/**
 * Every announcement the organizers sent, newest first. A tapped push lands
 * here with `?id=`: that one is marked and scrolled to, so the full text is
 * readable even when the lock screen cut it short.
 */
export function NotificationsList() {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const selectedId = useSearchParams().get("id");
  const [state, setState] = useState<State>({ kind: "loading" });
  const selectedRef = useRef<HTMLLIElement>(null);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch(apiUrl("/api/announcements"), { cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean; announcements?: PublicAnnouncement[] };
      if (!res.ok || !data.ok) throw new Error(String(res.status));
      setState({ kind: "ready", items: data.announcements ?? [] });
    } catch {
      setState({ kind: "error" });
    }
  }, []);

  // Fetching on mount is the external system this effect exists for.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void load(), [load]);

  useEffect(() => {
    if (state.kind === "ready") selectedRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [state.kind]);

  if (state.kind === "loading") {
    return <p className="text-muted-foreground">{t("loading")}</p>;
  }

  if (state.kind === "error") {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground">{t("error")}</p>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <RotateCw className="size-4" />
          {t("retry")}
        </button>
      </div>
    );
  }

  if (state.items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
        {t("empty")}
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-4">
      {state.items.map((a) => {
        const { title, body } = localizeAnnouncement(a, locale);
        const selected = a.id === selectedId;
        return (
          <li
            key={a.id}
            ref={selected ? selectedRef : undefined}
            aria-current={selected ? "true" : undefined}
            className={cn(
              "scroll-mt-24 rounded-2xl border bg-card px-5 py-5 sm:px-6",
              selected ? "border-gdg-yellow ring-2 ring-gdg-yellow/40" : "border-border",
            )}
          >
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <BellRing className="size-3.5" />
              {a.sentAt ? <time dateTime={a.sentAt}>{formatTime(a.sentAt, locale)}</time> : t("justNow")}
            </div>
            <h2 className="mt-2 font-display text-xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-2 whitespace-pre-line text-pretty text-foreground/80">{body}</p>
          </li>
        );
      })}
    </ol>
  );
}
