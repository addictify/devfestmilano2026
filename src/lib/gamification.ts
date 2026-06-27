export type GameProfile = { points: number; badgeIds: string[]; scanCount: number };
export type MilestoneBadge = { id: string; milestone: number };
export type QuizMode = "add" | "multiply";
export type QuizConfig = {
  points: number;
  answer?: string;
  quizMode?: QuizMode;
  quizValue?: number;
  wrongPenalty?: number;
};

export function validateScan(
  checkpoint: { active: boolean; secret: string } | null,
  token: string,
): "ok" | "not-found" | "inactive" | "bad-token" {
  if (!checkpoint) return "not-found";
  if (!checkpoint.active) return "inactive";
  if (checkpoint.secret !== token) return "bad-token";
  return "ok";
}

export function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Points delta for a scan, accounting for an optional quiz. A checkpoint "has a
 *  quiz" iff it has an `answer`. Wrong answers subtract the penalty from the base
 *  (the total may go negative — no clamp). */
export function quizOutcome(
  checkpoint: QuizConfig,
  submittedAnswer?: string,
): { correct: boolean | null; pointsDelta: number } {
  if (!checkpoint.answer) return { correct: null, pointsDelta: checkpoint.points };
  const correct =
    submittedAnswer != null &&
    normalizeAnswer(submittedAnswer) === normalizeAnswer(checkpoint.answer);
  if (correct) {
    const v = checkpoint.quizValue ?? 0;
    const pointsDelta =
      checkpoint.quizMode === "multiply" ? checkpoint.points * (v || 1) : checkpoint.points + v;
    return { correct: true, pointsDelta };
  }
  return { correct: false, pointsDelta: checkpoint.points - (checkpoint.wrongPenalty ?? 0) };
}

/** New profile after a FIRST-TIME scan (caller guarantees no prior scan doc).
 *  `pointsDelta` (from quizOutcome) may be negative; the total is NOT clamped. */
export function awardForScan(
  profile: GameProfile,
  pointsDelta: number,
  badgeId: string | undefined,
  milestoneBadges: MilestoneBadge[],
): GameProfile {
  const scanCount = profile.scanCount + 1;
  const badgeIds = [...profile.badgeIds];
  const add = (id?: string) => {
    if (id && !badgeIds.includes(id)) badgeIds.push(id);
  };
  add(badgeId);
  for (const m of milestoneBadges) if (scanCount >= m.milestone) add(m.id);
  return { points: profile.points + pointsDelta, badgeIds, scanCount };
}

export function parseQrPayload(text: string): { checkpointId: string; token: string } | null {
  const parts = text.split(":");
  if (parts.length !== 3 || parts[0] !== "DFQ") return null;
  const [, checkpointId, token] = parts;
  if (!checkpointId || !token) return null;
  return { checkpointId, token };
}
