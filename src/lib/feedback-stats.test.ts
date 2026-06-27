import { describe, expect, it } from "vitest";
import { aggregate } from "@/lib/feedback-stats";

describe("aggregate", () => {
  it("empty → zeros", () => {
    expect(aggregate([])).toEqual({ count: 0, average: 0, distribution: [0, 0, 0, 0, 0], comments: [] });
  });
  it("counts, averages (1dp), buckets, collects non-empty comments", () => {
    const r = aggregate([
      { rating: 5, comment: "great" },
      { rating: 4 },
      { rating: 4, comment: "  " },
      { rating: 2, comment: "meh" },
    ]);
    expect(r.count).toBe(4);
    expect(r.average).toBe(3.8);                 // (5+4+4+2)/4 = 3.75 → 3.8
    expect(r.distribution).toEqual([0, 1, 0, 2, 1]); // idx0=1★ ... idx4=5★
    expect(r.comments).toEqual(["great", "meh"]);    // blank dropped
  });
});
