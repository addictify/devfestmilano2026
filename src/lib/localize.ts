import type { LocalizedString } from "@/types/models";

type Locale = "it" | "en";

/** Pick the right language from a bilingual field, falling back to Italian. */
export function localized(
  value: LocalizedString | undefined | null,
  locale: string,
): string {
  if (!value) return "";
  const l = (locale as Locale) in value ? (locale as Locale) : "it";
  return value[l] ?? value.it ?? value.en ?? "";
}
