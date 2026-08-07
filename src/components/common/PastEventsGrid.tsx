import { useLocale } from "next-intl";
import { pastEvents } from "@/lib/data/past-events";
import { cn } from "@/lib/utils";
import { colorClasses } from "@/lib/design/tokens";
import { localized } from "@/lib/localize";
import { MotionReveal } from "./MotionReveal";

export function PastEventsGrid() {
  const locale = useLocale();

  return (
    <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {pastEvents.map((event, i) => {
        const c = colorClasses[event.color];
        return (
          <MotionReveal
            key={event.id}
            delay={(i % 4) * 0.06}
            className="relative flex flex-col overflow-hidden rounded-card border border-border bg-card p-6"
          >
            <span className={cn("absolute inset-x-0 top-0 h-1", c.bg)} />
            <span
              className={cn(
                "w-fit rounded-full px-2.5 py-0.5 font-mono text-xs uppercase tracking-wider",
                c.bgSoft,
                c.text,
              )}
            >
              {event.label}
            </span>
            <h4 className="mt-4 font-display text-lg font-bold tracking-tight">
              {localized(event.title, locale)}
            </h4>
            <p className="mt-2 text-sm text-muted-foreground">
              {localized(event.description, locale)}
            </p>
          </MotionReveal>
        );
      })}
    </div>
  );
}
