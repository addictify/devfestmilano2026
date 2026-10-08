"use client";

import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useSiteSettings } from "@/components/providers/SiteSettingsProvider";

/** Badge heights track the button sizes, so swapping one for the other
 *  doesn't shift the row it sits in. */
const SOLD_OUT_SIZE: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-9 px-4 text-[0.7rem]",
  md: "h-11 px-5 text-xs",
  lg: "h-13 px-7 text-sm",
  icon: "h-10 px-3 text-[0.7rem]",
};

/**
 * Ticket CTA. Renders disabled (tickets not on sale yet) until
 * `ticketsAvailable` is true (from context), then links to Bevy. Once
 * `ticketsSoldOut` is set it stops being a link at all: a "Sold out" stamp
 * in its place, so there's nothing to click through to a closed form.
 */
export function TicketButton({
  size = "md",
  className,
  label,
}: {
  size?: ButtonProps["size"];
  className?: string;
  /** Label for the enabled state (defaults to nav.tickets). */
  label?: string;
}) {
  const t = useTranslations("nav");
  const { ticketsAvailable, ticketsSoldOut } = useSiteSettings();

  if (ticketsSoldOut) {
    return (
      <span
        title={t("soldOutTitle")}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-full bg-gdg-red-solid font-mono font-semibold uppercase tracking-[0.18em] text-white",
          SOLD_OUT_SIZE[size ?? "md"],
          className,
        )}
      >
        {t("soldOut")}
      </span>
    );
  }

  if (!ticketsAvailable) {
    return (
      <Button
        variant="accent"
        size={size}
        disabled
        aria-disabled="true"
        title={t("ticketsSoon")}
        className={className}
      >
        {t("ticketsSoon")}
      </Button>
    );
  }

  return (
    <Button asChild variant="accent" size={size} className={className}>
      <a href={siteConfig.ticketsUrl} target="_blank" rel="noopener noreferrer">
        {label ?? t("tickets")}
        <ArrowUpRight className="size-4" />
      </a>
    </Button>
  );
}
