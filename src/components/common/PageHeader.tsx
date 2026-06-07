import { cn } from "@/lib/utils";
import { colorClasses, type GdgColor } from "@/lib/design/tokens";
import { Container } from "./Container";
import { GdgColorBar } from "./GdgColorBar";
import { MotionReveal } from "./MotionReveal";

export function PageHeader({
  eyebrow,
  title,
  lead,
  color = "blue",
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  color?: GdgColor;
  children?: React.ReactNode;
}) {
  const c = colorClasses[color];
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div aria-hidden className="absolute inset-0 bg-dot-grid opacity-60" />
      <Container className="relative pt-14 pb-12 sm:pt-20 sm:pb-16">
        <MotionReveal className="flex max-w-3xl flex-col gap-4">
          {eyebrow && (
            <span className="eyebrow flex items-center gap-2 text-muted-foreground">
              <span className={cn("size-2 rounded-full", c.dot)} />
              {eyebrow}
            </span>
          )}
          <h1 className="text-balance text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            {title}
          </h1>
          {lead && (
            <p className="text-pretty text-lg text-muted-foreground sm:text-xl">
              {lead}
            </p>
          )}
          {children}
        </MotionReveal>
      </Container>
      <GdgColorBar className="absolute inset-x-0 bottom-0 opacity-90" />
    </section>
  );
}
