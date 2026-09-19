import { describe, expect, it } from "vitest";
import {
  formatAverage,
  MIN_PUBLIC_RATINGS,
  nextAggregate,
  publicRating,
  type RatingAggregate,
} from "@/lib/feedback-aggregate";

describe("nextAggregate", () => {
  it("counts a first rating", () => {
    expect(nextAggregate(null, null, 4)).toEqual({ count: 1, sum: 4, average: 4 });
  });

  it("adds a second person", () => {
    const one: RatingAggregate = { count: 1, sum: 4, average: 4 };
    expect(nextAggregate(one, null, 5)).toEqual({ count: 2, sum: 9, average: 4.5 });
  });

  it("does not count the same person twice when they revise their vote", () => {
    // The whole reason this is a pure function: "+1 vote, +rating" would turn
    // one person changing 3 → 5 into two votes averaging 4.
    const before: RatingAggregate = { count: 2, sum: 8, average: 4 };
    expect(nextAggregate(before, 3, 5)).toEqual({ count: 2, sum: 10, average: 5 });
  });

  it("lets a revision lower the average", () => {
    const before: RatingAggregate = { count: 2, sum: 10, average: 5 };
    expect(nextAggregate(before, 5, 1)).toEqual({ count: 2, sum: 6, average: 3 });
  });

  it("is a no-op when someone re-submits the same rating", () => {
    const before: RatingAggregate = { count: 3, sum: 12, average: 4 };
    expect(nextAggregate(before, 4, 4)).toEqual(before);
  });

  it("adopts a response written before the counter existed", () => {
    // No parent document, but the person already had a response of 5: their
    // vote is the aggregate, and changing it must not invent a second voter.
    expect(nextAggregate(null, 5, 2)).toEqual({ count: 1, sum: 2, average: 2 });
  });

  it("survives a corrupt or half-written parent document", () => {
    expect(nextAggregate({ count: NaN, sum: undefined }, null, 3)).toEqual({
      count: 1,
      sum: 3,
      average: 3,
    });
  });

  it("never divides by zero", () => {
    expect(nextAggregate({ count: 0, sum: 0 }, null, 2).average).toBe(2);
  });
});

describe("formatAverage", () => {
  it("shows one decimal", () => {
    expect(formatAverage(4)).toBe("4.0");
    expect(formatAverage(13 / 3)).toBe("4.3");
    expect(formatAverage(4.25)).toBe("4.3");
  });
});

describe("publicRating", () => {
  it("never publishes the sum", () => {
    // The first version of this leaked {sum: 5, count: 1} to anyone with the
    // URL — one division away from that single person's rating.
    const published = publicRating({ count: 9, sum: 40, average: 40 / 9 });
    expect(published).not.toHaveProperty("sum");
    expect(Object.keys(published).sort()).toEqual(["average", "count"]);
  });

  it("withholds the average below the threshold", () => {
    for (let count = 0; count < MIN_PUBLIC_RATINGS; count++) {
      const published = publicRating({ count, sum: count * 5, average: 5 });
      expect(published.average, `count=${count}`).toBeUndefined();
      // The count alone says nothing about what anyone thought.
      expect(published.count).toBe(count);
    }
  });

  it("publishes the average from the threshold up", () => {
    const published = publicRating({
      count: MIN_PUBLIC_RATINGS,
      sum: 12,
      average: 4,
    });
    expect(published).toEqual({ count: MIN_PUBLIC_RATINGS, average: 4 });
  });

  it("stops publishing if the count ever falls back below it", () => {
    // set() without merge is what makes this true in Firestore; here we only
    // assert the projection agrees.
    expect(publicRating({ count: 2, sum: 9, average: 4.5 }).average).toBeUndefined();
  });
});
