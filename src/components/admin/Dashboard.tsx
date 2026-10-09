"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { adminFetch } from "@/lib/admin-client";
import { AdminSectionHeader } from "./AdminSectionHeader";
import { localized } from "@/lib/localize";
import { formatTime } from "@/lib/time";
import { pct } from "@/lib/dashboard-stats";
import { BarList, DayBars, Funnel, Section, Stat, Unavailable } from "./DashboardParts";
import type { LocalizedString } from "@/types/models";

type Day = { day: string; count: number };

type Data = {
  generatedAt: string;
  subscribers: number;
  accounts: { total: number; newLast24h: number; activeLast24h: number; activeLast7d: number; signupsByDay: Day[] } | null;
  push: {
    devices: number; signedIn: number; anonymous: number; it: number; en: number;
    signedInPeople: number; reminderReady: number | null; withHistory: number; signupsByDay: Day[];
  } | null;
  pushEvents: { counts: Record<string, number>; daily: Record<string, Record<string, number>> } | null;
  announcements: number | null;
  agendas: {
    users: number; totalSaves: number; average: number;
    buckets: { label: string; count: number }[];
    top: { id: string; count: number; title: string; room: string | null; startsAt: string | null }[];
    byRoom: { room: string; count: number }[];
  } | null;
  funnel: { accounts: number; withAgenda: number; withPush: number; playing: number; rated: number } | null;
  feedbackSummary: { responses: number; raters: number; average: number; comments: number };
  feedback: { sessionId: string; title: string; room: string | null; count: number; average: number; distribution: number[]; comments: string[] }[];
  game: {
    players: number;
    scanners: number;
    thresholds: { atLeast: number; players: number }[];
    checkpoints: { id: string; name: LocalizedString; scans: number }[];
    badges: { id: string; name: LocalizedString; icon: string; holders: number }[];
    leaderboard: { displayName: string; points: number }[];
  };
};

