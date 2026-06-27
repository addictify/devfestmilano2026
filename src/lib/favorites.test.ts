import { afterEach, describe, expect, it, vi } from "vitest";
import { FAVORITES_LS_KEY, mergeFavorites, readLocal, writeLocal } from "@/lib/favorites";

function stubStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return store;
}
afterEach(() => vi.unstubAllGlobals());

describe("mergeFavorites", () => {
  it("unions and dedups, preserving first-seen order", () => {
    expect(mergeFavorites(["a", "b"], ["b", "c"])).toEqual(["a", "b", "c"]);
  });
  it("handles empties", () => {
    expect(mergeFavorites([], ["x"])).toEqual(["x"]);
    expect(mergeFavorites(["x"], [])).toEqual(["x"]);
  });
});

describe("readLocal / writeLocal", () => {
  it("round-trips", () => {
    stubStorage();
    writeLocal(["s1", "s2"]);
    expect(readLocal()).toEqual(["s1", "s2"]);
  });
  it("returns [] on missing", () => {
    stubStorage();
    expect(readLocal()).toEqual([]);
  });
  it("returns [] on corrupt JSON", () => {
    const store = stubStorage();
    store.set(FAVORITES_LS_KEY, "{not json");
    expect(readLocal()).toEqual([]);
  });
  it("returns [] when localStorage is absent (SSR)", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(readLocal()).toEqual([]);
  });
});
