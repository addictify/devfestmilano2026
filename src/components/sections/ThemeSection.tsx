import { useTranslations } from "next-intl";
import { Bot, Cloud, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { colorClasses, type GdgColor } from "@/lib/design/tokens";
import { Container } from "@/components/common/Container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { MotionReveal } from "@/components/common/MotionReveal";

const PILLARS = [
  { key: "models", color: "blue", icon: Sparkles },
  { key: "agents", color: "red", icon: Bot },
  { key: "production", color: "green", icon: Cloud },
  { key: "responsible", color: "yellow", icon: ShieldCheck },
] as const satisfies ReadonlyArray<{
  key: string;
  color: GdgColor;
  icon: typeof Sparkles;
}>;

export function ThemeSection() {
  const t = useTranslations("theme");

  return (
    <section className="py-20 sm:py-28" id="theme">
      <Container>
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          lead={t("lead")}
          color="red"
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar, i) => {
            const c = colorClasses[pillar.color];
            const Icon = pillar.icon;
            return (
              <MotionReveal
                key={pillar.key}
                delay={(i % 4) * 0.06}
                className="group relative flex flex-col gap-4 overflow-hidden rounded-card border border-border bg-card p-7 transition-colors hover:border-foreground/15"
              >
                <span className={cn("absolute inset-x-0 top-0 h-1", c.bg)} />
                <span
                  className={cn(
                    "inline-flex size-12 items-center justify-center rounded-2xl",
                    c.bgSoft,
                    c.text,
                  )}
                >
                  <Icon className="size-6" />
                </span>
                <h3 className="font-display text-lg font-bold tracking-tight">
                  {t(`pillars.${pillar.key}.title`)}
                </h3>
                <p className="text-pretty text-sm text-muted-foreground">
                  {t(`pillars.${pillar.key}.body`)}
                </p>
              </MotionReveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
