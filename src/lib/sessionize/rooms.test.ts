import { describe, expect, it } from "vitest";
import { normalizeSessionize } from "@/lib/sessionize/normalize";
import type { SzAll } from "@/lib/sessionize/types";

/**
 * The /view/All payload carries `roomId` on a session but not the room's name;
 * only the grid-shaped views include `room`. Reading `room` alone left every
 * session without a roomName, which is what the agenda card prints and what the
 * calendar export uses as the event location.
 */
function payload(session: Partial<SzAll["sessions"][number]>): SzAll {
  return {
    rooms: [
      { id: 84252, name: "Nexus", sort: 1 },
      { id: 84253, name: "Coworking", sort: 2 },
    ],
    categories: [],
    speakers: [],
    questions: [],
    sessions: [
      {
        id: "1",
        title: "A talk",
        description: "",
        startsAt: "2026-10-10T09:30:00",
        endsAt: "2026-10-10T10:15:00",
        isServiceSession: false,
        isPlenumSession: false,
        speakers: [],
        categoryItems: [],
        questionAnswers: [],
        roomId: null,
        room: null,
        liveUrl: null,
        recordingUrl: null,
        status: "Accepted",
        isInformed: true,
        isConfirmed: true,
        ...session,
      },
    ],
  } as unknown as SzAll;
}

describe("normalizeSessionize room resolution", () => {
  it("resolves the room name from roomId when the payload omits `room`", () => {
    const { sessions } = normalizeSessionize(payload({ roomId: 84253 }));
    expect(sessions[0].roomName).toBe("Coworking");
  });

  it("prefers an explicit `room` string when a view does supply one", () => {
    const { sessions } = normalizeSessionize(
      payload({ roomId: 84252, room: "Sala Blu" }),
    );
    expect(sessions[0].roomName).toBe("Sala Blu");
  });

  it("leaves roomName undefined for an unscheduled session", () => {
    const { sessions } = normalizeSessionize(payload({ roomId: null }));
    expect(sessions[0].roomName).toBeUndefined();
  });

  it("leaves roomName undefined when the room id is unknown", () => {
    const { sessions } = normalizeSessionize(payload({ roomId: 99999 }));
    expect(sessions[0].roomName).toBeUndefined();
  });
});
