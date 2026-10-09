import { formatInTimeZone } from "date-fns-tz";
import { siteConfig } from "@/lib/site";
import { romeInputToIso } from "@/lib/time";

/**
 * Session ratings open on the event day (midnight, Milan time) — before that
 * there is nothing to rate, and early votes were just tests polluting the
 * averages. Checked by /api/feedback, and by the form so it stays hidden.
 */
export const FEEDBACK_OPENS_AT = romeInputToIso(
  `${formatInTimeZone(new Date(siteConfig.eventDate), "Europe/Rome", "yyyy-MM-dd")}T00:00`,
)!;

export function isFeedbackOpen(now: Date = new Date()): boolean {
  return now.getTime() >= new Date(FEEDBACK_OPENS_AT).getTime();
}
