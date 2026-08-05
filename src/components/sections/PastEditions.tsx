import { useTranslations } from "next-intl";
import { GDG, GDG_ORDER } from "@/lib/design/tokens";
import { Container } from "@/components/common/Container";
import { MotionReveal } from "@/components/common/MotionReveal";

const EDITIONS = ["2018", "2019", "2022", "2023", "2024", "2025"];

function MarqueeRow() {
  const items = [...EDITIONS, ...EDITIONS];
  return (
    <div className="flex w-max motion-safe:animate-marquee">
      {items.map((year, i) => (
        <span key={i} className="flex items-center">
          <span className="px-6 font-display text-6xl font-extrabold tracking-tighter text-foreground/[0.10] sm:text-7xl">
            DevFest {year}
          </span>
          <span
            className="size-3 rounded-full"
            style={{ backgroundColor: GDG[GDG_ORDER[i % 4]] }}
          />
        </span>
      ))}
    </div>
  );
}

export function PastEditions() {
  const t = useTranslations("past");

  return (
    <section className="overflow-hidden py-20 sm:py-28">
      <Container>
        <MotionReveal className="flex flex-col gap-3">
          <h2 className="max-w-2xl text-balance text-3xl font-bold sm:text-4xl">
            {t("title")}
          </h2>
          <p className="max-w-xl text-muted-foreground">{t("lead")}</p>
        </MotionReveal>
      </Container>

      <div className="mask-fade-x mt-12 overflow-hidden" aria-hidden>
        <MarqueeRow />
      </div>
    </section>
  );
}
