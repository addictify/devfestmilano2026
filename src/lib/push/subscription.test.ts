import { describe, expect, it } from "vitest";
import {
  announcementPayload,
  clampText,
  isGoneStatus,
  isValidSubscription,
  reminderPayload,
  sessionsDueForReminder,
  subscriptionId,
} from "@/lib/push/subscription";

describe("subscriptionId", () => {
  it("is stable for the same endpoint", () => {
    const endpoint = "https://fcm.googleapis.com/fcm/send/abc123";
    expect(subscriptionId(endpoint)).toBe(subscriptionId(endpoint));
  });

  it("differs between endpoints", () => {
    expect(subscriptionId("https://a.example/1")).not.toBe(
      subscriptionId("https://a.example/2"),
    );
  });

  it("is a legal Firestore document id", () => {
    // Endpoints are long URLs full of slashes; ids may be neither.
    const id = subscriptionId("https://fcm.googleapis.com/fcm/send/" + "x".repeat(2000));
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("isValidSubscription", () => {
  const valid = {
    endpoint: "https://fcm.googleapis.com/fcm/send/abc",
    keys: { p256dh: "key", auth: "auth" },
  };

  it("accepts a well-formed subscription", () => {
    expect(isValidSubscription(valid)).toBe(true);
  });

  it("rejects a non-https endpoint", () => {
    expect(isValidSubscription({ ...valid, endpoint: "http://evil.example/x" })).toBe(false);
  });

  it("rejects missing or partial keys", () => {
    expect(isValidSubscription({ ...valid, keys: undefined })).toBe(false);
    expect(isValidSubscription({ ...valid, keys: { p256dh: "k" } })).toBe(false);
    expect(isValidSubscription({ ...valid, keys: { p256dh: "", auth: "a" } })).toBe(false);
  });

  it("rejects junk", () => {
    expect(isValidSubscription(null)).toBe(false);
    expect(isValidSubscription("https://fcm.googleapis.com/x")).toBe(false);
    expect(isValidSubscription({})).toBe(false);
  });
});

describe("clampText", () => {
  it("leaves short text alone", () => {
    expect(clampText("  Keynote   starts ", 80)).toBe("Keynote starts");
  });

  it("cuts on a word boundary when there is one", () => {
    expect(clampText("alpha beta gamma delta", 16)).toBe("alpha beta…");
  });

  it("cuts mid-word rather than losing most of the text", () => {
    expect(clampText("supercalifragilistic", 10)).toBe("supercali…");
  });
});

describe("announcementPayload", () => {
  it("points at the agenda in the reader's language", () => {
    expect(announcementPayload("Titolo", "Corpo", "it").url).toBe("/it/agenda");
    expect(announcementPayload("Title", "Body", "en").url).toBe("/en/agenda");
  });

  it("shares one tag, so a new announcement replaces an unread one", () => {
    expect(announcementPayload("A", "1", "it").tag).toBe(
      announcementPayload("B", "2", "it").tag,
    );
  });
});

describe("reminderPayload", () => {
  it("names the room when there is one", () => {
    const p = reminderPayload({ id: "s1", title: "Talk", roomName: "Nexus" }, 15, "it");
    expect(p.body).toBe("Inizia tra 15 minuti · Nexus");
    expect(p.title).toBe("Talk");
  });

  it("omits the room when there isn't one", () => {
    expect(reminderPayload({ id: "s1", title: "Talk" }, 15, "en").body).toBe(
      "Starts in 15 minutes",
    );
  });

  it("tags per session, so one talk can never buzz twice", () => {
    const a = reminderPayload({ id: "s1", title: "Talk" }, 15, "it");
    const b = reminderPayload({ id: "s2", title: "Other" }, 15, "it");
    expect(a.tag).not.toBe(b.tag);
    expect(a.tag).toBe("devfest-session-s1");
  });
});

describe("sessionsDueForReminder", () => {
  const now = new Date("2026-10-10T08:00:00.000Z");
  const session = (id: string, startsAt: string | null, isServiceSession = false) => ({
    id,
    startsAt,
    isServiceSession,
  });

  it("picks only what starts inside the window", () => {
    const due = sessionsDueForReminder(
      [
        session("early", "2026-10-10T08:10:00.000Z"), // in 10 min — too soon
        session("due", "2026-10-10T08:16:00.000Z"), // in 16 min — inside
        session("late", "2026-10-10T08:30:00.000Z"), // in 30 min — not yet
      ],
      now,
      15,
      5,
    );
    expect(due.map((s) => s.id)).toEqual(["due"]);
  });

  it("is half-open, so consecutive runs never remind twice", () => {
    const boundary = [session("edge", "2026-10-10T08:20:00.000Z")];
    // Window [08:15, 08:20) excludes it; the next run's [08:20, 08:25) takes it.
    expect(sessionsDueForReminder(boundary, now, 15, 5)).toEqual([]);
    expect(
      sessionsDueForReminder(boundary, new Date("2026-10-10T08:05:00.000Z"), 15, 5),
    ).toHaveLength(1);
  });

  it("never reminds about a coffee break", () => {
    const due = sessionsDueForReminder(
      [session("break", "2026-10-10T08:16:00.000Z", true)],
      now,
      15,
      5,
    );
    expect(due).toEqual([]);
  });

  it("skips sessions with no time and unparseable ones", () => {
    const due = sessionsDueForReminder(
      [session("tba", null), session("junk", "not a date")],
      now,
      15,
      5,
    );
    expect(due).toEqual([]);
  });
});

describe("isGoneStatus", () => {
  it("retires an endpoint the push service says is gone", () => {
    expect(isGoneStatus(404)).toBe(true);
    expect(isGoneStatus(410)).toBe(true);
  });

  it("keeps the subscription on a transient failure", () => {
    // Deleting on a 429 or a 503 would unsubscribe people who did nothing.
    for (const status of [undefined, 0, 400, 401, 413, 429, 500, 502, 503]) {
      expect(isGoneStatus(status), String(status)).toBe(false);
    }
  });
});
