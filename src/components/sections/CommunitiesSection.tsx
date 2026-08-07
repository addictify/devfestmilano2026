import { useTranslations } from "next-intl";
import { communities } from "@/lib/data/communities";
import { Container } from "@/components/common/Container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { MotionReveal } from "@/components/common/MotionReveal";
import { CommunityCard } from "@/components/common/CommunityCard";
import { PastEventsGrid } from "@/components/common/PastEventsGrid";

export function CommunitiesSection() {
  const t = useTranslations("communities");

  return (
    <section className="py-20 sm:py-28" id="communities">
      <Container>
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          lead={t("lead")}
          color="green"
        />
        <div className="mt-12 grid auto-rows-fr gap-5 md:grid-cols-2">
          {communities.map((community, i) => (
            <MotionReveal key={community.id} delay={i * 0.08}>
              <CommunityCard community={community} />
            </MotionReveal>
          ))}
        </div>

        <MotionReveal className="mt-16 mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {t("pastTitle")}
          </h3>
        </MotionReveal>
        <PastEventsGrid />
      </Container>
    </section>
  );
}
