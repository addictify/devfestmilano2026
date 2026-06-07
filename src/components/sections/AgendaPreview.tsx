import { useLocale, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { colorClasses } from "@/lib/design/tokens";
import { localized } from "@/lib/localize";
import type { Track } from "@/types/models";
import { Container } from "@/components/common/Container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { MotionReveal } from "@/components/common/MotionReveal";

export function AgendaPreview({ tracks }: { tracks: Track[] }) {
  const t = useTranslations("agendaPreview");
  const locale = useLocale();

  return (
    <section className="py-20 sm:py-28" id="agenda">
      <Container>
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          lead={t("lead")}
          color="green"
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tracks.map((track, i) => {
            const c = colorClasses[track.color];
            return (
              <MotionReveal
                key={track.id}
                delay={i * 0.07}
                className="group relative flex flex-col justify-between overflow-hidden rounded-card border border-border bg-card p-6 transition-all hover:-translate-y-1"
              >
                <span className={cn("absolute inset-x-0 top-0 h-1", c.bg)} />
                <span
                  className={cn(
                    "font-mono text-xs uppercase tracking-widest",
                    c.text,
                  )}
                >
                  Track {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-10 font-display text-2xl font-bold leading-tight tracking-tight">
                  {localized(track.name, locale)}
                </h3>
              </MotionReveal>
            );
          })}
        </div>

        <MotionReveal className="mt-10">
          <Link
            href="/agenda"
            className="group inline-flex items-center gap-2 font-display text-lg font-semibold transition-colors hover:text-gdg-green"
          >
            {t("viewAll")}
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </MotionReveal>
      </Container>
    </section>
  );
}
