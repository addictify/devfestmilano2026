import { describe, expect, it } from "vitest";
import { localizeAnnouncement, toPublicAnnouncement } from "@/lib/push/announcements";

const stored = {
  titleIt: "Cambio sala",
  bodyIt: "Il talk delle 11 è in Nexus.",
  titleEn: "Room change",
  bodyEn: "The 11am talk is in Nexus.",
  sentBy: "organizer@example.com",
  sentAt: { toDate: () => new Date("2026-10-10T09:00:00Z") },
  sent: 120,
  failed: 2,
  gone: 1,
};

describe("toPublicAnnouncement", () => {
  it("keeps the text and the time, never who sent it or delivery stats", () => {
    expect(toPublicAnnouncement("a1", stored)).toEqual({
      id: "a1",
      title: { it: "Cambio sala", en: "Room change" },
      body: { it: "Il talk delle 11 è in Nexus.", en: "The 11am talk is in Nexus." },
      sentAt: "2026-10-10T09:00:00.000Z",
    });
  });

  it("leaves English empty when none was written", () => {
    const a = toPublicAnnouncement("a1", { ...stored, titleEn: null, bodyEn: null });
    expect(a?.title.en).toBeNull();
    expect(a?.body.en).toBeNull();
  });

  it("drops rows without Italian copy", () => {
    expect(toPublicAnnouncement("a1", { ...stored, titleIt: "" })).toBeNull();
  });

  it("tolerates a missing timestamp (a send still in flight)", () => {
    expect(toPublicAnnouncement("a1", { ...stored, sentAt: undefined })?.sentAt).toBeNull();
  });
});

describe("localizeAnnouncement", () => {
  const a = toPublicAnnouncement("a1", stored)!;

  it("uses English for English readers when both fields exist", () => {
    expect(localizeAnnouncement(a, "en")).toEqual({ title: "Room change", body: "The 11am talk is in Nexus." });
  });

  it("falls back to Italian, as the push itself did", () => {
    const itOnly = toPublicAnnouncement("a1", { ...stored, bodyEn: null })!;
    expect(localizeAnnouncement(itOnly, "en")).toEqual({ title: "Cambio sala", body: "Il talk delle 11 è in Nexus." });
  });
});
