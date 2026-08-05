"use client";

import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { TicketButton } from "@/components/common/TicketButton";
import { useSiteSettings } from "@/components/providers/SiteSettingsProvider";

/**
 * Footer column: "follow us for the ticket drop" before registration opens,
 * the actual registration CTA after — driven by the same `ticketsAvailable`
 * flag as every other ticket CTA.
 */
export function FooterTickets() {
  const t = useTranslations("footer");
  const { ticketsAvailable } = useSiteSettings();

  return (
    <div className="flex flex-col gap-4">
      <h3 className="eyebrow text-muted-foreground">
        {ticketsAvailable ? t("tickets") : t("newsletter")}
      </h3>
      <p className="text-sm text-muted-foreground">
        {ticketsAvailable ? t("ticketsBody") : t("newsletterBody")}
      </p>
      {ticketsAvailable ? (
        <TicketButton size="sm" className="w-fit" />
      ) : (
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/communities">
            {t("join")}
            <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}
