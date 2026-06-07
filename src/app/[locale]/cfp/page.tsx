import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
  return { title: t("title"), description: t("lead") };
}

export default async function CfpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cfpPage");

  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} color="blue" />
      <CfpSection />
    </>
  );
}
