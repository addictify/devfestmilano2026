import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";

/**
 * Per-page metadata (canonical, hreflang, Open Graph, Twitter card).
 *
 * Next merges `metadata` objects *shallowly* across a route's segments — a
 * page that sets its own `openGraph` or `alternates` replaces the parent's
 * whole object rather than merging into it. So every page that wants a
 * correct canonical/OG URL (i.e. every page, not just the home) must build
 * its own full set here instead of inheriting the layout's — otherwise
 * every page reports the home URL as its canonical and social preview.
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: string;
  /** Locale-less path, e.g. "" for home, "/agenda", "/speakers/jane-doe". */
  path: string;
  title: string;
  description: string;
}): Metadata {
  const url = `/${locale}${path}`;
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, `/${l}${path}`]),
  ) as Record<string, string>;
  languages["x-default"] = `/${routing.defaultLocale}${path}`;

  // The shared `opengraph-image.tsx` lives in `[locale]/` — Next only
  // auto-attaches a file-convention image to pages in that *same* route
  // segment, not to nested ones (`/agenda`, `/speakers/[id]`, …). Every page
  // below home has its own `openGraph` object here anyway (shallow merge, see
  // above), so point it at the image explicitly rather than relying on
  // depth-dependent auto-detection.
  const image = `/${locale}/opengraph-image`;

  return {
    title,
    description,
    alternates: { canonical: url, languages },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title,
      description,
      locale,
      url,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

/** `BreadcrumbList` — `crumbs` excludes the site root, which is added here. */
export function breadcrumbJsonLd(
  locale: string,
  crumbs: { name: string; path: string }[],
  homeName: string,
) {
  const items = [{ name: homeName, path: "" }, ...crumbs];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteConfig.url}/${locale}${item.path}`,
    })),
  };
}

/** `Event` — the whole reason this site exists. Rendered once, on the home page. */
export function eventJsonLd(locale: string, ticketsAvailable: boolean) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: siteConfig.name,
    startDate: siteConfig.eventDate,
    endDate: siteConfig.eventEnd,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: siteConfig.venue.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: siteConfig.venue.address.split(",")[0],
        postalCode: siteConfig.venue.address.match(/\b\d{5}\b/)?.[0],
        addressLocality: "Milano",
        addressCountry: "IT",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: siteConfig.venue.lat,
        longitude: siteConfig.venue.lng,
      },
    },
    image: [`${siteConfig.url}/${locale}/opengraph-image`],
    organizer: siteConfig.communities.map((c) => ({
      "@type": "Organization",
      name: c.name,
      url: c.url,
    })),
    ...(ticketsAvailable
      ? {
          offers: {
            "@type": "Offer",
            url: siteConfig.ticketsUrl,
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
    url: `${siteConfig.url}/${locale}`,
  };
}

/** `FAQPage` — built from the same items rendered by `FaqList`, so it never drifts. */
export function faqJsonLd(
  items: { q: string; a: string; aClosed?: string }[],
  cfpOpen: boolean,
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: !cfpOpen && item.aClosed ? item.aClosed : item.a,
      },
    })),
  };
}

/** `Person` — one per speaker detail page. */
export function personJsonLd(
  locale: string,
  speaker: {
    id: string;
    fullName: string;
    tagLine: string;
    profilePicture: string | null;
    company?: string;
    links: { url: string }[];
  },
) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: speaker.fullName,
    jobTitle: speaker.tagLine || undefined,
    worksFor: speaker.company
      ? { "@type": "Organization", name: speaker.company }
      : undefined,
    image: speaker.profilePicture ?? undefined,
    url: `${siteConfig.url}/${locale}/speakers/${speaker.id}`,
    sameAs: speaker.links.map((l) => l.url),
  };
}
