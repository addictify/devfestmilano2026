"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { BellRing, RotateCw } from "lucide-react";
import { formatTime } from "@/lib/time";
import { localizeAnnouncement } from "@/lib/push/announcements";
import { markAnnouncementsSeen, refreshAnnouncements, useAnnouncements } from "@/hooks/useAnnouncements";
import { cn } from "@/lib/utils";

/**
 * Every announcement the organizers sent, newest first. A tapped push lands
 * here with `?id=`: that one is marked and scrolled to, so the full text is
 * readable even when the lock screen cut it short.
 */
export function NotificationsList() {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const selectedId = useSearchParams().get("id");
  const { status, items } = useAnnouncements();
  const selectedRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (status !== "ready") return;
    // Reading the page is reading them: clears the dot on the header bell.
    markAnnouncementsSeen();
    selectedRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [status, items]);

  if (status === "idle" || status === "loading") {
    return <p className="text-muted-foreground">{t("loading")}</p>;
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground">{t("error")}</p>
        <button
          onClick={() => void refreshAnnouncements(0)}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <RotateCw className="size-4" />
          {t("retry")}
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
        {t("empty")}
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-4">
      {items.map((a) => {
        const { title, body } = localizeAnnouncement(a, locale);
        const selected = a.id === selectedId;
        return (
          <li
            key={a.id}
            ref={selected ? selectedRef : undefined}
            aria-current={selected ? "true" : undefined}
            className={cn(
              "min-w-0 scroll-mt-24 rounded-2xl border bg-card px-5 py-5 sm:px-6",
              selected ? "border-gdg-yellow ring-2 ring-gdg-yellow/40" : "border-border",
            )}
          >
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <BellRing className="size-3.5" />
              {a.sentAt ? <time dateTime={a.sentAt}>{formatTime(a.sentAt, locale)}</time> : t("justNow")}
            </div>
            {/* wrap-anywhere: organizer copy can hold a long URL or an
                unbroken string, which would otherwise run off the card. */}
            <h2 className="mt-2 font-display text-xl font-semibold tracking-tight wrap-anywhere">{title}</h2>
            <p className="mt-2 whitespace-pre-line text-pretty text-foreground/80 wrap-anywhere">{body}</p>
          </li>
        );
      })}
    </ol>
  );
}
