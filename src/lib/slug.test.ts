import { describe, expect, it } from "vitest";
import { slugify, speakerSlugs } from "@/lib/slug";
import type { StoredSpeaker } from "@/types/models";

function speaker(id: string, fullName: string): StoredSpeaker {
  return {
    id,
    fullName,
    tagLine: "",
    bio: { it: "", en: "" },
    profilePicture: null,
    sessionIds: [],
    links: [],
    isTopSpeaker: false,
    featured: false,
  };
}

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Marco Arena")).toBe("marco-arena");
  });

  it("folds accents rather than dropping the letter", () => {
    expect(slugify("Tomás García")).toBe("tomas-garcia");
    expect(slugify("Renée Öberg")).toBe("renee-oberg");
  });

  it("collapses punctuation and trims the edges", () => {
    expect(slugify("  J.R.R. O'Brien-Smith  ")).toBe("j-r-r-o-brien-smith");
  });

  it("is empty when there is nothing to slug", () => {
    expect(slugify("···")).toBe("");
  });
});

describe("speakerSlugs", () => {
  it("uses the bare name when it is unique", () => {
    const slugs = speakerSlugs([
      speaker("a36c3d29-ce68-41e3", "Marco Arena"),
      speaker("11961b36-1beb-4478", "Tomas Piaggio"),
    ]);
    expect(slugs.get("a36c3d29-ce68-41e3")).toBe("marco-arena");
    expect(slugs.get("11961b36-1beb-4478")).toBe("tomas-piaggio");
  });

  it("disambiguates every namesake, not just the later one", () => {
    // A URL that moves is worse than one that is slightly uglier, and which
    // speaker counts as "first" depends on a sort order that changes.
    const slugs = speakerSlugs([
      speaker("aaaaaaaa-1111", "Marco Rossi"),
      speaker("bbbbbbbb-2222", "Marco Rossi"),
    ]);
    expect(slugs.get("aaaaaaaa-1111")).toBe("marco-rossi-aaaaaa");
    expect(slugs.get("bbbbbbbb-2222")).toBe("marco-rossi-bbbbbb");
  });

  it("gives different speakers different slugs, always", () => {
    const people = [
      speaker("1", "Marco Rossi"),
      speaker("2", "Marco Rossi"),
      speaker("3", "Marco Rossi"),
      speaker("4", "Anna Bianchi"),
    ];
    const slugs = speakerSlugs(people);
    expect(new Set(slugs.values()).size).toBe(people.length);
  });

  it("falls back for a name that slugifies to nothing", () => {
    const slugs = speakerSlugs([speaker("zzz9", "···")]);
    expect(slugs.get("zzz9")).toBe("speaker");
  });

  it("is stable across a reordering of the roster", () => {
    const people = [speaker("1", "Ana Lee"), speaker("2", "Bo Ruiz")];
    const forward = speakerSlugs(people);
    const reversed = speakerSlugs([...people].reverse());
    expect(forward.get("1")).toBe(reversed.get("1"));
    expect(forward.get("2")).toBe(reversed.get("2"));
  });
});
