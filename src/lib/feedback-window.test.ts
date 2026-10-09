import { describe, expect, it } from "vitest";
import { FEEDBACK_OPENS_AT, isFeedbackOpen } from "@/lib/feedback-window";

describe("feedback window", () => {
  it("opens at midnight Milan time on the event day", () => {
    expect(FEEDBACK_OPENS_AT).toBe("2026-10-09T22:00:00.000Z");
  });

  it("is closed the evening before and open from midnight", () => {
    expect(isFeedbackOpen(new Date("2026-10-09T21:59:59.000Z"))).toBe(false);
    expect(isFeedbackOpen(new Date("2026-10-09T22:00:00.000Z"))).toBe(true);
    expect(isFeedbackOpen(new Date("2026-10-11T10:00:00.000Z"))).toBe(true);
  });
});
