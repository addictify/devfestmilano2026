import { describe, expect, it } from "vitest";
import { isPubliclyVisible } from "@/lib/sessionize/normalize";

describe("isPubliclyVisible", () => {
  it("publishes an accepted, confirmed talk", () => {
    expect(isPubliclyVisible({ status: "Accepted", isConfirmed: true })).toBe(true);
  });

  it("hides an accepted talk the speaker hasn't confirmed", () => {
    // They've been told they're in, but haven't committed to attending.
    expect(isPubliclyVisible({ status: "Accepted", isConfirmed: false })).toBe(false);
    expect(isPubliclyVisible({ status: "Accepted" })).toBe(false);
  });

  it("hides anything not accepted, however confirmed it claims to be", () => {
    for (const status of ["Submitted", "Declined", "Rejected", "Withdrawn", ""]) {
      expect(isPubliclyVisible({ status, isConfirmed: true }), status).toBe(false);
    }
  });

  it("is case-insensitive about the status string", () => {
    expect(isPubliclyVisible({ status: "accepted", isConfirmed: true })).toBe(true);
  });

  it("always publishes service sessions, which carry no review state", () => {
    expect(isPubliclyVisible({ isServiceSession: true })).toBe(true);
    expect(isPubliclyVisible({ isServiceSession: true, status: "Submitted" })).toBe(true);
  });
});
