import { describe, expect, it } from "vitest";
import { awardForScan, normalizeAnswer, parseQrPayload, quizOutcome, validateScan } from "@/lib/gamification";

describe("validateScan", () => {
  it("not-found when null", () => expect(validateScan(null, "x")).toBe("not-found"));
  it("inactive when inactive", () => expect(validateScan({ active: false, secret: "s" }, "s")).toBe("inactive"));
  it("bad-token on mismatch", () => expect(validateScan({ active: true, secret: "s" }, "x")).toBe("bad-token"));
  it("ok on match + active", () => expect(validateScan({ active: true, secret: "s" }, "s")).toBe("ok"));
});

describe("normalizeAnswer", () => {
  it("trims, lowercases, collapses whitespace", () =>
    expect(normalizeAnswer("  Il   Duomo ")).toBe("il duomo"));
});

describe("quizOutcome", () => {
  it("no quiz → base points, correct null", () =>
    expect(quizOutcome({ points: 10 }, undefined)).toEqual({ correct: null, pointsDelta: 10 }));
  it("correct + add → base + value", () =>
    expect(quizOutcome({ points: 10, answer: "Roma", quizMode: "add", quizValue: 5 }, "roma "))
      .toEqual({ correct: true, pointsDelta: 15 }));
  it("correct + multiply → base * value", () =>
    expect(quizOutcome({ points: 10, answer: "Roma", quizMode: "multiply", quizValue: 3 }, "ROMA"))
      .toEqual({ correct: true, pointsDelta: 30 }));
  it("wrong → base - penalty (can go negative)", () =>
    expect(quizOutcome({ points: 10, answer: "Roma", wrongPenalty: 25 }, "Milano"))
      .toEqual({ correct: false, pointsDelta: -15 }));
  it("missing answer to a quiz checkpoint counts as wrong", () =>
    expect(quizOutcome({ points: 10, answer: "Roma", wrongPenalty: 5 }, undefined))
      .toEqual({ correct: false, pointsDelta: 5 }));
});

describe("awardForScan", () => {
  const base = { points: 10, badgeIds: ["a"], scanCount: 1 };
  it("applies a positive delta, badge, increments scanCount", () => {
    expect(awardForScan(base, 5, "b", [])).toEqual({ points: 15, badgeIds: ["a", "b"], scanCount: 2 });
  });
  it("applies a negative delta (no clamp)", () => {
    expect(awardForScan(base, -25, undefined, [])).toEqual({ points: -15, badgeIds: ["a"], scanCount: 2 });
  });
  it("does not duplicate an already-held badge", () => {
    expect(awardForScan(base, 5, "a", [])).toEqual({ points: 15, badgeIds: ["a"], scanCount: 2 });
  });
  it("awards a milestone badge when scanCount reaches it", () => {
    const r = awardForScan({ points: 0, badgeIds: [], scanCount: 4 }, 1, undefined, [{ id: "m5", milestone: 5 }]);
    expect(r.scanCount).toBe(5);
    expect(r.badgeIds).toContain("m5");
  });
  it("no milestone before threshold", () => {
    const r = awardForScan({ points: 0, badgeIds: [], scanCount: 1 }, 1, undefined, [{ id: "m5", milestone: 5 }]);
    expect(r.badgeIds).not.toContain("m5");
  });
});

describe("parseQrPayload", () => {
  it("parses a valid DFQ payload", () => expect(parseQrPayload("DFQ:cp1:tok9")).toEqual({ checkpointId: "cp1", token: "tok9" }));
  it("null on wrong prefix", () => expect(parseQrPayload("https://evil/cp1:tok")).toBe(null));
  it("null on malformed", () => expect(parseQrPayload("DFQ:onlyone")).toBe(null));
});
