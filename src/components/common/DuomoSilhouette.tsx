import { cn } from "@/lib/utils";

/**
 * Abstract Milano skyline — the Duomo's pinnacles and the Galleria arch,
 * stylized as a row of spires. Decorative only.
 */
export function DuomoSilhouette({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      preserveAspectRatio="xMidYMax meet"
      className={cn("w-full", className)}
    >
      <g fill="currentColor">
        {/* baseline buildings */}
        <rect x="0" y="92" width="480" height="28" />
        {/* left low spires */}
        <path d="M24 92V70l8-12 8 12v22z" />
        <path d="M48 92V64l7-10 7 10v28z" />
        <path d="M74 92V58l9-14 9 14v34z" />
        {/* rising toward center */}
        <path d="M104 92V48l10-18 10 18v44z" />
        <path d="M136 92V40l11-22 11 22v52z" />
        <path d="M172 92V30l12-26 12 26v62z" />
        {/* central tallest spire (Madonnina) */}
        <path d="M214 92V20l4-8 2-12 2 12 4 8v72z" />
        <circle cx="222" cy="6" r="3" />
        <path d="M252 92V30l12-26 12 26v62z" />
        {/* descending */}
        <path d="M296 92V40l11-22 11 22v52z" />
        <path d="M330 92V48l10-18 10 18v44z" />
        {/* Galleria arch */}
        <path
          d="M364 92V66c0-14 11-25 25-25s25 11 25 25v26h-12V66a13 13 0 0 0-26 0v26z"
        />
        <path d="M428 92V58l9-14 9 14v34z" />
        <path d="M456 92V66l6-9 6 9v26z" />
      </g>
    </svg>
  );
}
