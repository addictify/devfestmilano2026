import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Star } from "lucide-react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  getSessions,
  getSpeaker,
  getSpeakers,
  getTracks,
} from "@/lib/data/content";
import { localized } from "@/lib/localize";
import { colorClasses, colorForKey } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";
import { Container } from "@/components/common/Container";
import { Avatar } from "@/components/common/Avatar";
import { SocialLinks } from "@/components/common/SocialLinks";
import { GdgColorBar } from "@/components/common/GdgColorBar";
import { SessionCard } from "@/components/agenda/SessionCard";

export const revalidate = 3600;

export async function generateStaticParams() {
  const speakers = await getSpeakers();
  return routing.locales.flatMap((locale) =>
    speakers.map((s) => ({ locale, id: s.id })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const speaker = await getSpeaker(id);
  if (!speaker) return {};
  return {
    title: speaker.fullName,
    description: `${speaker.tagLine} — DevFest Milano 2026`,
  };
}

export default async function SpeakerDetail({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const speaker = await getSpeaker(id);
  if (!speaker) notFound();

  const requestLocale = await getLocale();
  const t = await getTranslations("speakersPage");
  const [sessions, tracks] = await Promise.all([getSessions(), getTracks()]);
  const trackById = new Map(tracks.map((tr) => [tr.id, tr]));
  const mySessions = sessions.filter((s) => s.speakerIds.includes(id));

  const color = colorForKey(speaker.id);
  const c = colorClasses[color];

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div aria-hidden className="absolute inset-0 bg-dot-grid opacity-60" />
        <Container className="relative pt-10 pb-14 sm:pt-14 sm:pb-16">
          <Link
            href="/speakers"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {t("title")}
          </Link>

          <div className="mt-8 grid gap-8 sm:grid-cols-[200px_1fr] sm:items-end">
            <Avatar
              name={speaker.fullName}
              src={speaker.profilePicture}
              className="aspect-square w-40 sm:w-full"
            />
            <div className="flex flex-col gap-3">
              {speaker.isTopSpeaker && (
                <span
                  className={cn(
                    "inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider",
                    c.text,
                  )}
                >
                  <Star className="size-3 fill-current" />
                  {t("topSpeaker")}
                </span>
              )}
              <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-6xl">
                {speaker.fullName}
              </h1>
              <p className="text-lg text-muted-foreground sm:text-xl">
                {speaker.tagLine}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {speaker.company && (
                  <span className={cn("font-medium", c.text)}>
                    {speaker.company}
                  </span>
                )}
                {speaker.country && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-4" />
                    {speaker.country}
                  </span>
                )}
              </div>
              <SocialLinks links={speaker.links} className="mt-2" />
            </div>
          </div>
        </Container>
        <GdgColorBar className="absolute inset-x-0 bottom-0" />
      </section>

      <section className="py-14 sm:py-20">
        <Container className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Bio
            </h2>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
              {localized(speaker.bio, requestLocale) || t("noBio")}
            </p>
          </div>

          {mySessions.length > 0 && (
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">
                {t("sessions")}
              </h2>
              <div className="mt-4 flex flex-col gap-4">
                {mySessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    speakers={[]}
                    track={
                      session.trackId
                        ? trackById.get(session.trackId)
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
