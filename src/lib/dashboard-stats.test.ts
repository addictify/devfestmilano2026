import { describe, expect, it } from "vitest";
import {
  bump,
  countByDay,
  countWithin,
  mean1,
  pct,
  romeDay,
  savedBuckets,
  scanThresholds,
  topN,
} from "@/lib/dashboard-stats";
import { isTrackEvent, ONCE_PER_DEVICE, TRACK_EVENTS } from "@/lib/track";

describe("romeDay", () => {
  it("uses the Rome calendar day, not UTC", () => {
    // 23:30 UTC on 9 Oct is 01:30 on 10 Oct in Rome (CEST, UTC+2).
    expect(romeDay(new Date("2026-10-09T23:30:00Z"))).toBe("2026-10-10");
    expect(romeDay(new Date("2026-10-09T21:59:00Z"))).toBe("2026-10-09");
  });
});

describe("countByDay", () => {
  it("groups, sorts oldest first and skips invalid dates", () => {
    const out = countByDay([
      new Date("2026-10-09T10:00:00Z"),
      new Date("2026-10-08T10:00:00Z"),
      new Date("2026-10-09T12:00:00Z"),
      new Date("nope"),
    ]);
    expect(out).toEqual([
      { day: "2026-10-08", count: 1 },
      { day: "2026-10-09", count: 2 },
    ]);
  });
  it("empty → empty", () => expect(countByDay([])).toEqual([]));
});

describe("countWithin", () => {
  const now = new Date("2026-10-10T12:00:00Z");
  it("counts the window, excludes older and future", () => {
    const hour = 3_600_000;
    const dates = [
      new Date(now.getTime() - 1 * hour),
      new Date(now.getTime() - 23 * hour),
      new Date(now.getTime() - 25 * hour),
      new Date(now.getTime() + hour),
    ];
    expect(countWithin(dates, now, 24 * hour)).toBe(2);
  });
});

describe("pct", () => {
  it("rounds, and survives a zero whole", () => {
    expect(pct(1, 3)).toBe(33);
    expect(pct(2, 3)).toBe(67);
    expect(pct(5, 0)).toBe(0);
  });
});

describe("savedBuckets", () => {
  it("places edges in the right bucket and ignores people with none", () => {
    const out = savedBuckets([0, 1, 2, 3, 4, 6, 7, 20]);
    expect(out).toEqual([
      { label: "1", count: 1 },
      { label: "2–3", count: 2 },
      { label: "4–6", count: 2 },
      { label: "7+", count: 2 },
    ]);
  });
});

describe("scanThresholds", () => {
  it("counts players at or above each threshold", () => {
    expect(scanThresholds([0, 1, 3, 5, 9])).toEqual([
      { atLeast: 1, players: 4 },
      { atLeast: 3, players: 3 },
      { atLeast: 5, players: 2 },
    ]);
  });
});

describe("topN / bump", () => {
  it("orders by count then key, and truncates", () => {
    const m = new Map<string, number>();
    ["b", "a", "b", "c", "a", "b"].forEach((k) => bump(m, k));
    expect(topN(m, 2)).toEqual([
      { id: "b", count: 3 },
      { id: "a", count: 2 },
    ]);
  });
  it("breaks ties by key", () => {
    const m = new Map([["z", 1], ["a", 1]]);
    expect(topN(m, 5).map((x) => x.id)).toEqual(["a", "z"]);
  });
});

describe("mean1", () => {
  it("one decimal, zero when empty", () => {
    expect(mean1([4, 5, 5])).toBe(4.7);
    expect(mean1([])).toBe(0);
  });
});

describe("track events", () => {
  it("accepts only the closed list", () => {
    expect(isTrackEvent("push_accepted")).toBe(true);
    expect(isTrackEvent("push_nope")).toBe(false);
    expect(isTrackEvent(undefined)).toBe(false);
    expect(isTrackEvent("__proto__")).toBe(false);
  });
  it("once-per-device events are all real events", () => {
    for (const e of ONCE_PER_DEVICE) expect(TRACK_EVENTS).toContain(e);
  });
});
