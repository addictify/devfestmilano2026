import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { fontVariables } from "@/lib/fonts";
import { siteConfig } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/lib/data/settings";
import { Providers } from "@/components/providers";
import { SiteSettingsProvider } from "@/components/providers/SiteSettingsProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SkipLink } from "@/components/layout/SkipLink";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  // Fallback for the home route (and any page that doesn't set its own
  // metadata). Every other page overrides `alternates`/`openGraph` in its
  // own `generateMetadata` via `pageMetadata()` — Next merges metadata
  // shallowly, so those fields fully replace rather than extend these.
  return {
    ...pageMetadata({
      locale,
      path: "",
      title: t("title"),
      description: t("description"),
    }),
    metadataBase: new URL(siteConfig.url),
    title: {
      default: t("title"),
      template: `%s · ${siteConfig.shortName}`,
    },
    applicationName: siteConfig.name,
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: siteConfig.shortName, statusBarStyle: "default" },
    icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const settings = await getSiteSettings();

  return (
    <html lang={locale} suppressHydrationWarning className={fontVariables}>
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider>
          <Providers>
            <SiteSettingsProvider value={settings}>
              <SkipLink />
              <RegisterSW />
              <Header />
              <main id="main">{children}</main>
              <Footer />
            </SiteSettingsProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
