"use client";

import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useSiteSettings } from "@/components/providers/SiteSettingsProvider";

/**
 * Ticket CTA. Renders disabled (tickets not on sale yet) until
 * `ticketsAvailable` is true (from context), then links to Bevy.
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
  const { ticketsAvailable } = useSiteSettings();

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
