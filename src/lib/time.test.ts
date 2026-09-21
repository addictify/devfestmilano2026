import { describe, expect, it } from "vitest";
import { formatTime, formatTimeRange, toEventInstant } from "@/lib/time";

/**
 * These assertions must hold whatever zone the process runs in — that is the
 * entire bug. The agenda (client, browser in Italy) and the speaker pages
 * (prerendered in CI, where TZ=UTC) disagreed by two hours on the same string.
 */
describe("toEventInstant", () => {
  it("reads an offsetless timestamp as Italian wall time", () => {
    // 10 Oct 2026 is CEST, so 09:30 in Milan is 07:30 UTC.
    expect(toEventInstant("2026-10-10T09:30:00")).toBe("2026-10-10T07:30:00.000Z");
  });

  it("accounts for the DST changeover", () => {
    // Late October is CET (+01:00), not CEST.
    expect(toEventInstant("2026-11-10T09:30:00")).toBe("2026-11-10T08:30:00.000Z");
  });

  it("leaves a timestamp that already carries an offset alone", () => {
    expect(toEventInstant("2026-10-10T09:30:00+02:00")).toBe("2026-10-10T07:30:00.000Z");
    expect(toEventInstant("2026-10-10T07:30:00Z")).toBe("2026-10-10T07:30:00.000Z");
  });

  it("accepts a timestamp without seconds", () => {
    expect(toEventInstant("2026-10-10T09:30")).toBe("2026-10-10T07:30:00.000Z");
  });

  it("returns null for nothing and for nonsense", () => {
    expect(toEventInstant(null)).toBeNull();
    expect(toEventInstant(undefined)).toBeNull();
    expect(toEventInstant("")).toBeNull();
    expect(toEventInstant("not a date")).toBeNull();
  });
});

describe("formatTime", () => {
  it("shows the Italian wall clock for an offsetless timestamp", () => {
    expect(formatTime("2026-10-10T09:30:00", "it")).toBe("09:30");
  });

  it("shows the same wall clock for the equivalent absolute instant", () => {
    // The point of the fix: both spellings of the same moment render alike.
    expect(formatTime("2026-10-10T07:30:00.000Z", "it")).toBe("09:30");
    expect(formatTime("2026-10-10T09:30:00+02:00", "it")).toBe("09:30");
  });

  it("is empty for a session with no time yet", () => {
    expect(formatTime(null, "it")).toBe("");
  });
});

describe("formatTimeRange", () => {
  it("joins both ends", () => {
    expect(formatTimeRange("2026-10-10T07:30:00.000Z", "2026-10-10T08:15:00.000Z", "it")).toBe(
      "09:30 – 10:15",
    );
  });

  it("falls back to whichever end exists", () => {
    expect(formatTimeRange("2026-10-10T07:30:00.000Z", null, "it")).toBe("09:30");
    expect(formatTimeRange(null, "2026-10-10T08:15:00.000Z", "it")).toBe("10:15");
    expect(formatTimeRange(null, null, "it")).toBe("");
  });
});
