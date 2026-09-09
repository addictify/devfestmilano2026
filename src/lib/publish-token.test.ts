import { describe, expect, it } from "vitest";
import { __looksLikeGitHubTokenForTest as looksLikeGitHubToken } from "@/lib/publish";

describe("GitHub token shape", () => {
  it("accepts the real token formats", () => {
    expect(looksLikeGitHubToken("github_pat_11ABCDEF0abcdefGHIJ")).toBe(true);
    expect(looksLikeGitHubToken("ghp_abcdefghijklmnop1234")).toBe(true);
    expect(looksLikeGitHubToken("  ghp_withSurroundingSpace  ")).toBe(true);
  });

  it("rejects the seeded placeholder", () => {
    expect(looksLikeGitHubToken("unset")).toBe(false);
  });

  it("rejects a pasted shell command, which is what actually happened", () => {
    expect(
      looksLikeGitHubToken("printf %s IL_TUO_TOKEN | gcloud secrets versions add"),
    ).toBe(false);
  });

  it("rejects an unsubstituted placeholder", () => {
    expect(looksLikeGitHubToken("IL_TUO_TOKEN")).toBe(false);
    expect(looksLikeGitHubToken("")).toBe(false);
  });
});
