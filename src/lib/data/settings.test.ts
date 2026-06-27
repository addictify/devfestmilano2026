import { describe, expect, it } from "vitest";
import { mergeSettings } from "@/lib/data/settings";
import { siteConfig } from "@/lib/site";

describe("mergeSettings", () => {
  it("falls back to siteConfig constants when doc is null", () => {
    expect(mergeSettings(null)).toEqual({
      ticketsAvailable: siteConfig.ticketsAvailable,
      speakersPublished: siteConfig.speakersPublished,
      schedulePublished: siteConfig.schedulePublished,
    });
  });
  it("overrides per-flag only when the doc has a boolean", () => {
    const m = mergeSettings({ ticketsAvailable: true, speakersPublished: "yes" });
    expect(m.ticketsAvailable).toBe(true);          // boolean override applied
    expect(m.speakersPublished).toBe(siteConfig.speakersPublished); // non-boolean ignored
  });
});
