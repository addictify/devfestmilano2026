import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { codeOfConduct } from "@/lib/data/code-of-conduct";
import { localized } from "@/lib/localize";
import { Container } from "@/components/common/Container";
import { PageHeader } from "@/components/common/PageHeader";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cocPage" });
  return { title: t("title"), description: t("lead") };
}

export default async function CodeOfConductPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cocPage");
  const requestLocale = await getLocale();

  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} color="red" />
      <section className="py-16 sm:py-20">
        <Container className="max-w-3xl">
          <div className="flex flex-col gap-10">
            {codeOfConduct.map((section, i) => (
              <div key={i} className="flex flex-col gap-3">
                <h2 className="flex items-baseline gap-3 font-display text-2xl font-bold tracking-tight">
                  <span className="font-mono text-sm text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {localized(section.heading, requestLocale)}
                </h2>
                <p className="text-pretty leading-relaxed text-muted-foreground">
                  {localized(section.body, requestLocale)}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
