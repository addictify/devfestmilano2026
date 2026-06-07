import { cn } from "@/lib/utils";
import { colorClasses, type GdgColor } from "@/lib/design/tokens";
import { MotionReveal } from "./MotionReveal";

export function SectionHeading({
  eyebrow,
  title,
  lead,
  color = "blue",
  align = "left",
  className,
  id,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  color?: GdgColor;
  align?: "left" | "center";
  className?: string;
  id?: string;
}) {
  const c = colorClasses[color];
  return (
    <MotionReveal
      className={cn(
        "flex max-w-3xl flex-col gap-4",
        align === "center" && "mx-auto items-center text-center",
        className,
      )}
    >
      {eyebrow && (
        <span className="eyebrow flex items-center gap-2 text-muted-foreground">
          <span className={cn("size-2 rounded-full", c.dot)} />
          {eyebrow}
        </span>
      )}
      <h2
        id={id}
        className="text-balance text-4xl font-bold sm:text-5xl lg:text-6xl"
      >
        {title}
      </h2>
      {lead && (
        <p className="text-pretty text-lg text-muted-foreground sm:text-xl">
          {lead}
        </p>
      )}
    </MotionReveal>
  );
}
