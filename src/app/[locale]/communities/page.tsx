import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { communities } from "@/lib/data/communities";
import { Container } from "@/components/common/Container";
import { PageHeader } from "@/components/common/PageHeader";
import { MotionReveal } from "@/components/common/MotionReveal";
import { CommunityCard } from "@/components/common/CommunityCard";
import { PastEventsGrid } from "@/components/common/PastEventsGrid";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "communitiesPage" });
  return { title: t("title"), description: t("lead") };
}

export default async function CommunitiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("communitiesPage");
  const tc = await getTranslations("communities");

  return (
    <>
      <PageHeader
        eyebrow="DevFest Milano 2026"
        title={t("title")}
        lead={t("lead")}
        color="green"
      />
      <section className="py-16 sm:py-20">
        <Container className="max-w-5xl">
          <div className="grid gap-5 md:grid-cols-2">
            {communities.map((community) => (
              <MotionReveal key={community.id}>
                <CommunityCard community={community} />
              </MotionReveal>
            ))}
          </div>

          <MotionReveal className="mt-16 mb-6">
            <h2 className="eyebrow text-muted-foreground">{tc("pastTitle")}</h2>
          </MotionReveal>
          <PastEventsGrid />
        </Container>
      </section>
    </>
  );
}
