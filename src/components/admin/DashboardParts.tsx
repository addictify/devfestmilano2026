import type { ReactNode } from "react";
import { pct } from "@/lib/dashboard-stats";

/** One headline number. `hint` says what it is made of, in muted ink. */
export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border p-4 text-center">
      <p className="font-display text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** A section's title and the one line that says what the numbers mean. */
export function Section({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return (
    <section>
      <h2 className="mb-1 font-display text-lg font-bold">{title}</h2>
      {note && <p className="mb-3 max-w-2xl text-sm text-muted-foreground">{note}</p>}
      {!note && <div className="mb-3" />}
      {children}
    </section>
  );
}

export function Unavailable() {
  return (
    <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
      Dati non disponibili: la lettura è fallita. Riprova con Aggiorna; se persiste, controlla i log
      della funzione.
    </p>
  );
}

/**
 * Horizontal bars, one row per item. The count and (optionally) the share sit
 * in ink beside the bar, so no value depends on colour or on hovering.
 */
export function BarList({
  rows,
  total,
  empty = "Ancora nessun dato.",
}: {
  rows: { label: ReactNode; value: number; sub?: string }[];
  /** Share base; omit to show only the count. */
  total?: number;
  empty?: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {rows.map((r, i) => (
        <li key={i}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate">
              {r.label}
              {r.sub && <span className="ml-2 text-xs text-muted-foreground">{r.sub}</span>}
            </span>
            <span className="shrink-0 font-mono tabular-nums">
              {r.value}
              {total !== undefined && (
                <span className="ml-1.5 text-xs text-muted-foreground">{pct(r.value, total)}%</span>
              )}
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-muted" role="presentation">
            <div
              className="h-2 rounded-r-[4px] rounded-l-full bg-gdg-blue"
              style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Counts per calendar day, oldest first. Every bar carries its own number. */
export function DayBars({ days }: { days: { day: string; count: number }[] }) {
  if (days.length === 0) return <p className="text-sm text-muted-foreground">Ancora nessun dato.</p>;
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div className="flex items-end gap-1.5 overflow-x-auto pb-1" role="list" aria-label="Per giorno">
      {days.map((d) => (
        <div key={d.day} role="listitem" className="flex min-w-9 flex-1 flex-col items-center gap-1 text-xs">
          <span className="font-mono tabular-nums">{d.count}</span>
          <div
            className="w-full max-w-9 rounded-t-[4px] bg-gdg-blue"
            style={{ height: `${Math.max(4, (d.count / max) * 96)}px` }}
          />
          <span className="text-muted-foreground">{d.day.slice(8, 10)}/{d.day.slice(5, 7)}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Steps of a journey, each bar scaled to the first. The second number is the
 * share of the step before, which is where the drop is.
 */
export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const top = Math.max(1, steps[0]?.value ?? 0);
  return (
    <ol className="flex flex-col gap-3 text-sm">
      {steps.map((s, i) => (
        <li key={s.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span>{s.label}</span>
            <span className="font-mono tabular-nums">
              {s.value}
              {i > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {pct(s.value, steps[i - 1].value)}% del passo prima · {pct(s.value, top)}% del totale
                </span>
              )}
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-muted" role="presentation">
            <div
              className="h-2 rounded-r-[4px] rounded-l-full bg-gdg-blue"
              style={{ width: `${Math.max(2, (s.value / top) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
