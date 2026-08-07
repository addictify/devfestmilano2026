import { useTranslations } from "next-intl";
import { Code2, Users, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { GDG_ORDER, GDG, colorClasses } from "@/lib/design/tokens";
import { Container } from "@/components/common/Container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { MotionReveal } from "@/components/common/MotionReveal";

export function WhatToExpect() {
  const s = useTranslations("stats");
  const e = useTranslations("expect");

  const stats = [
    { value: s("talksValue"), label: s("talks") },
    { value: s("tracksValue"), label: s("tracks") },
    { value: s("speakersValue"), label: s("speakers") },
    { value: s("attendeesValue"), label: s("attendees") },
  ];

  const cards = [
    {
      icon: Code2,
      title: e("talksTitle"),
      body: e("talksBody"),
      color: "blue" as const,
    },
    {
      icon: Wrench,
      title: e("workshopsTitle"),
      body: e("workshopsBody"),
      color: "red" as const,
    },
    {
      icon: Users,
      title: e("communityTitle"),
      body: e("communityBody"),
      color: "green" as const,
    },
  ];

  return (
    <section className="py-20 sm:py-28" id="about">
      <Container>
        {/* Stats band */}
        <MotionReveal className="grid auto-rows-fr grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border lg:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="flex flex-col gap-1 bg-card p-6 sm:p-8"
            >
              <span
                className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl"
                style={{ color: GDG[GDG_ORDER[i]] }}
              >
                {stat.value}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </span>
            </div>
          ))}
        </MotionReveal>

        {/* Feature cards */}
        <div className="mt-16">
          <SectionHeading
            eyebrow={s("title")}
            title={e("title")}
            color="yellow"
          />
          <div className="mt-12 grid auto-rows-fr gap-5 md:grid-cols-3">
            {cards.map((card, i) => {
              const c = colorClasses[card.color];
              const Icon = card.icon;
              return (
                <MotionReveal
                  key={card.title}
                  delay={i * 0.08}
                  className="group flex flex-col gap-4 rounded-card border border-border bg-card p-7 transition-colors hover:border-foreground/15"
                >
                  <span
                    className={cn(
                      "inline-flex size-12 items-center justify-center rounded-2xl",
                      c.bgSoft,
                      c.text,
                    )}
                  >
                    <Icon className="size-6" />
                  </span>
                  <h3 className="font-display text-xl font-bold tracking-tight">
                    {card.title}
                  </h3>
                  <p className="text-pretty text-muted-foreground">
                    {card.body}
                  </p>
                </MotionReveal>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
