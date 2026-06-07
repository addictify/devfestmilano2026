import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { siteConfig } from "@/lib/site";
import { getSpeakers } from "@/lib/data/content";
import { Container } from "@/components/common/Container";
import { PageHeader } from "@/components/common/PageHeader";
import { SpeakerDirectory } from "@/components/speakers/SpeakerDirectory";
import { SpeakerTypesContent } from "@/components/sections/SpeakerTypesContent";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "speakersPage" });
  return { title: t("title"), description: t("lead") };
}

export default async function SpeakersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("speakersPage");
  const tt = await getTranslations("speakerTypes");

  const published = siteConfig.speakersPublished;
  const speakers = published ? await getSpeakers() : [];

  return (
    <>
      <PageHeader
        eyebrow={published ? "DevFest Milano 2026" : tt("eyebrow")}
        title={t("title")}
        lead={published ? t("lead") : tt("lead")}
        color="red"
      />
      <section className="py-16 sm:py-20">
        <Container>
          {published ? (
            speakers.length ? (
              <SpeakerDirectory speakers={speakers} />
            ) : (
              <p className="text-center text-muted-foreground">
                {t("comingSoon")}
              </p>
            )
          ) : (
            <SpeakerTypesContent />
          )}
        </Container>
      </section>
    </>
  );
}
