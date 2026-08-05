import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { SPONSOR_TIERS, type Sponsor, type SponsorTier as Tier } from "@/types/models";

// Tile prominence by tier. Logos sit on white tiles so they read in any theme.
// Fixed widths (not `w-full`) so tiles from different tiers can sit as
// siblings in one flex row (`SponsorWall`) without one collapsing the rest.
const TIER_TILE: Record<Tier, string> = {
  platinum: "h-28 w-96",
  gold: "h-24 w-72",
  venue: "h-24 w-72",
  silver: "h-20 w-56",
  bronze: "h-16 w-44",
  community: "h-20 w-56",
  inkind: "h-20 w-56",
};

function SponsorLogo({
  sponsor,
  tile,
  caption,
}: {
  sponsor: Sponsor;
  tile: string;
  /** Small tier label under the tile — used by `SponsorWall`, where tiles from
   *  different tiers sit in one row and each needs its own tier tag. */
  caption?: string;
}) {
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
  const logo = hasLink ? (
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

  if (!caption) return logo;

  return (
    <div className="flex flex-col items-center gap-3">
      {logo}
      <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
        {caption}
      </span>
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

/** Every sponsor in one row, ordered and sized by tier (`TIER_TILE`) and
 *  baseline-aligned so the wall reads as one deliberate roster instead of a
 *  stack of near-empty per-tier sections — the fix for while there's only a
 *  handful of sponsors total. Each tile carries its own tier tag since tiers
 *  no longer get a shared header. Used on the home teaser; the dedicated
 *  `/sponsors` page keeps `SponsorTierBlock`'s fuller per-tier breakdown. */
export function SponsorWall({ sponsors }: { sponsors: Sponsor[] }) {
  const t = useTranslations("sponsors.tiers");
  const ordered = SPONSOR_TIERS.flatMap((tier) =>
    sponsors.filter((s) => s.tier === tier).map((s) => ({ sponsor: s, tier })),
  );
  if (ordered.length === 0) return null;

  return (
    <div className="flex flex-wrap items-end justify-center gap-x-8 gap-y-8">
      {ordered.map(({ sponsor, tier }) => (
        <SponsorLogo
          key={sponsor.id}
          sponsor={sponsor}
          tile={TIER_TILE[tier]}
          caption={t(tier)}
        />
      ))}
    </div>
  );
}
