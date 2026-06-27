import { siteConfig } from "@/lib/site";
import type { CalendarEvent } from "@/lib/calendar";

export function eventCalendarEvent(description: string): CalendarEvent {
  return {
    title: siteConfig.name,
    description,
    location: `${siteConfig.venue.name}, ${siteConfig.venue.address}`,
    start: siteConfig.eventDate,
    end: siteConfig.eventEnd,
    url: siteConfig.url,
    uid: "devfest-milano-2026@devfestmilano.it",
  };
}
