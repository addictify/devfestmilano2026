import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSponsors } from "@/lib/data/content";
import { SPONSOR_TIERS } from "@/types/models";
import { siteConfig } from "@/lib/site";
import { Container } from "@/components/common/Container";
import { PageHeader } from "@/components/common/PageHeader";
import { MotionReveal } from "@/components/common/MotionReveal";
import { Button } from "@/components/ui/button";
import { SponsorTierBlock } from "@/components/sponsors/SponsorTier";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sponsorsPage" });
  return { title: t("title"), description: t("lead") };
}

export default async function SponsorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sponsorsPage");
  const sponsors = await getSponsors();

  return (
    <>
      <PageHeader
        eyebrow="DevFest Milano 2026"
        title={t("title")}
        lead={t("lead")}
        color="blue"
      />

      <section className="py-16 sm:py-20">
        <Container className="flex max-w-5xl flex-col gap-14">
          {SPONSOR_TIERS.map((tier) => (
            <SponsorTierBlock
              key={tier}
              tier={tier}
              sponsors={sponsors.filter((s) => s.tier === tier)}
            />
          ))}
        </Container>
      </section>

      <section className="pb-24">
        <Container>
          <MotionReveal className="relative overflow-hidden rounded-card border border-border bg-paper px-7 py-12 text-center sm:px-14">
            <h2 className="mx-auto max-w-2xl text-balance text-3xl font-bold sm:text-4xl">
              {t("becomeTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
              {t("becomeBody")}
            </p>
            <Button asChild variant="accent" size="lg" className="mt-8">
              <a href={`mailto:${siteConfig.sponsorEmail}`}>
                {t("becomeCta")}
                <ArrowUpRight className="size-5" />
              </a>
            </Button>
          </MotionReveal>
        </Container>
      </section>
    </>
  );
}
