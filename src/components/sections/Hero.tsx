"use client";

import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { GDG, GDG_ORDER } from "@/lib/design/tokens";
import { Container } from "@/components/common/Container";
import { Button } from "@/components/ui/button";
import { TicketButton } from "@/components/common/TicketButton";
import { NotifyTicketsDialog } from "@/components/common/NotifyTicketsDialog";
import { Countdown } from "@/components/common/Countdown";
import { SkylineMilano } from "@/components/common/SkylineMilano";
import { AddToCalendar } from "@/components/common/AddToCalendar";
import { eventCalendarEvent } from "@/lib/event-calendar";
import { useSiteSettings } from "@/components/providers/SiteSettingsProvider";

export function Hero() {
  const t = useTranslations("hero");
  const tCal = useTranslations("calendar");
  const reduce = useReducedMotion();
  const { ticketsAvailable } = useSiteSettings();

  const container = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduce ? 0 : 0.08, delayChildren: 0.05 },
    },
  };
  const item = reduce
    ? { hidden: {}, show: {} }
    : {
        hidden: { opacity: 0, y: 22 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
        },
      };

  const year = "2026".split("");

  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      {/* Atmosphere */}
      <div aria-hidden className="absolute inset-0 bg-dot-grid opacity-70" />
      <div aria-hidden className="absolute inset-0 bg-line-grid" />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-24 size-[34rem] rounded-full opacity-30 blur-[90px] motion-safe:animate-[blob-drift_18s_ease-in-out_infinite]"
        style={{ background: GDG.blue }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-20 size-[26rem] rounded-full opacity-25 blur-[90px] motion-safe:animate-[blob-drift_22s_ease-in-out_infinite_reverse]"
        style={{ background: GDG.red }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/3 size-[24rem] rounded-full opacity-20 blur-[90px] motion-safe:animate-[blob-drift_26s_ease-in-out_infinite]"
        style={{ background: GDG.green }}
      />

      <Container className="relative grid gap-12 pt-16 pb-20 lg:grid-cols-12 lg:gap-10 lg:pt-24 lg:pb-28">
        {/* Headline column */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col lg:col-span-7"
        >
          <motion.span
            variants={item}
            className="eyebrow flex items-center gap-2 text-muted-foreground"
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
          </motion.span>

          <motion.h1
            variants={item}
            className="mt-5 text-[clamp(3rem,11vw,8rem)] font-extrabold leading-[0.9] tracking-tight"
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
          </motion.h1>

          <motion.div
            variants={item}
            className="mt-7 flex flex-wrap items-center gap-3"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium">
              <CalendarDays className="size-4 text-gdg-blue" />
              {t("date")}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium">
              <MapPin className="size-4 text-gdg-red" />
              {t("city")}
            </span>
          </motion.div>

          <motion.p
            variants={item}
            className="mt-6 max-w-xl text-pretty text-lg text-muted-foreground sm:text-xl"
          >
            {t("lead")}
          </motion.p>

          <motion.div
            variants={item}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
          >
            {ticketsAvailable ? (
              <>
                {/* Tickets on sale: tickets lead, CFP secondary. */}
                <TicketButton size="lg" label={t("ctaTickets")} />
                <Button asChild variant="outline" size="lg">
                  <a
                    href={siteConfig.cfpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("ctaCfp")}
                  </a>
                </Button>
              </>
            ) : (
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
            )}
            <AddToCalendar event={eventCalendarEvent(tCal("eventDescription"))} variant="ghost" size="md" />
          </motion.div>

          <motion.div variants={item} className="mt-12">
            <Countdown target={siteConfig.eventDate} />
          </motion.div>
        </motion.div>

        {/* Decorative ticket panel */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.96, y: 20 }}
          animate={reduce ? {} : { opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative hidden lg:col-span-5 lg:block"
        >
          <div className="relative h-full min-h-[30rem] overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_30px_80px_-40px_rgba(0,0,0,0.4)]">
            {/* animated 4-color beam */}
            <div
              aria-hidden
              className="h-2 w-full motion-safe:animate-[beam-shimmer_6s_linear_infinite]"
              style={{
                backgroundImage: `linear-gradient(90deg, ${GDG.blue}, ${GDG.red}, ${GDG.yellow}, ${GDG.green}, ${GDG.blue})`,
                backgroundSize: "200% 100%",
              }}
            />

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
        </motion.div>
      </Container>
    </section>
  );
}
