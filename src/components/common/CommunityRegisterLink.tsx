"use client";

import { useTranslations } from "next-intl";
import { ArrowUpRight, Ticket } from "lucide-react";
import { useSiteSettings } from "@/components/providers/SiteSettingsProvider";

/**
 * Per-chapter registration link. The event is co-hosted, so each community has
 * its own Bevy page; the site-wide CTA points at one of them, this surfaces the
 * other. Renders nothing until `ticketsAvailable` flips (client-side because
 * the community cards are static server components).
 */
export function CommunityRegisterLink({
  href,
  communityName,
}: {
  href: string;
  communityName: string;
}) {
  const t = useTranslations("communities");
  const { ticketsAvailable } = useSiteSettings();

  if (!ticketsAvailable) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-foreground/30"
    >
      <Ticket className="size-4 text-muted-foreground" />
      {t("register", { community: communityName })}
      <ArrowUpRight className="size-4 text-muted-foreground" />
    </a>
  );
}
