import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Sponsor, SponsorTier as Tier } from "@/types/models";

// Tile prominence by tier. Logos sit on white tiles so they read in any theme.
const TIER_TILE: Record<Tier, string> = {
  platinum: "h-28 w-full max-w-sm",
  gold: "h-24 w-72",
  venue: "h-24 w-72",
  silver: "h-20 w-56",
  bronze: "h-16 w-44",
  community: "h-20 w-56",
  inkind: "h-20 w-56",
};

function SponsorLogo({ sponsor, tile }: { sponsor: Sponsor; tile: string }) {
  const inner = sponsor.logoLight ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sponsor.logoLight}
      alt={sponsor.name}
      loading="lazy"
      className="max-h-full max-w-full object-contain"
    />
  ) : (
    <span className="font-display text-xl font-bold tracking-tight text-zinc-800">
      {sponsor.name}
    </span>
  );

  const className = cn(
    "group flex items-center justify-center rounded-2xl border border-border bg-white p-7 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-20px_rgba(0,0,0,0.4)]",
    tile,
  );

  const hasLink = Boolean(sponsor.website && sponsor.website !== "#");
  return hasLink ? (
    <a
      href={sponsor.website}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={sponsor.name}
      className={className}
    >
      {inner}
    </a>
  ) : (
    <div aria-label={sponsor.name} className={className}>
      {inner}
    </div>
  );
}

export function SponsorTierBlock({
  tier,
  sponsors,
}: {
  tier: Tier;
  sponsors: Sponsor[];
}) {
  const t = useTranslations("sponsors.tiers");
  if (sponsors.length === 0) return null;

  return (
    <div className="flex flex-col gap-5">
      <h3 className="eyebrow text-center text-muted-foreground">{t(tier)}</h3>
      <div className="flex flex-wrap justify-center gap-4">
        {sponsors.map((s) => (
          <SponsorLogo key={s.id} sponsor={s} tile={TIER_TILE[tier]} />
        ))}
      </div>
    </div>
  );
}
