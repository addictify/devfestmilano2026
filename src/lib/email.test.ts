import { describe, expect, it } from "vitest";
import { isValidEmail, normalizeEmail } from "@/lib/email";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Foo@Bar.IT ")).toBe("foo@bar.it");
  });
});

describe("isValidEmail", () => {
  it("accepts a plain address", () => { expect(isValidEmail("a@b.co")).toBe(true); });
  it("rejects missing @", () => { expect(isValidEmail("ab.co")).toBe(false); });
  it("rejects spaces", () => { expect(isValidEmail("a b@c.co")).toBe(false); });
  it("rejects no TLD dot", () => { expect(isValidEmail("a@b")).toBe(false); });
  it("rejects oversize", () => { expect(isValidEmail("x".repeat(250) + "@b.co")).toBe(false); });
});
