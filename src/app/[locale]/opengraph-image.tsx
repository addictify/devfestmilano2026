import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";
import { GDG } from "@/lib/design/tokens";

// Shared across every page in [locale] — the nearest route-specific
// opengraph-image (if one is ever added) takes precedence over this.
export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const INK = "#17150F";
const PAPER = "#FBFAF6";
const BACKGROUND_DARK = "#0F0E0C";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  const eventDate = new Date(siteConfig.eventDate).toLocaleDateString(
    locale === "it" ? "it-IT" : "en-GB",
    { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" },
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: BACKGROUND_DARK,
          backgroundImage:
            "linear-gradient(rgba(251,250,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(251,250,246,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        {/* four-color signal bar */}
        <div style={{ display: "flex", width: 220, height: 10 }}>
          {[GDG.blue, GDG.red, GDG.yellow, GDG.green].map((c) => (
            <div key={c} style={{ flex: 1, backgroundColor: c }} />
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              fontWeight: 600,
              color: GDG.yellow,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            DevFest
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              fontSize: 108,
              fontWeight: 800,
              color: PAPER,
              letterSpacing: -2,
              lineHeight: 1,
            }}
          >
            <span style={{ display: "flex" }}>Milano&nbsp;</span>
            <span style={{ display: "flex", color: GDG.blue }}>2</span>
            <span style={{ display: "flex", color: GDG.red }}>0</span>
            <span style={{ display: "flex", color: GDG.yellow }}>2</span>
            <span style={{ display: "flex", color: GDG.green }}>6</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 34,
              fontWeight: 500,
              color: PAPER,
              opacity: 0.85,
              marginTop: 28,
            }}
          >
            {eventDate} · {siteConfig.venue.name}, Milano
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: PAPER,
              opacity: 0.6,
              marginTop: 12,
            }}
          >
            {t("tagline")}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 24,
            fontWeight: 600,
            color: INK,
            backgroundColor: PAPER,
            padding: "10px 20px",
            alignSelf: "flex-start",
            borderRadius: 6,
          }}
        >
          2026.devfestmilano.it
        </div>
      </div>
    ),
    { ...size },
  );
}
