import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
vi.mock("@/lib/firebase/admin", () => ({ getAdminAuth: () => ({ verifyIdToken }) }));

import { verifyUser } from "@/lib/auth/user-guard";

const req = (h: Record<string, string> = {}) => new Request("http://localhost/api/x", { headers: h });

beforeEach(() => {
  verifyIdToken.mockReset();
});

describe("verifyUser", () => {
  it("null when no Authorization header", async () => {
    expect(await verifyUser(req())).toBe(null);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });
  it("null when token invalid (verify throws)", async () => {
    const rejection = Promise.reject(new Error("bad"));
    rejection.catch(() => {}); // suppress unhandled rejection warning
    verifyIdToken.mockImplementation(() => rejection);
    expect(await verifyUser(req({ authorization: "Bearer xxx" }))).toBe(null);
  });
  it("returns uid for a valid token", async () => {
    verifyIdToken.mockResolvedValue({ uid: "u1" });
    expect(await verifyUser(req({ authorization: "Bearer good" }))).toBe("u1");
    expect(verifyIdToken).toHaveBeenCalledWith("good");
  });
});
