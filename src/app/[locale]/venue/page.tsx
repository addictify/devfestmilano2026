import type { Metadata } from "next";
import { ArrowUpRight, MapPin, Train } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { siteConfig } from "@/lib/site";
import { Container } from "@/components/common/Container";
import { PageHeader } from "@/components/common/PageHeader";
import { MotionReveal } from "@/components/common/MotionReveal";
import { Button } from "@/components/ui/button";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "venuePage" });
  return { title: t("title"), description: t("lead") };
}

export default async function VenuePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("venuePage");
  const hasVenue = siteConfig.venue.name.length > 0;

  return (
    <>
      <PageHeader
        eyebrow="Milano"
        title={t("title")}
        lead={t("lead")}
        color="red"
      />
      <section className="py-16 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <MotionReveal className="flex flex-col gap-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex size-10 items-center justify-center rounded-2xl bg-gdg-red/10 text-gdg-red">
                <MapPin className="size-5" />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold tracking-tight">
                  {t("address")}
                </h2>
                <p className="mt-1 font-display text-lg font-semibold">
                  {hasVenue ? siteConfig.venue.name : t("tbd")}
                </p>
                <p className="text-muted-foreground">
                  {siteConfig.venue.address}
                </p>
                <p className="mt-0.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  {siteConfig.venue.area}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex size-10 items-center justify-center rounded-2xl bg-gdg-blue/10 text-gdg-blue">
                <Train className="size-5" />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold tracking-tight">
                  {t("gettingThere")}
                </h2>
                <p className="mt-1 text-muted-foreground">
                  {t("gettingThereBody")}
                </p>
              </div>
            </div>

            <Button asChild variant="outline" size="md" className="w-fit">
              <a
                href={siteConfig.venue.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Maps
                <ArrowUpRight className="size-4" />
              </a>
            </Button>
          </MotionReveal>

          <MotionReveal className="relative aspect-[4/3] overflow-hidden rounded-card border border-border">
            <iframe
              title={siteConfig.venue.name}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="size-full"
              src={`https://www.google.com/maps?q=${encodeURIComponent(
                siteConfig.venue.mapsQuery,
              )}&z=15&output=embed`}
            />
          </MotionReveal>
        </Container>
      </section>
    </>
  );
}
