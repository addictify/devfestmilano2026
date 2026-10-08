"use client";

import { useTranslations } from "next-intl";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { GDG, GDG_ORDER } from "@/lib/design/tokens";
import { Container } from "@/components/common/Container";
import { Button } from "@/components/ui/button";
import { TicketButton } from "@/components/common/TicketButton";
import { NotifyTicketsDialog } from "@/components/common/NotifyTicketsDialog";
import { PushCallout } from "@/components/common/PushCallout";
import { Countdown } from "@/components/common/Countdown";
import { SkylineMilano } from "@/components/common/SkylineMilano";
import { AddToCalendar } from "@/components/common/AddToCalendar";
import { eventCalendarEvent } from "@/lib/event-calendar";
import { useSiteSettings } from "@/components/providers/SiteSettingsProvider";

export function Hero() {
  const t = useTranslations("hero");
  const tCal = useTranslations("calendar");
  const { ticketsAvailable, ticketsSoldOut, cfpOpen } = useSiteSettings();

  // Entrance stagger in CSS (`.rise`), not JS: it starts on first paint of the
  // server HTML instead of after hydration, which on a slow phone kept the
  // whole hero invisible for seconds.
  const rise = (i: number) => ({ "--rise-i": i }) as React.CSSProperties;
  // Two copies of the four-colour sweep side by side; translating by half
  // loops seamlessly because each copy starts and ends on blue.
  const beam = {
    backgroundImage: `linear-gradient(90deg, ${GDG.blue}, ${GDG.red}, ${GDG.yellow}, ${GDG.green}, ${GDG.blue})`,
    backgroundSize: "50% 100%",
  };
  // Soft colour fields as radial gradients. These used to be solid circles
  // under blur(90px) while drifting: the GPU re-blurred three ~500px layers
  // every frame, forever — enough to stall mid-range Android phones.
  const blob = (color: string) => ({
    // Solid core, long falloff: matches the old blurred disc's spread.
    background: `radial-gradient(closest-side, ${color} 45%, transparent)`,
  });

  const year = "2026".split("");

  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      {/* Atmosphere */}
      <div aria-hidden className="absolute inset-0 bg-dot-grid opacity-70" />
      <div aria-hidden className="absolute inset-0 bg-line-grid" />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-24 size-[34rem] rounded-full opacity-30 motion-safe:animate-[blob-drift_18s_ease-in-out_infinite]"
        style={blob(GDG.blue)}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-20 size-[26rem] rounded-full opacity-25 motion-safe:animate-[blob-drift_22s_ease-in-out_infinite_reverse]"
        style={blob(GDG.red)}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/3 size-[24rem] rounded-full opacity-20 motion-safe:animate-[blob-drift_26s_ease-in-out_infinite]"
        style={blob(GDG.green)}
      />

      <Container className="relative grid gap-12 pt-16 pb-20 lg:grid-cols-12 lg:gap-10 lg:pt-24 lg:pb-28">
        {/* Headline column */}
        <div
          className="flex flex-col lg:col-span-7"
        >
          <span
            style={rise(0)}
            className="rise eyebrow flex items-center gap-2 text-muted-foreground"
          >
            <span className="inline-flex gap-1">
              {GDG_ORDER.map((c) => (
                <span
                  key={c}
                  className="size-2 rounded-full"
                  style={{ backgroundColor: GDG[c] }}
                />
              ))}
            </span>
            {t("eyebrow")}
          </span>

          <h1
            style={rise(1)}
            aria-label={siteConfig.name}
            className="rise mt-5 text-[clamp(3rem,11vw,8rem)] font-extrabold leading-[0.9] tracking-tight"
          >
            DevFest
            <br />
            Milano{" "}
            <span className="inline-flex">
              {year.map((d, i) => (
                <span key={i} style={{ color: GDG[GDG_ORDER[i]] }}>
                  {d}
                </span>
              ))}
            </span>
          </h1>

          <div
            style={rise(2)}
            className="rise mt-7 flex flex-wrap items-center gap-3"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium">
              <CalendarDays className="size-4 text-gdg-blue" />
              {t("date")}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium">
              <MapPin className="size-4 text-gdg-red" />
              {t("city")}
            </span>
          </div>

          <p
            style={rise(3)}
            className="rise mt-6 max-w-xl text-pretty text-lg text-muted-foreground sm:text-xl"
          >
            {t("lead")}
          </p>

          <div
            style={rise(4)}
            className="rise mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
          >
            {ticketsAvailable || ticketsSoldOut ? (
              <>
                {/* Tickets open (or sold out — TicketButton becomes the badge):
                    tickets lead, CFP secondary while it's open. */}
                <TicketButton size="lg" label={t("ctaTickets")} />
                {cfpOpen && (
                  <Button asChild variant="outline" size="lg">
                    <a
                      href={siteConfig.cfpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("ctaCfp")}
                    </a>
                  </Button>
                )}
              </>
            ) : cfpOpen ? (
              <>
                {/* CFP-open phase: the live action (submit a talk) leads;
                    ticket intent is captured via the notify dialog. */}
                <Button asChild variant="accent" size="lg">
                  <a
                    href={siteConfig.cfpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("ctaCfp")}
                    <ArrowUpRight className="size-4" />
                  </a>
                </Button>
                <NotifyTicketsDialog size="lg" />
              </>
            ) : (
              /* CFP closed, tickets not on sale: nothing external to click, so
                 the notify dialog is promoted to the leading action. */
              <NotifyTicketsDialog size="lg" variant="accent" />
            )}
            <AddToCalendar event={eventCalendarEvent(tCal("eventDescription"))} variant="ghost" size="md" />
          </div>

          {/* Above the fold on purpose: on the day, the home page is where
              people land, and a prompt below the hero went unseen. */}
          <div style={rise(5)} className="rise">
            <PushCallout mini className="mt-5" />
          </div>

          {!cfpOpen && (
            <p
              style={rise(6)}
              className="rise mt-4 max-w-xl font-mono text-sm text-muted-foreground"
            >
              {t("cfpClosed")}
            </p>
          )}

          <div style={rise(7)} className="rise mt-12">
            <Countdown target={siteConfig.eventDate} />
          </div>

          {/* Compact ticket stub — mobile/tablet only; the CTAs and countdown
              above lead, this is the brand flourish that follows, not the
              full desktop panel (which starts at lg, see below). */}
          <div style={rise(8)} className="rise relative mt-8 lg:hidden">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_-30px_rgba(0,0,0,0.35)]">
              <div aria-hidden className="h-1.5 w-full overflow-hidden">
                <div
                  className="h-full w-[200%] motion-safe:animate-[marquee_6s_linear_infinite]"
                  style={beam}
                />
              </div>
              <div className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                    Save the date
                  </p>
                  <p className="mt-1 font-display text-5xl font-extrabold leading-none tracking-tighter">
                    10<span className="text-gdg-red">.</span>10
                  </p>
                  <p className="mt-1 font-mono text-sm text-muted-foreground">
                    / 2026 · Milano
                  </p>
                </div>
                <SkylineMilano className="w-28 shrink-0 bg-foreground/80" />
              </div>
              {/* ticket perforation */}
              <div
                aria-hidden
                className="absolute -left-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-background"
              />
              <div
                aria-hidden
                className="absolute -right-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-background"
              />
            </div>
          </div>
        </div>

        {/* Decorative ticket panel — desktop/tablet-wide (lg+); the compact
            stub above covers mobile. */}
        <div
          className="rise-panel relative hidden lg:col-span-5 lg:block"
        >
          <div className="relative h-full min-h-[30rem] overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_30px_80px_-40px_rgba(0,0,0,0.4)]">
            {/* animated 4-color beam */}
            <div aria-hidden className="h-2 w-full overflow-hidden">
              <div
                className="h-full w-[200%] motion-safe:animate-[marquee_6s_linear_infinite]"
                style={beam}
              />
            </div>

            {/* vertical color stripes */}
            <div aria-hidden className="absolute inset-0 flex opacity-[0.06]">
              {GDG_ORDER.map((c) => (
                <span
                  key={c}
                  className="flex-1"
                  style={{ backgroundColor: GDG[c] }}
                />
              ))}
            </div>

            <div className="relative flex h-full flex-col justify-between p-8">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Save the date
                </p>
                <p className="mt-4 font-display text-7xl font-extrabold leading-none tracking-tighter">
                  10<span className="text-gdg-red">.</span>10
                </p>
                <p className="mt-1 font-mono text-lg text-muted-foreground">
                  / 2026 · Milano
                </p>
              </div>

              <div className="relative mt-8">
                <SkylineMilano className="bg-foreground/80 motion-safe:animate-[float-slow_8s_ease-in-out_infinite]" />
              </div>
            </div>

            {/* ticket perforation */}
            <div
              aria-hidden
              className="absolute -left-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-background"
            />
            <div
              aria-hidden
              className="absolute -right-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-background"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
