import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, BadgeCheck, Briefcase, Building2, Globe } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/lib/site";
import { speakerTypes, type SpeakerTypeIcon } from "@/lib/data/speaker-types";
import { cn } from "@/lib/utils";
import { colorClasses, GDG, GDG_ORDER } from "@/lib/design/tokens";
import { localized } from "@/lib/localize";
import { MotionReveal } from "@/components/common/MotionReveal";

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
      <div className="grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
        <p className="mb-4 text-center text-sm font-semibold text-muted-foreground">
          {t("lastEditionNote", { year: le.year })}
        </p>
        <div className="grid auto-rows-fr grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border lg:grid-cols-4">
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

      {/* Points forward to the full CFP section instead of restating its
          title/lead/CTA here — that section already carries the richer
          treatment (topics, deadline, status badge). */}
      <MotionReveal className="mt-12 flex justify-center">
        {cfpOpen ? (
          <a
            href="#cfp"
            className="group inline-flex items-center gap-2 font-display text-lg font-semibold transition-colors hover:text-gdg-red"
          >
            {t("cfpPointer")}
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
          </a>
        ) : (
          <Link
            href="/agenda"
            className="group inline-flex items-center gap-2 font-display text-lg font-semibold transition-colors hover:text-gdg-red"
          >
            {t("cfpClosedCta")}
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
          </Link>
        )}
      </MotionReveal>
    </div>
  );
}
