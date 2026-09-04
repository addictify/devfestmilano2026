import { describe, expect, it } from "vitest";
import { decodeFields, decodeValue, docIdFromName } from "@/lib/data/firestore-rest";

describe("decodeValue", () => {
  it("unwraps the scalar types Firestore uses", () => {
    expect(decodeValue({ stringValue: "hi" })).toBe("hi");
    expect(decodeValue({ booleanValue: true })).toBe(true);
    expect(decodeValue({ nullValue: null })).toBeNull();
    expect(decodeValue({ doubleValue: 1.5 })).toBe(1.5);
    expect(decodeValue({ timestampValue: "2026-10-10T09:00:00Z" })).toBe(
      "2026-10-10T09:00:00Z",
    );
  });

  it("turns integerValue back into a number — the API sends it as a string", () => {
    expect(decodeValue({ integerValue: "42" })).toBe(42);
    expect(decodeValue({ integerValue: "0" })).toBe(0);
  });

  it("recurses into maps, which is how localized fields arrive", () => {
    expect(
      decodeValue({
        mapValue: {
          fields: { it: { stringValue: "Sviluppatore" }, en: { stringValue: "Developer" } },
        },
      }),
    ).toEqual({ it: "Sviluppatore", en: "Developer" });
  });

  it("recurses into arrays, including arrays of maps", () => {
    expect(
      decodeValue({
        arrayValue: {
          values: [
            { stringValue: "a" },
            { integerValue: "2" },
            { mapValue: { fields: { k: { stringValue: "v" } } } },
          ],
        },
      }),
    ).toEqual(["a", 2, { k: "v" }]);
  });

  it("treats an empty array or map as empty, not missing", () => {
    expect(decodeValue({ arrayValue: {} })).toEqual([]);
    expect(decodeValue({ mapValue: {} })).toEqual({});
  });

  it("returns undefined for nothing and for unknown wrappers", () => {
    expect(decodeValue(undefined)).toBeUndefined();
    expect(decodeValue({ somethingNew: 1 })).toBeUndefined();
  });
});

describe("decodeFields", () => {
  it("builds a plain object and drops undecodable fields", () => {
    expect(
      decodeFields({
        name: { stringValue: "Ada" },
        order: { integerValue: "3" },
        weird: { unknownValue: true },
      }),
    ).toEqual({ name: "Ada", order: 3 });
  });

  it("keeps false and null, which are real values", () => {
    expect(
      decodeFields({ active: { booleanValue: false }, photo: { nullValue: null } }),
    ).toEqual({ active: false, photo: null });
  });
});

describe("docIdFromName", () => {
  it("takes the last path segment", () => {
    expect(
      docIdFromName("projects/p/databases/(default)/documents/team/abc123"),
    ).toBe("abc123");
  });
});
