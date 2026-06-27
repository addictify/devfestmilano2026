import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
}));

import { verifyAdmin } from "@/lib/auth/admin-guard";

function req(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/admin/x", { headers });
}

beforeEach(() => {
  verifyIdToken.mockReset();
});

describe("verifyAdmin", () => {
  it("false when no Authorization header", async () => {
    expect(await verifyAdmin(req())).toBe(false);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });
  it("false when token invalid (verify throws)", async () => {
    verifyIdToken.mockImplementation(() => Promise.reject(new Error("bad")));
    const result = await verifyAdmin(req({ authorization: "Bearer xxx" }));
    expect(result).toBe(false);
  });
  it("false when valid token lacks admin claim", async () => {
    verifyIdToken.mockResolvedValue({ admin: false, uid: "u1" });
    expect(await verifyAdmin(req({ authorization: "Bearer good" }))).toBe(false);
  });
  it("true when valid token has admin claim", async () => {
    verifyIdToken.mockResolvedValue({ admin: true, uid: "u1" });
    expect(await verifyAdmin(req({ authorization: "Bearer good" }))).toBe(true);
    expect(verifyIdToken).toHaveBeenCalledWith("good");
  });
});
