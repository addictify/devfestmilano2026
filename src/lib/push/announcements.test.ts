import { describe, expect, it } from "vitest";
import { hasUnread, localizeAnnouncement, parseAnnouncementInput, parseIdList, toPublicAnnouncement } from "@/lib/push/announcements";

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

describe("hasUnread", () => {
  const at = (iso: string | null) => ({ ...toPublicAnnouncement("x", stored)!, sentAt: iso });

  it("is false with nothing announced", () => {
    expect(hasUnread([], null)).toBe(false);
  });

  it("is true for a first visit once anything was announced", () => {
    expect(hasUnread([at("2026-10-10T09:00:00.000Z")], null)).toBe(true);
  });

  it("compares the newest announcement with the last one seen", () => {
    const items = [at("2026-10-10T10:00:00.000Z"), at("2026-10-10T09:00:00.000Z")];
    expect(hasUnread(items, "2026-10-10T09:00:00.000Z")).toBe(true);
    expect(hasUnread(items, "2026-10-10T10:00:00.000Z")).toBe(false);
  });

  it("ignores a row still being written", () => {
    expect(hasUnread([at(null)], null)).toBe(false);
  });
});

describe("parseAnnouncementInput", () => {
  it("trims, and keeps English optional", () => {
    expect(parseAnnouncementInput({ titleIt: " Ciao ", bodyIt: " Testo ", titleEn: "", bodyEn: " " })).toEqual({
      titleIt: "Ciao",
      bodyIt: "Testo",
      titleEn: null,
      bodyEn: null,
    });
  });

  it("requires the Italian title and text", () => {
    expect(parseAnnouncementInput({ titleIt: "Ciao", bodyIt: "  " })).toBeNull();
    expect(parseAnnouncementInput(null)).toBeNull();
  });

  it("caps lengths at what a notification shows", () => {
    const p = parseAnnouncementInput({ titleIt: "t".repeat(200), bodyIt: "b".repeat(400) })!;
    expect(p.titleIt).toHaveLength(80);
    expect(p.bodyIt).toHaveLength(180);
  });
});

describe("parseIdList", () => {
  it("dedupes and drops non-strings", () => {
    expect(parseIdList({ ids: ["a", "a", "", 3, "b"] })).toEqual(["a", "b"]);
  });

  it("rejects an empty or oversized list", () => {
    expect(parseIdList({ ids: [] })).toBeNull();
    expect(parseIdList({})).toBeNull();
    expect(parseIdList({ ids: Array.from({ length: 101 }, (_, i) => `id${i}`) })).toBeNull();
  });

  it("refuses ids that aren't plain Firestore ids", () => {
    expect(parseIdList({ ids: ["ok", "../x"] })).toEqual(["ok"]);
  });
});
