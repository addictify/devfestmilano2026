import { cn } from "@/lib/utils";

/**
 * Flags for the two site languages.
 *
 * Drawn rather than set as emoji: 🇮🇹 renders as the letters "IT" on Windows,
 * which is worse than no flag at all next to a label that already says the
 * language.
 *
 * A flag is a country, not a language, so it never appears alone here — the
 * written name is always beside it, and the flag is `aria-hidden` so a screen
 * reader gets the language once, not a country and a language.
 */
export function Flag({
  locale,
  className,
}: {
  locale: string;
  className?: string;
}) {
  // A hairline ring so the white band still has an edge against a light card
  // and against a dark one.
  const shared = cn(
    "shrink-0 rounded-[2px] ring-1 ring-foreground/15",
    className ?? "h-3 w-[18px]",
  );

  if (locale === "it") {
    return (
      <svg viewBox="0 0 3 2" className={shared} aria-hidden focusable="false">
        <rect width="1" height="2" x="0" fill="#009246" />
        <rect width="1" height="2" x="1" fill="#FFFFFF" />
        <rect width="1" height="2" x="2" fill="#CE2B37" />
      </svg>
    );
  }

  if (locale === "en") {
    return (
      // No clipPath: an id would collide the moment two flags share a page,
      // and the outer <svg> already clips what runs past the viewBox.
      <svg viewBox="0 0 60 30" className={shared} aria-hidden focusable="false">
        <path d="M0 0h60v30H0z" fill="#012169" />
        <path d="M0 0l60 30m0-30L0 30" stroke="#FFFFFF" strokeWidth="6" />
        <path d="M0 0l60 30m0-30L0 30" stroke="#C8102E" strokeWidth="4" />
        <path d="M30 0v30M0 15h60" stroke="#FFFFFF" strokeWidth="10" />
        <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" />
      </svg>
    );
  }

  return null;
}
