import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSiteSettings } from "@/lib/data/settings";
import { siteConfig } from "@/lib/site";
import { pageMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/common/JsonLd";
import { PageHeader } from "@/components/common/PageHeader";
import { CfpSection } from "@/components/sections/CfpSection";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cfpPage" });
  const { cfpOpen } = await getSiteSettings();
  return pageMetadata({
    locale,
    path: "/cfp",
    title: t("title"),
    description: cfpOpen ? t("lead") : t("leadClosed"),
  });
}

export default async function CfpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cfpPage");
  const { cfpOpen } = await getSiteSettings();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(locale, [{ name: t("title"), path: "/cfp" }], siteConfig.shortName)}
      />
      <PageHeader
        title={t("title")}
        lead={cfpOpen ? t("lead") : t("leadClosed")}
        color="blue"
      />
      <CfpSection cfpOpen={cfpOpen} />
    </>
  );
}
