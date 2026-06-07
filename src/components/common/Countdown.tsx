"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { GDG_ORDER, GDG } from "@/lib/design/tokens";

type Parts = { days: number; hours: number; minutes: number; seconds: number };

function compute(targetMs: number): Parts {
  const delta = Math.max(0, targetMs - Date.now());
  const s = Math.floor(delta / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

export function Countdown({ target }: { target: string }) {
  const t = useTranslations("hero");
  const targetMs = new Date(target).getTime();
  const [parts, setParts] = useState<Parts | null>(null);

  useEffect(() => {
    const tick = () => setParts(compute(targetMs));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  const isLive =
    parts !== null &&
    parts.days === 0 &&
    parts.hours === 0 &&
    parts.minutes === 0 &&
    parts.seconds === 0;

  const units: { key: keyof Parts; label: string }[] = [
    { key: "days", label: t("days") },
    { key: "hours", label: t("hours") },
    { key: "minutes", label: t("minutes") },
    { key: "seconds", label: t("seconds") },
  ];

  if (isLive) {
    return (
      <p className="font-display text-lg font-semibold text-gdg-green">
        {t("live")}
      </p>
    );
  }

  return (
    <div>
      <p className="eyebrow mb-3 text-muted-foreground">
        {t("countdownTitle")}
      </p>
      <div className="flex items-stretch gap-2 sm:gap-3" aria-live="off">
        {units.map((u, i) => {
          const value = parts ? parts[u.key] : null;
          const color = GDG[GDG_ORDER[i]];
          return (
            <div
              key={u.key}
              className="relative flex min-w-[3.75rem] flex-1 flex-col items-center rounded-2xl border border-border bg-card px-2 py-3 sm:min-w-[4.5rem]"
            >
              <span
                aria-hidden
                className="absolute left-3 top-2 size-1.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="font-mono text-3xl font-bold tabular-nums sm:text-4xl">
                {value === null ? "––" : String(value).padStart(2, "0")}
              </span>
              <span className="mt-1 font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                {u.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
