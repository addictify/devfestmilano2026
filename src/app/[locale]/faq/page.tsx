import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/common/Container";
import { PageHeader } from "@/components/common/PageHeader";
import { FaqList } from "@/components/sections/FaqList";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faqPage" });
  return { title: t("title"), description: t("lead") };
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("faqPage");

  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} color="green" />
      <section className="py-16 sm:py-20">
        <Container className="max-w-3xl">
          <FaqList />
        </Container>
      </section>
    </>
  );
}
