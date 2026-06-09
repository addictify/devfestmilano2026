import type { GdgColor } from "@/lib/design/tokens";

// Central event configuration. Values can be overridden by env vars now and,
// later, by the Firestore `config/site` document loaded at request time.

export const siteConfig = {
  name: "DevFest Milano 2026",
  shortName: "DevFest Milano",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://devfestmilano.it",

  /** Event start — 10 October 2026, 09:00 Europe/Rome (CEST, +02:00). */
  eventDate: "2026-10-10T09:00:00+02:00",
  eventEnd: "2026-10-10T19:00:00+02:00",

  /** Call for Speakers (Sessionize). */
  cfpUrl:
    process.env.NEXT_PUBLIC_CFP_URL ??
    "https://sessionize.com/devfest-milano-2026",
  cfpDeadline: "2026-07-31T23:59:59+02:00",

  /** Tickets / registration (Bevy — GDG Community Platform). */
  ticketsUrl:
    process.env.NEXT_PUBLIC_TICKETS_URL ?? "https://gdg.community.dev/gdg-milano/",
  /** Tickets are not on sale yet — CTAs render disabled until this is true. */
  ticketsAvailable: false,

  /** CFP still open → no confirmed speakers / schedule yet. Flip to true to
   *  surface the real speaker directory and agenda grid. */
  speakersPublished: false,
  schedulePublished: false,

  /** Last edition (2025) in numbers — social proof while the CFP is open. */
  lastEdition: {
    year: 2025,
    attendees: "300",
    speakers: "20+",
    sessions: "20+",
    tracks: "3",
  },

  /** Become-a-sponsor contact. */
  sponsorEmail: "sponsor@gdgmilano.it",

  /** DevFest Milano is organized jointly by two GDG communities. */
  communities: [
    {
      id: "gdg-cloud-milano",
      name: "GDG Cloud Milano",
      url: "https://gdg.community.dev/gdg-cloud-milano/",
      meetup: "https://www.meetup.com/gdg-cloud-milano/",
      color: "green" as GdgColor,
    },
    {
      id: "gdg-milano",
      name: "GDG Milano",
      url: "https://gdg.community.dev/gdg-milano/",
      meetup: "https://www.meetup.com/gdg-milano/",
      color: "blue" as GdgColor,
    },
  ],

  venue: {
    name: "Randstad Box",
    address: "Via San Vigilio 5, 20142 Milano",
    area: "Famagosta · M2",
    mapsQuery: "Randstad Box, Via San Vigilio 5, Milano",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=Randstad+Box+Via+San+Vigilio+5+Milano",
    lat: 45.4337,
    lng: 9.1672,
  },

  social: {
    instagram: "https://www.instagram.com/gdgmilano/",
    x: "https://x.com/gdgmilano",
    youtube: "https://www.youtube.com/@gdgmilano",
  },
} as const;

export type SiteConfig = typeof siteConfig;
