import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Speaker } from "@/types/models";
import { Container } from "@/components/common/Container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { MotionReveal } from "@/components/common/MotionReveal";
import { SpeakerCard } from "@/components/speakers/SpeakerCard";

export function FeaturedSpeakers({ speakers }: { speakers: Speaker[] }) {
  const t = useTranslations("featuredSpeakers");

  return (
    <section className="bg-paper py-20 sm:py-28" id="speakers">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={t("title")}
            lead={t("lead")}
            color="red"
          />
          <MotionReveal>
            <Link
              href="/speakers"
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium transition-colors hover:border-foreground/30"
            >
              {t("viewAll")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </MotionReveal>
        </div>

        {speakers.length === 0 ? (
          <p className="mt-12 text-muted-foreground">{t("comingSoon")}</p>
        ) : (
          <div className="mt-12 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {speakers.map((speaker, i) => (
              <MotionReveal key={speaker.id} delay={(i % 4) * 0.06}>
                <SpeakerCard speaker={speaker} />
              </MotionReveal>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
