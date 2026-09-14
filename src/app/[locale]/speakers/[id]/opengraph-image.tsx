import { ImageResponse } from "next/og";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";
import { GDG } from "@/lib/design/tokens";
import { getSpeaker, getSpeakers } from "@/lib/data/content";

// More specific than [locale]/opengraph-image.tsx, so it wins for every
// /speakers/[id] page — a personal card (photo, name, talk topic) reads far
// better shared than the generic event banner every other page gets.
export const alt = "Speaker card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateStaticParams() {
  const speakers = await getSpeakers();
  return routing.locales.flatMap((locale) =>
    speakers.map((s) => ({ locale, id: s.id })),
  );
}

const INK = "#17150F";
const PAPER = "#FBFAF6";
const BACKGROUND_DARK = "#0F0E0C";

/** Sessionize avatars aren't same-origin, so satori can't just fetch() the
 *  `src` itself at render time — pull it in as a data URI ourselves, and
 *  degrade to an initial-letter avatar rather than failing the build if the
 *  CDN hiccups. */
async function photoDataUri(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const type = res.headers.get("content-type") ?? "image/jpeg";
    return `data:${type};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const speaker = await getSpeaker(id);
  const photo = await photoDataUri(speaker?.profilePicture ?? null);

  const name = speaker?.fullName ?? siteConfig.name;
  const tagLine = speaker?.tagLine ?? "";
  const meta = [speaker?.company, speaker?.country].filter(Boolean).join(" · ");

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
        <div style={{ display: "flex", width: 220, height: 10 }}>
          {[GDG.blue, GDG.red, GDG.yellow, GDG.green].map((c) => (
            <div key={c} style={{ flex: 1, backgroundColor: c }} />
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          {photo ? (
            <img
              src={photo}
              alt=""
              width={280}
              height={280}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
                border: `6px solid ${PAPER}`,
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                width: 280,
                height: 280,
                borderRadius: "50%",
                backgroundColor: GDG.blue,
                alignItems: "center",
                justifyContent: "center",
                fontSize: 120,
                fontWeight: 800,
                color: PAPER,
              }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
            <div
              style={{
                display: "flex",
                fontSize: 26,
                fontWeight: 600,
                color: GDG.yellow,
                letterSpacing: 2,
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Speaker · {siteConfig.name}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 62,
                fontWeight: 800,
                color: PAPER,
                letterSpacing: -1,
                lineHeight: 1.05,
              }}
            >
              {name}
            </div>
            {tagLine && (
              <div
                style={{
                  display: "flex",
                  fontSize: 28,
                  color: PAPER,
                  opacity: 0.85,
                  marginTop: 16,
                }}
              >
                {tagLine}
              </div>
            )}
            {meta && (
              <div style={{ display: "flex", fontSize: 22, color: GDG.green, marginTop: 10 }}>
                {meta}
              </div>
            )}
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
          2026.devfestmilano.it/speakers
        </div>
      </div>
    ),
    { ...size },
  );
}
