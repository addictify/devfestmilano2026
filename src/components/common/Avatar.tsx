import Image from "next/image";
import { cn } from "@/lib/utils";
import { colorForKey, GDG } from "@/lib/design/tokens";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Photo when available, otherwise a geometric color-coded initials tile. */
export function Avatar({
  name,
  src,
  className,
  rounded = "rounded-2xl",
}: {
  name: string;
  src?: string | null;
  className?: string;
  rounded?: string;
}) {
  if (src) {
    return (
      <div className={cn("relative overflow-hidden", rounded, className)}>
        <Image
          src={src}
          alt={name}
          fill
          sizes="(max-width: 768px) 50vw, 320px"
          className="object-cover"
        />
      </div>
    );
  }

  const color = GDG[colorForKey(name)];
  return (
    <div
      aria-hidden
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        rounded,
        className,
      )}
      style={{
        background: `radial-gradient(120% 120% at 30% 20%, ${color}26, transparent 60%), var(--card)`,
      }}
    >
      <span
        className="font-display text-[clamp(1.1rem,5vw,3.25rem)] font-extrabold"
        style={{ color }}
      >
        {initials(name)}
      </span>
      <span
        className="absolute inset-0"
        style={{ boxShadow: `inset 0 0 0 1px ${color}33` }}
      />
    </div>
  );
}
