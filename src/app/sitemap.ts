import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";
import { getSpeakers } from "@/lib/data/content";

// Fully static — required for `output: export` (GitHub Pages), harmless otherwise.
export const dynamic = "force-static";

const STATIC_PATHS = [
  "",
  "/speakers",
  "/agenda",
  "/sponsors",
  "/team",
  "/venue",
  "/cfp",
  "/faq",
  "/communities",
  "/code-of-conduct",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const speakers = await getSpeakers();
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = [];

  // Cross-locale alternates for a given path, keyed by hreflang — including
  // `x-default` so search engines don't have to guess the un-prefixed root.
  const languagesFor = (path: string) => ({
    ...Object.fromEntries(routing.locales.map((l) => [l, `${base}/${l}${path}`])),
    "x-default": `${base}/${routing.defaultLocale}${path}`,
  });

  for (const locale of routing.locales) {
    for (const path of STATIC_PATHS) {
      entries.push({
        url: `${base}/${locale}${path}`,
        lastModified,
        changeFrequency: "weekly",
        priority: path === "" ? 1 : 0.7,
        alternates: { languages: languagesFor(path) },
      });
    }
    for (const s of speakers) {
      const path = `/speakers/${s.id}`;
      entries.push({
        url: `${base}/${locale}${path}`,
        lastModified,
        changeFrequency: "weekly",
        priority: 0.5,
        alternates: { languages: languagesFor(path) },
      });
    }
  }

  return entries;
}
