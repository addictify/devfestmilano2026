import { setRequestLocale } from "next-intl/server";
import { getFeaturedSpeakers, getSponsors, getTracks } from "@/lib/data/content";
import { siteConfig } from "@/lib/site";
import { Hero } from "@/components/sections/Hero";
import { ThemeSection } from "@/components/sections/ThemeSection";
import { WhatToExpect } from "@/components/sections/WhatToExpect";
import { FeaturedSpeakers } from "@/components/sections/FeaturedSpeakers";
import { SpeakerTypesSection } from "@/components/sections/SpeakerTypesSection";
import { AgendaPreview } from "@/components/sections/AgendaPreview";
import { CommunitiesSection } from "@/components/sections/CommunitiesSection";
import { PastEditions } from "@/components/sections/PastEditions";
import { CfpSection } from "@/components/sections/CfpSection";
import { SponsorsSection } from "@/components/sections/SponsorsSection";
import { VenueSection } from "@/components/sections/VenueSection";
import { FaqSection } from "@/components/sections/FaqSection";

export const revalidate = 3600;

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [speakers, tracks, sponsors] = await Promise.all([
    siteConfig.speakersPublished ? getFeaturedSpeakers(8) : Promise.resolve([]),
    getTracks(),
    getSponsors(),
  ]);

  return (
    <>
      <Hero />
      <ThemeSection />
      <WhatToExpect />
      {siteConfig.speakersPublished ? (
        <FeaturedSpeakers speakers={speakers} />
      ) : (
        <SpeakerTypesSection />
      )}
      <AgendaPreview tracks={tracks} />
      <CommunitiesSection />
      <PastEditions />
      <CfpSection />
      <SponsorsSection sponsors={sponsors} />
      <VenueSection />
      <FaqSection />
    </>
  );
}
