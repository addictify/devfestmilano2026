import { useTranslations } from "next-intl";
import { ArrowUpRight, MapPin } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { Container } from "@/components/common/Container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { MotionReveal } from "@/components/common/MotionReveal";
import { Button } from "@/components/ui/button";

export function VenueSection() {
  const t = useTranslations("venue");
  const hasVenue = siteConfig.venue.name.length > 0;

  return (
    <section className="bg-paper py-20 sm:py-28" id="venue">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHeading title={t("title")} lead={t("lead")} color="red" />
            <MotionReveal className="mt-8 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 size-5 shrink-0 text-gdg-red" />
                <div>
                  <p className="font-display text-lg font-semibold">
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
              <Button asChild variant="outline" size="md" className="w-fit">
                <a
                  href={siteConfig.venue.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("directions")}
                  <ArrowUpRight className="size-4" />
                </a>
              </Button>
            </MotionReveal>
          </div>

          <MotionReveal className="relative aspect-[4/3] overflow-hidden rounded-card border border-border">
            <iframe
              title={siteConfig.venue.name}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="size-full grayscale-[0.2] contrast-[1.05]"
              src={`https://www.google.com/maps?q=${encodeURIComponent(
                siteConfig.venue.mapsQuery,
              )}&z=15&output=embed`}
            />
          </MotionReveal>
        </div>
      </Container>
    </section>
  );
}
