import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("emits a header then rows in column order", () => {
    const csv = toCsv([{ a: "1", b: "2" }], ["a", "b"]);
    expect(csv).toBe("a,b\r\n1,2");
  });
  it("escapes commas, quotes, and newlines per RFC 4180", () => {
    const csv = toCsv([{ a: 'x,y', b: 'he said "hi"', c: "line1\nline2" }], ["a", "b", "c"]);
    expect(csv).toBe('a,b,c\r\n"x,y","he said ""hi""","line1\nline2"');
  });
  it("renders null/undefined as empty", () => {
    expect(toCsv([{ a: null, b: undefined }], ["a", "b"])).toBe("a,b\r\n,");
  });
});
