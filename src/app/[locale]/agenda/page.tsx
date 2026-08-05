import type { Metadata } from "next";
import { CalendarClock, ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getSessions,
  getSpeakers,
  getTracks,
  isSchedulePublished,
} from "@/lib/data/content";
import { getSiteSettings } from "@/lib/data/settings";
import { siteConfig } from "@/lib/site";
import { formatLongDate } from "@/lib/time";
import { Container } from "@/components/common/Container";
import { PageHeader } from "@/components/common/PageHeader";
import { AgendaView } from "@/components/agenda/AgendaView";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "agendaPage" });
  return { title: t("title"), description: t("lead") };
}

export default async function AgendaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("agendaPage");

  const [sessions, tracks, speakers, published, { cfpOpen }] = await Promise.all([
    getSessions(),
    getTracks(),
    getSpeakers(),
    isSchedulePublished(),
    getSiteSettings(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow={formatLongDate(siteConfig.eventDate, locale)}
        title={t("title")}
        lead={t("lead")}
        color="green"
      />
      <section className="py-12 sm:py-16">
        <Container>
          {published ? (
            <AgendaView
              sessions={sessions}
              tracks={tracks}
              speakers={speakers}
            />
          ) : (
            <div className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-card border border-border bg-card px-6 py-16 text-center">
              <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-gdg-green/10 text-gdg-green">
                <CalendarClock className="size-7" />
              </span>
              <h2 className="font-display text-2xl font-bold tracking-tight">
                {t("comingSoonTitle")}
              </h2>
              <p className="text-pretty text-muted-foreground">
                {cfpOpen ? t("comingSoonBody") : t("comingSoonBodyClosed")}
              </p>
              <Link
                href="/speakers"
                className="group inline-flex items-center gap-2 font-medium text-gdg-green"
              >
                {t("viewSpeakers")}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
