import { cn } from "@/lib/utils";
import { GDG_ORDER, GDG } from "@/lib/design/tokens";

/** The signature four-color beam. Horizontal by default. */
export function GdgColorBar({
  className,
  vertical = false,
}: {
  className?: string;
  vertical?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "block overflow-hidden",
        vertical ? "w-1" : "h-1 w-full",
        className,
      )}
    >
      <span className={cn("flex h-full w-full", vertical && "flex-col")}>
        {GDG_ORDER.map((c) => (
          <span
            key={c}
            className="flex-1"
            style={{ backgroundColor: GDG[c] }}
          />
        ))}
      </span>
    </span>
  );
}

/** Four colored dots — compact brand mark. */
export function GdgDots({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex items-center gap-1", className)}>
      {GDG_ORDER.map((c) => (
        <span
          key={c}
          className="size-2 rounded-full"
          style={{ backgroundColor: GDG[c] }}
        />
      ))}
    </span>
  );
}
