import { describe, expect, it } from "vitest";
import { contentFingerprint } from "@/lib/sessionize/fingerprint";

describe("contentFingerprint", () => {
  it("is stable for the same data", () => {
    const a = { speakers: [{ id: "1", name: "Ada" }] };
    expect(contentFingerprint(a)).toBe(contentFingerprint(structuredClone(a)));
  });

  it("ignores key order — the API isn't guaranteed to be consistent", () => {
    expect(contentFingerprint({ a: 1, b: 2 })).toBe(contentFingerprint({ b: 2, a: 1 }));
  });

  it("changes when a talk is added", () => {
    const before = { sessions: [{ id: "1", title: "Talk" }] };
    const after = { sessions: [{ id: "1", title: "Talk" }, { id: "2", title: "New" }] };
    expect(contentFingerprint(before)).not.toBe(contentFingerprint(after));
  });

  it("changes when a field is edited, including nested ones", () => {
    expect(contentFingerprint({ s: [{ t: { it: "Ciao" } }] })).not.toBe(
      contentFingerprint({ s: [{ t: { it: "Salve" } }] }),
    );
  });

  it("respects array order, since it drives display order", () => {
    expect(contentFingerprint([{ id: "a" }, { id: "b" }])).not.toBe(
      contentFingerprint([{ id: "b" }, { id: "a" }]),
    );
  });
});
