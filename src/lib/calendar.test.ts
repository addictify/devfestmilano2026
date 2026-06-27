import { describe, expect, it } from "vitest";
import { buildIcs, googleCalendarUrl, icsDataUri, toCalUtc, type CalendarEvent } from "@/lib/calendar";

const ev: CalendarEvent = {
  title: "DevFest Milano 2026",
  description: "A day of talks; demos, and code.",
  location: "Randstad Box, Via San Vigilio 5, Milano",
  start: "2026-10-10T09:00:00+02:00",
  end: "2026-10-10T19:00:00+02:00",
  url: "https://2026.devfestmilano.it",
  uid: "devfest-2026",
};

describe("toCalUtc", () => {
  it("converts +02:00 offset to UTC basic format", () => {
    expect(toCalUtc("2026-10-10T09:00:00+02:00")).toBe("20261010T070000Z");
  });
});

describe("googleCalendarUrl", () => {
  it("builds a TEMPLATE url with UTC dates and encoded fields", () => {
    const u = googleCalendarUrl(ev);
    expect(u).toContain("calendar.google.com/calendar/render?action=TEMPLATE");
    expect(u).toContain("dates=20261010T070000Z%2F20261010T170000Z");
    expect(u).toContain("text=DevFest+Milano+2026");
    expect(u).toContain("location=Randstad+Box");
  });
});

describe("buildIcs", () => {
  it("emits a valid VEVENT with CRLF and escaped fields", () => {
    const ics = buildIcs(ev);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("UID:devfest-2026");
    expect(ics).toContain("DTSTART:20261010T070000Z");
    expect(ics).toContain("DTEND:20261010T170000Z");
    expect(ics).toContain("SUMMARY:DevFest Milano 2026");
    // comma and semicolon escaped per RFC 5545
    expect(ics).toContain("DESCRIPTION:A day of talks\\; demos\\, and code.");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toMatch(/\r\n/);
  });
  it("derives a uid when none given", () => {
    const { uid, ...noUid } = ev;
    expect(buildIcs(noUid)).toMatch(/UID:.+/);
  });
});

describe("icsDataUri", () => {
  it("returns a text/calendar data uri", () => {
    expect(icsDataUri(ev)).toMatch(/^data:text\/calendar;charset=utf-8,/);
  });
});
