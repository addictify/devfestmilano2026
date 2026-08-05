import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, ArrowUpRight, BadgeCheck, Briefcase, Building2, Globe } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/lib/site";
import { speakerTypes, type SpeakerTypeIcon } from "@/lib/data/speaker-types";
import { cn } from "@/lib/utils";
import { colorClasses, GDG, GDG_ORDER } from "@/lib/design/tokens";
import { localized } from "@/lib/localize";
import { MotionReveal } from "@/components/common/MotionReveal";
import { Button } from "@/components/ui/button";

const ICONS: Record<SpeakerTypeIcon, typeof Globe> = {
  googler: Building2,
  gde: BadgeCheck,
  professional: Briefcase,
  international: Globe,
};

export function SpeakerTypesContent({ cfpOpen }: { cfpOpen: boolean }) {
  const t = useTranslations("speakerTypes");
  const locale = useLocale();
  const le = siteConfig.lastEdition;

  const stats = [
    { value: le.attendees, label: t("statAttendees") },
    { value: le.speakers, label: t("statSpeakers") },
    { value: le.sessions, label: t("statSessions") },
    { value: le.tracks, label: t("statTracks") },
  ];

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {speakerTypes.map((st, i) => {
          const c = colorClasses[st.color];
          const Icon = ICONS[st.icon];
          return (
            <MotionReveal
              key={st.id}
              delay={(i % 4) * 0.07}
              className="flex flex-col gap-4 rounded-card border border-border bg-card p-7"
            >
              <span
                className={cn(
                  "inline-flex size-12 items-center justify-center rounded-2xl",
                  c.bgSoft,
                  c.text,
                )}
              >
                <Icon className="size-6" />
              </span>
              <h3 className="font-display text-lg font-bold tracking-tight">
                {localized(st.title, locale)}
              </h3>
              <p className="text-sm text-muted-foreground">
                {localized(st.description, locale)}
              </p>
            </MotionReveal>
          );
        })}
      </div>

      {/* Last edition in numbers */}
      <MotionReveal className="mt-12">
        <p className="eyebrow mb-4 text-center text-muted-foreground">
          {t("lastEditionNote", { year: le.year })}
        </p>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border lg:grid-cols-4">
          {stats.map((s, i) => (
            <div key={s.label} className="flex flex-col gap-1 bg-card p-6">
              <span
                className="font-display text-4xl font-extrabold tracking-tight"
                style={{ color: GDG[GDG_ORDER[i]] }}
              >
                {s.value}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </MotionReveal>

      {/* CFP call-to-action — swaps to the "in selection" status once the CFP
          closes: there is nothing left to submit to. */}
      <MotionReveal className="mt-12 flex flex-col items-center gap-4 text-center">
        <h3 className="text-balance font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {cfpOpen ? t("cfpTitle") : t("cfpClosedTitle")}
        </h3>
        <p className="max-w-md text-pretty text-muted-foreground">
          {cfpOpen ? t("cfpLead") : t("cfpClosedLead")}
        </p>
        <Button asChild variant="accent" size="lg" className="mt-2">
          {cfpOpen ? (
            <a
              href={siteConfig.cfpUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("cfpCta")}
              <ArrowUpRight className="size-5" />
            </a>
          ) : (
            <Link href="/agenda">
              {t("cfpClosedCta")}
              <ArrowRight className="size-5" />
            </Link>
          )}
        </Button>
      </MotionReveal>
    </div>
  );
}
