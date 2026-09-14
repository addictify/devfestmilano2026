import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { getTeam } from "@/lib/data/content";
import { localized } from "@/lib/localize";
import { siteConfig } from "@/lib/site";
import { pageMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/common/JsonLd";
import { Container } from "@/components/common/Container";
import { PageHeader } from "@/components/common/PageHeader";
import { MotionReveal } from "@/components/common/MotionReveal";
import { Avatar } from "@/components/common/Avatar";
import { SocialLinks } from "@/components/common/SocialLinks";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "teamPage" });
  return pageMetadata({ locale, path: "/team", title: t("title"), description: t("lead") });
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("teamPage");
  const requestLocale = await getLocale();
  const team = await getTeam();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(locale, [{ name: t("title"), path: "/team" }], siteConfig.shortName)}
      />
      <PageHeader
        eyebrow="GDG Cloud Milano & GDG Milano"
        title={t("title")}
        lead={t("lead")}
        color="yellow"
      />
      <section className="py-16 sm:py-20">
        <Container>
          {team.length === 0 ? (
            <p className="text-center text-muted-foreground">
              {t("comingSoon")}
            </p>
          ) : (
            <div className="grid auto-rows-fr grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {team.map((member, i) => (
                <MotionReveal
                  key={member.id}
                  delay={(i % 4) * 0.05}
                  className="flex flex-col gap-4 rounded-card border border-border bg-card p-5"
                >
                  <Avatar
                    name={member.name}
                    src={member.photo}
                    className="aspect-square w-full"
                  />
                  <div className="flex flex-col gap-0.5">
                    <h3 className="font-display text-lg font-bold tracking-tight">
                      {member.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {localized(member.role, requestLocale)}
                    </p>
                  </div>
                  <SocialLinks links={member.links} />
                </MotionReveal>
              ))}
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
