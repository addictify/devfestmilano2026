import { describe, expect, it } from "vitest";
import { collapseServiceSessions, matchesFilters, standsAlone } from "@/lib/agenda";
import type { Session } from "@/types/models";

function session(over: Partial<Session> & { id: string }): Session {
  return {
    title: "Talk",
    description: { it: "", en: "" },
    startsAt: "2026-10-10T11:00:00",
    endsAt: "2026-10-10T11:30:00",
    speakerIds: [],
    tags: [],
    isServiceSession: false,
    featured: false,
    ...over,
  };
}

const break_ = (id: string, room: string, title = "Coffee Break") =>
  session({ id, title, roomName: room, trackId: room, isServiceSession: true });

describe("collapseServiceSessions", () => {
  it("collapses a break repeated in every room into one block", () => {
    const out = collapseServiceSessions(
      [break_("a", "Nexus"), break_("b", "Coworking"), break_("c", "Workshop")],
    );
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("Coffee Break");
    // It stops the whole venue, so naming a room would be wrong.
    expect(out[0].roomName).toBeUndefined();
    expect(out[0].trackId).toBeUndefined();
  });

  it("keeps the rooms when another room is running a talk during the block", () => {
    const out = collapseServiceSessions([
      break_("a", "Nexus"),
      break_("b", "Coworking"),
      session({ id: "t", roomName: "Workshop", startsAt: "2026-10-10T10:30:00", endsAt: "2026-10-10T12:00:00" }),
    ]);
    const block = out.find((s) => s.isServiceSession)!;
    expect(block.roomName).toBe("Nexus · Coworking");
  });

  it("is venue-wide when every room in use is on the break, even with a room idle", () => {
    // A fourth room (Secret Track) that only runs talks at other times
    // mustn't turn every break into "Coworking · Nexus · Workshop".
    const out = collapseServiceSessions([
      break_("a", "Nexus"),
      break_("b", "Coworking"),
      break_("c", "Workshop"),
      session({ id: "t1", roomName: "Secret Track", startsAt: "2026-10-10T09:30:00", endsAt: "2026-10-10T11:00:00" }),
      session({ id: "t2", roomName: "Secret Track", startsAt: "2026-10-10T11:30:00", endsAt: "2026-10-10T11:50:00" }),
    ]);
    const block = out.find((s) => s.isServiceSession)!;
    expect(block.roomName).toBeUndefined();
  });

  it("takes the majority title, so one room's typo doesn't win", () => {
    const out = collapseServiceSessions(
      [
        break_("a", "Nexus", "Check In"),
        break_("b", "Coworking", "Ceck In"),
        break_("c", "Workshop", "Check In"),
      ],
    );
    expect(out[0].title).toBe("Check In");
  });

  it("does not merge service sessions at different times", () => {
    const out = collapseServiceSessions(
      [
        break_("a", "Nexus"),
        session({
          id: "b",
          title: "Lunch",
          startsAt: "2026-10-10T13:00:00",
          endsAt: "2026-10-10T14:00:00",
          isServiceSession: true,
          roomName: "Nexus",
        }),
      ],
    );
    expect(out.map((s) => s.title)).toEqual(["Coffee Break", "Lunch"]);
  });

  it("never merges talks, even two in the same slot", () => {
    const out = collapseServiceSessions(
      [
        session({ id: "a", title: "Talk A", roomName: "Nexus" }),
        session({ id: "b", title: "Talk B", roomName: "Coworking" }),
      ],
    );
    expect(out).toHaveLength(2);
  });

  it("keeps the collapsed block where the first of its group sat", () => {
    const out = collapseServiceSessions(
      [
        break_("a", "Nexus", "Welcome"),
        session({ id: "t", title: "Talk A" }),
        break_("b", "Coworking", "Welcome"),
      ],
    );
    expect(out.map((s) => s.title)).toEqual(["Welcome", "Talk A"]);
  });

  it("leaves an unscheduled service session alone", () => {
    const out = collapseServiceSessions(
      [
        session({ id: "a", title: "TBA", startsAt: null, endsAt: null, isServiceSession: true }),
        session({ id: "b", title: "TBA", startsAt: null, endsAt: null, isServiceSession: true }),
      ],
    );
    expect(out).toHaveLength(2);
  });
});

describe("matchesFilters", () => {
  const none = { track: "all", lang: "all" as const, onlyFavorites: false, favorites: new Set<string>() };

  it("keeps breaks and lunch whatever the filters say", () => {
    // The reported bug: picking a room emptied the day of its structure.
    const lunch = session({ id: "l", title: "Lunch", isServiceSession: true, trackId: "nexus" });
    expect(matchesFilters(lunch, { ...none, track: "workshop" })).toBe(true);
    expect(matchesFilters(lunch, { ...none, lang: "en" })).toBe(true);
    expect(matchesFilters(lunch, { ...none, onlyFavorites: true })).toBe(true);
  });

  it("filters talks by track", () => {
    const talk = session({ id: "t", trackId: "nexus", language: "it" });
    expect(matchesFilters(talk, { ...none, track: "nexus" })).toBe(true);
    expect(matchesFilters(talk, { ...none, track: "workshop" })).toBe(false);
  });

  it("filters talks by language", () => {
    const talk = session({ id: "t", trackId: "nexus", language: "it" });
    expect(matchesFilters(talk, { ...none, lang: "it" })).toBe(true);
    expect(matchesFilters(talk, { ...none, lang: "en" })).toBe(false);
  });

  it("filters talks down to the saved ones", () => {
    const a = session({ id: "a" });
    const b = session({ id: "b" });
    const f = { ...none, onlyFavorites: true, favorites: new Set(["a"]) };
    expect(matchesFilters(a, f)).toBe(true);
    expect(matchesFilters(b, f)).toBe(false);
  });

  it("applies every active filter at once", () => {
    const talk = session({ id: "t", trackId: "nexus", language: "it" });
    expect(
      matchesFilters(talk, { track: "nexus", lang: "it", onlyFavorites: true, favorites: new Set(["t"]) }),
    ).toBe(true);
    expect(
      matchesFilters(talk, { track: "nexus", lang: "it", onlyFavorites: true, favorites: new Set(["x"]) }),
    ).toBe(false);
  });
});

describe("standsAlone", () => {
  const talk = (id: string, room: string, start: string, end: string) =>
    session({ id, roomName: room, startsAt: `2026-10-10T${start}:00`, endsAt: `2026-10-10T${end}:00` });
  const day = [
    talk("keynote", "Nexus", "09:00", "09:30"),
    talk("a", "Nexus", "11:30", "12:15"),
    talk("b", "Coworking", "11:30", "12:15"),
    talk("lt1", "Secret Track", "11:30", "11:50"),
    talk("lt2", "Secret Track", "11:50", "12:10"),
  ];
  const byId = (id: string) => day.find((s) => s.id === id)!;

  it("spans the row when nothing else runs at the same time", () => {
    expect(standsAlone(byId("keynote"), day)).toBe(true);
  });

  it("doesn't, for a talk that starts mid-slot alongside longer ones", () => {
    // Alone in its 11:50 row, but rooms are still busy until 12:15.
    expect(standsAlone(byId("lt2"), day)).toBe(false);
  });

  it("always does for a break", () => {
    expect(standsAlone(session({ id: "x", isServiceSession: true }), day)).toBe(true);
  });
});
