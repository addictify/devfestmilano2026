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
  "/code-of-conduct",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const speakers = await getSpeakers();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const path of STATIC_PATHS) {
      entries.push({
        url: `${base}/${locale}${path}`,
        changeFrequency: "weekly",
        priority: path === "" ? 1 : 0.7,
      });
    }
    for (const s of speakers) {
      entries.push({
        url: `${base}/${locale}/speakers/${s.id}`,
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  }

  return entries;
}