export function Dashboard() {
  const locale = useLocale();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    return adminFetch("/api/admin/dashboard")
      .then(async (r) => (r.ok ? ((await r.json()) as Data) : Promise.reject(r.status)))
      .then((d) => { setData(d); setError(null); })
      .catch((s) => setError(`Errore (${s}).`))
      .finally(() => setLoading(false));
  }, []);

  // The first load starts as `loading`; only a manual refresh flips it back on.
  useEffect(() => { void fetchData(); }, [fetchData]);
  const load = () => { setLoading(true); void fetchData(); };

  if (error && !data) return <p className="text-sm text-gdg-red">{error}</p>;
  if (!data) return <p className="text-muted-foreground">Caricamento…</p>;

  const { accounts, push, agendas, funnel, pushEvents, game, feedbackSummary } = data;
  const ev = pushEvents?.counts ?? {};
  const prompted = ev.push_prompted ?? 0;

  return (
    <div className="flex flex-col gap-10">
      <div className="-mb-6">
        <AdminSectionHeader title="Cruscotto">
          Il riepilogo dell&apos;evento: chi ha un account, chi ha attivato le notifiche, chi si è
          costruito un&apos;agenda, chi gioca a DevFest Quest e come stanno andando le sessioni.
        </AdminSectionHeader>
        <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>Aggiornato alle {formatTime(data.generatedAt, locale)}</span>
          <button
            onClick={load}
            disabled={loading}
            className="rounded-full border border-border px-3 py-1 font-medium text-foreground hover:bg-muted disabled:opacity-60"
          >
            {loading ? "Aggiorno…" : "Aggiorna"}
          </button>
          {error && <span className="text-gdg-red">{error}</span>}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Account" value={accounts?.total ?? "—"} hint={accounts ? `${accounts.activeLast24h} attivi nelle ultime 24h` : undefined} />
        <Stat label="Notifiche attive" value={push?.devices ?? "—"} hint="dispositivi" />
        <Stat label="Agende create" value={agendas?.users ?? "—"} hint={agendas ? `${agendas.totalSaves} sessioni salvate` : undefined} />
        <Stat label="Giocatori" value={game.players} hint={`${game.scanners} hanno scansionato`} />
        <Stat label="Iscritti agli avvisi" value={data.subscribers} />
        <Stat label="Checkpoint" value={game.checkpoints.length} />
        <Stat label="Voti sessioni" value={feedbackSummary.responses} hint={feedbackSummary.responses ? `media ${feedbackSummary.average} ★` : undefined} />
        <Stat label="Annunci inviati" value={data.announcements ?? "—"} />
      </section>

      <Section
        title="Percorso degli utenti"
        note="Di tutti gli account, quanti arrivano a ogni passo. Ogni persona conta una volta per passo; i passi non sono in ordine obbligato (si può votare senza aver giocato)."
      >
        {funnel ? (
          <Funnel
            steps={[
              { label: "Hanno un account (login)", value: funnel.accounts },
              { label: "Hanno salvato almeno una sessione", value: funnel.withAgenda },
              { label: "Hanno notifiche attive con account", value: funnel.withPush },
              { label: "Hanno scansionato un checkpoint", value: funnel.playing },
              { label: "Hanno votato una sessione", value: funnel.rated },
            ]}
          />
        ) : <Unavailable />}
      </Section>

      <Section
        title="Account e accessi"
        note="Accessi con Google. «Attivi» = persone che hanno fatto login nella finestra indicata; chi resta collegato senza riaprire il sito può non comparire."
      >
        {accounts ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Nuovi, 24h" value={accounts.newLast24h} />
              <Stat label="Attivi, 24h" value={accounts.activeLast24h} hint={`${pct(accounts.activeLast24h, accounts.total)}% degli account`} />
              <Stat label="Attivi, 7 giorni" value={accounts.activeLast7d} hint={`${pct(accounts.activeLast7d, accounts.total)}% degli account`} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Nuovi account per giorno</p>
              <DayBars days={accounts.signupsByDay} />
            </div>
          </div>
        ) : <Unavailable />}
      </Section>

      <Section
        title="Notifiche"
        note="Dispositivi che hanno attivato le notifiche. Un telefono e un portatile della stessa persona contano due volte."
      >
        {push ? (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Dispositivi" value={push.devices} />
              <Stat label="Con account" value={push.signedIn} hint={`${pct(push.signedIn, push.devices)}%`} />
              <Stat label="Anonimi" value={push.anonymous} hint="solo annunci, niente promemoria" />
              <Stat label="Promemoria attivi" value={push.reminderReady ?? "—"} hint="persone con account e una sessione salvata" />
            </div>
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">Lingua</p>
                <BarList total={push.devices} rows={[{ label: "Italiano", value: push.it }, { label: "English", value: push.en }]} />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Nuovi dispositivi per giorno</p>
                <DayBars days={push.signupsByDay} />
                {push.withHistory < push.devices && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    La data è nota per {push.withHistory} dispositivi su {push.devices}: gli altri si sono iscritti prima che la registrassimo.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : <Unavailable />}

        <div className="mt-8">
          <p className="mb-1 text-sm font-medium">Cosa succede alla richiesta di permesso</p>
          <p className="mb-3 max-w-2xl text-sm text-muted-foreground">
            Contatori anonimi dal browser, attivi da quando c&apos;è questo cruscotto. Accettato + rifiutato +
            chiuso può restare sotto «richiesta mostrata» se qualcuno chiude la pagina durante la domanda.
          </p>
          {pushEvents ? (
            <div className="grid gap-8 sm:grid-cols-2">
              <BarList
                total={prompted}
                rows={[
                  { label: "Richiesta mostrata", value: prompted },
                  { label: "Accettato", value: ev.push_accepted ?? 0 },
                  { label: "Rifiutato (definitivo)", value: ev.push_denied ?? 0 },
                  { label: "Chiusa senza rispondere", value: ev.push_dismissed ?? 0 },
                ]}
              />
              <div>
                <p className="mb-2 text-xs text-muted-foreground">Dispositivi che non hanno nemmeno potuto scegliere (una volta per dispositivo)</p>
                <BarList
                  rows={[
                    { label: "Già bloccato in precedenza", value: ev.push_blocked ?? 0 },
                    { label: "iPhone/iPad: serve «Aggiungi a Home»", value: ev.push_ios_needs_install ?? 0 },
                    { label: "Browser non compatibile", value: ev.push_unsupported ?? 0 },
                  ]}
                />
              </div>
            </div>
          ) : <Unavailable />}
        </div>
      </Section>

      <Section
        title="Agende personalizzate"
        note="Chi ha salvato sessioni nella propria agenda con account. Le stelle salvate solo su un dispositivo, senza login, non sono contate."
      >
        {agendas ? (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Agende" value={agendas.users} hint={accounts ? `${pct(agendas.users, accounts.total)}% degli account` : undefined} />
              <Stat label="Sessioni salvate" value={agendas.totalSaves} />
              <Stat label="Media a persona" value={agendas.average} />
            </div>
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">Quante sessioni salva ogni persona</p>
                <BarList total={agendas.users} rows={agendas.buckets.map((b) => ({ label: b.label, value: b.count }))} />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Salvataggi per sala</p>
                <BarList total={agendas.totalSaves} rows={agendas.byRoom.map((r) => ({ label: r.room, value: r.count }))} />
              </div>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">Sessioni più salvate</p>
              <p className="mb-2 text-xs text-muted-foreground">
                Un buon indizio su quali sale rischiano di riempirsi.
              </p>
              <BarList
                rows={agendas.top.map((t) => ({
                  label: t.title,
                  value: t.count,
                  sub: [t.startsAt && formatTime(t.startsAt, locale), t.room].filter(Boolean).join(" · "),
                }))}
              />
            </div>
          </div>
        ) : <Unavailable />}
      </Section>

      <Section title="Feedback sessioni" note="Voti e commenti lasciati dai partecipanti. Sono anonimi: non è possibile risalire a chi li ha scritti.">
        <div className="mb-4 grid grid-cols-3 gap-4">
          <Stat label="Voti" value={feedbackSummary.responses} />
          <Stat label="Persone che hanno votato" value={feedbackSummary.raters} />
          <Stat label="Commenti" value={feedbackSummary.comments} />
        </div>
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
      </Section>

      <Section
        title="DevFest Quest"
        note="Chi gioca davvero: giocatori che hanno scansionato almeno 1, 3 o 5 checkpoint, su tutti quelli con un profilo di gioco."
      >
        <div className="mb-6 grid grid-cols-3 gap-4">
          {game.thresholds.map((t) => (
            <Stat key={t.atLeast} label={`Almeno ${t.atLeast} checkpoint`} value={t.players} hint={`${pct(t.players, game.players)}% dei giocatori`} />
          ))}
        </div>
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">Checkpoint — scansioni</p>
            <BarList rows={game.checkpoints.map((c) => ({ label: localized(c.name, locale), value: c.scans }))} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Badge — possessori</p>
            <BarList rows={game.badges.map((b) => ({ label: `${b.icon} ${localized(b.name, locale)}`, value: b.holders }))} />
          </div>
        </div>
      </Section>

      <Section title="Classifica (top 10)">
        <ol className="flex flex-col gap-1 text-sm">
          {game.leaderboard.map((r, i) => (
            <li key={i} className="flex justify-between border-t border-border py-1"><span>{i + 1}. {r.displayName}</span><span className="font-mono">{r.points}</span></li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
