import { describe, expect, it } from "vitest";
import {
  BOOTSTRAP_ADMIN_EMAIL,
  isBootstrapAdmin,
  isPlausibleEmail,
  refuseRemoval,
} from "@/lib/auth/admins";

describe("isBootstrapAdmin", () => {
  it("matches regardless of case or surrounding space", () => {
    expect(isBootstrapAdmin(BOOTSTRAP_ADMIN_EMAIL)).toBe(true);
    expect(isBootstrapAdmin(` ${BOOTSTRAP_ADMIN_EMAIL.toUpperCase()} `)).toBe(true);
  });
  it("is false for anyone else, and for missing emails", () => {
    expect(isBootstrapAdmin("someone@else.com")).toBe(false);
    expect(isBootstrapAdmin(null)).toBe(false);
    expect(isBootstrapAdmin("")).toBe(false);
  });
});

describe("refuseRemoval", () => {
  const base = {
    targetUid: "u2",
    targetEmail: "other@example.com",
    requesterUid: "u1",
    totalAdmins: 3,
  };

  it("allows removing another admin when others remain", () => {
    expect(refuseRemoval(base)).toBeNull();
  });

  it("refuses removing yourself — that locks you out of the page you're on", () => {
    expect(refuseRemoval({ ...base, targetUid: "u1" })).toBe("self");
  });

  it("refuses removing the bootstrap admin, whatever the case", () => {
    expect(
      refuseRemoval({ ...base, targetEmail: BOOTSTRAP_ADMIN_EMAIL.toUpperCase() }),
    ).toBe("bootstrap");
  });

  it("refuses removing the last admin", () => {
    expect(refuseRemoval({ ...base, totalAdmins: 1 })).toBe("last-admin");
  });

  it("reports self-removal first when several rules apply at once", () => {
    // Removing yourself as the only admin: "you can't remove yourself" is the
    // more useful message than "that's the last admin".
    expect(
      refuseRemoval({ ...base, targetUid: "u1", totalAdmins: 1 }),
    ).toBe("self");
  });
});

describe("isPlausibleEmail", () => {
  it("accepts ordinary addresses", () => {
    expect(isPlausibleEmail("a@b.co")).toBe(true);
    expect(isPlausibleEmail(" Person@Example.COM ")).toBe(true);
  });
  it("rejects malformed ones", () => {
    for (const bad of ["", "nope", "a@b", "a b@c.com", "@b.com", "a@.com"]) {
      expect(isPlausibleEmail(bad), bad).toBe(false);
    }
  });
  it("rejects absurdly long addresses", () => {
    expect(isPlausibleEmail("a".repeat(250) + "@example.com")).toBe(false);
  });
});
