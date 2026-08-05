import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { siteConfig } from "@/lib/site";
import type { Sponsor } from "@/types/models";
import { Container } from "@/components/common/Container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { MotionReveal } from "@/components/common/MotionReveal";
import { Button } from "@/components/ui/button";
import { SponsorWall } from "@/components/sponsors/SponsorTier";

export function SponsorsSection({ sponsors }: { sponsors: Sponsor[] }) {
  const t = useTranslations("sponsors");

  return (
    <section className="bg-paper py-20 sm:py-28" id="sponsors">
      <Container>
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          lead={t("lead")}
          color="blue"
          align="center"
        />

        {sponsors.length === 0 ? (
          <p className="mt-12 text-center text-muted-foreground">
            {t("comingSoon")}
          </p>
        ) : (
          <MotionReveal className="mt-14">
            <SponsorWall sponsors={sponsors} />
          </MotionReveal>
        )}

        <MotionReveal className="mt-14 flex justify-center">
          <Button asChild variant="outline" size="lg">
            <a href={`mailto:${siteConfig.sponsorEmail}`}>
              {t("become")}
              <ArrowUpRight className="size-5" />
            </a>
          </Button>
        </MotionReveal>
      </Container>
    </section>
  );
}
