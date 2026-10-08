import { describe, expect, it } from "vitest";
import { dueScheduled, parseScheduleTime, scheduleTemplates } from "@/lib/push/schedule";
import { parseAnnouncementInput } from "@/lib/push/announcements";

// The real agenda's service sessions, typos and duplicate rooms included.
const s = (title: string, start: string, end: string, roomName = "Coworking") => ({
  title,
  startsAt: `2026-10-10T${start}:00.000Z`,
  endsAt: `2026-10-10T${end}:00.000Z`,
  roomName,
  isServiceSession: true,
});
const sessions = [
  s("Check In", "06:30", "07:00", "Nexus"),
  s("Ceck In", "06:30", "07:00"),
  s("Welcome", "07:00", "07:30"),
  s("Coffe Break", "09:00", "09:30", "Workshop"),
  s("Coffe Break", "09:00", "09:30", "Nexus"),
  s("Lunch", "11:00", "12:00", "Nexus"),
  s("Coffee Break", "13:30", "14:00"),
  s("Closing", "16:15", "16:30"),
  { ...s("Agentic Commerce", "13:30", "14:00"), isServiceSession: false },
];
const opts = { eventDate: "2026-10-10T09:00:00+02:00", venue: "Randstad Box" };

describe("scheduleTemplates", () => {
  const t = scheduleTemplates(sessions, opts);
  const byKind = (k: string) => t.filter((x) => x.kind === k);

  it("offers the eve reminder at 18:00 Milan time the day before", () => {
    const [eve] = byKind("eve");
    expect(eve.sendAt).toBe("2026-10-09T16:00:00.000Z");
    expect(eve.bodyIt).toContain("08:30"); // check-in time from the agenda
    expect(eve.bodyIt).toContain("Randstad Box");
  });

  it("sends the welcome ten minutes before the opening", () => {
    const [w] = byKind("welcome");
    expect(w.sendAt).toBe("2026-10-10T06:50:00.000Z");
    expect(w.bodyIt).toContain("09:00");
  });

  it("finds each coffee break once, typo or not", () => {
    expect(byKind("coffee").map((c) => c.sendAt)).toEqual([
      "2026-10-10T09:00:00.000Z",
      "2026-10-10T13:30:00.000Z",
    ]);
    expect(byKind("coffee")[0].bodyIt).toContain("11:30"); // until the break ends
  });

  it("announces lunch with the time sessions resume", () => {
    const [l] = byKind("lunch");
    expect(l.sendAt).toBe("2026-10-10T11:00:00.000Z");
    expect(l.bodyIt).toContain("14:00");
  });

  it("says goodbye as the closing ends", () => {
    expect(byKind("closing")[0].sendAt).toBe("2026-10-10T16:30:00.000Z");
  });

  it("lists them in time order, and every one fits a notification", () => {
    const times = t.map((x) => x.sendAt);
    expect([...times].sort()).toEqual(times);
    for (const x of t) expect(parseAnnouncementInput(x)).toEqual({
      titleIt: x.titleIt, bodyIt: x.bodyIt, titleEn: x.titleEn, bodyEn: x.bodyEn,
    });
  });

  it("still offers the eve reminder with no agenda", () => {
    const only = scheduleTemplates([], opts);
    expect(only.map((x) => x.kind)).toEqual(["eve"]);
  });
});

describe("dueScheduled", () => {
  const now = new Date("2026-10-10T11:02:00.000Z");
  const item = (id: string, sendAt: string | null, status = "pending") => ({ id, sendAt, status });

  it("picks pending items whose time has come", () => {
    const { due } = dueScheduled([item("a", "2026-10-10T11:00:00.000Z"), item("b", "2026-10-10T11:05:00.000Z")], now);
    expect(due.map((x) => x.id)).toEqual(["a"]);
  });

  it("skips anything not pending", () => {
    const { due } = dueScheduled([item("a", "2026-10-10T11:00:00.000Z", "sending")], now);
    expect(due).toEqual([]);
  });

  it("calls an item missed once it is too late to still make sense", () => {
    const { due, missed } = dueScheduled([item("old", "2026-10-10T10:00:00.000Z")], now, 30);
    expect(due).toEqual([]);
    expect(missed.map((x) => x.id)).toEqual(["old"]);
  });
});

describe("parseScheduleTime", () => {
  const now = new Date("2026-10-08T18:00:00.000Z");

  it("accepts a future instant", () => {
    expect(parseScheduleTime("2026-10-09T16:00:00.000Z", now)).toBe("2026-10-09T16:00:00.000Z");
  });

  it("refuses the past, garbage, and anything absurdly far out", () => {
    expect(parseScheduleTime("2026-10-08T17:00:00.000Z", now)).toBeNull();
    expect(parseScheduleTime("not a date", now)).toBeNull();
    expect(parseScheduleTime("2027-10-08T17:00:00.000Z", now)).toBeNull();
  });
});
