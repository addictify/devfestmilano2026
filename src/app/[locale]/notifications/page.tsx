import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/common/Container";
import { PageHeader } from "@/components/common/PageHeader";
import { PushCallout } from "@/components/common/PushCallout";
import { NotificationsList } from "@/components/notifications/NotificationsList";

// Announcements are a live feed, not content worth a search result.
export const metadata: Metadata = { robots: { index: false } };

export default async function NotificationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("notifications");
  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} color="yellow" />
      <section className="py-12 sm:py-16">
        <Container className="max-w-3xl">
          <PushCallout className="mb-10" />
          {/* useSearchParams (the tapped notification's id) needs a boundary
              to prerender on the static export. */}
          <Suspense>
            <NotificationsList />
          </Suspense>
        </Container>
      </section>
    </>
  );
}
