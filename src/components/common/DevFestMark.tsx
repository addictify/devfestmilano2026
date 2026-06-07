import { cn } from "@/lib/utils";
import { GDG } from "@/lib/design/tokens";

/**
 * The DevFest "< >" brackets mark in the four Google colors — year-independent,
 * scalable rebuild of the official logo mark.
 */
export function DevFestMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="DevFest"
      className={cn("h-6 w-auto", className)}
    >
      <g strokeWidth="6.5" strokeLinecap="round">
        {/* left chevron < */}
        <line x1="22" y1="3" x2="5" y2="14" stroke={GDG.red} />
        <line x1="5" y1="14" x2="22" y2="25" stroke={GDG.blue} />
        {/* right chevron > */}
        <line x1="38" y1="3" x2="55" y2="14" stroke={GDG.green} />
        <line x1="55" y1="14" x2="38" y2="25" stroke={GDG.yellow} />
      </g>
    </svg>
  );
}
