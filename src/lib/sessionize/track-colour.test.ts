import { describe, expect, it } from "vitest";
import { normalizeSessionize } from "@/lib/sessionize/normalize";
import type { SzAll } from "@/lib/sessionize/types";

const room = (id: number, name: string, sort: number) => ({ id, name, sort });
const payload = (rooms: ReturnType<typeof room>[]) =>
  ({ rooms, sessions: [], speakers: [], categories: [] }) as unknown as SzAll;

describe("track colours", () => {
  it("keeps a track's colour when the organizer reorders rooms", () => {
    const before = normalizeSessionize(payload([room(1, "A", 1), room(2, "B", 2), room(3, "C", 3)]));
    // Same rooms, rearranged — a normal thing to do while planning.
    const after = normalizeSessionize(payload([room(3, "C", 1), room(1, "A", 2), room(2, "B", 3)]));
    for (const id of ["1", "2", "3"]) {
      expect(after.tracks.find((t) => t.id === id)!.color).toBe(
        before.tracks.find((t) => t.id === id)!.color,
      );
    }
  });

  it("still lists tracks in the organizer's display order", () => {
    const { tracks } = normalizeSessionize(payload([room(3, "C", 1), room(1, "A", 2)]));
    expect(tracks.map((t) => t.id)).toEqual(["3", "1"]);
  });

  it("gives distinct colours to up to four tracks", () => {
    const { tracks } = normalizeSessionize(
      payload([room(1, "A", 1), room(2, "B", 2), room(3, "C", 3), room(4, "D", 4)]),
    );
    expect(new Set(tracks.map((t) => t.color)).size).toBe(4);
  });
});
