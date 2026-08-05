import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { colorClasses } from "@/lib/design/tokens";
import { localized } from "@/lib/localize";
import type { Community } from "@/lib/data/communities";
import { CommunityRegisterLink } from "./CommunityRegisterLink";

export function CommunityCard({ community }: { community: Community }) {
  const locale = useLocale();
  const t = useTranslations("communities");
  const c = colorClasses[community.color];

  return (
    <div className="relative flex flex-col overflow-hidden rounded-card border border-border bg-card p-7">
      <span className={cn("absolute inset-x-0 top-0 h-1.5", c.bg)} />
      <span className={cn("eyebrow", c.text)}>
        {localized(community.focus, locale)}
      </span>
      <h3 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        {community.name}
      </h3>
      <p className="mt-4 flex-1 text-pretty leading-relaxed text-muted-foreground">
        {localized(community.description, locale)}
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <a
          href={community.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "group inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-transform hover:-translate-y-0.5",
            c.solidBg,
            c.onSolid,
          )}
        >
          {t("visit")}
          <ArrowUpRight className="size-4" />
        </a>
        <a
          href={community.meetup}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-foreground/30"
        >
          Meetup
          <ArrowUpRight className="size-4 text-muted-foreground" />
        </a>
        <CommunityRegisterLink
          href={community.registrationUrl}
          communityName={community.name}
        />
      </div>
    </div>
  );
}
