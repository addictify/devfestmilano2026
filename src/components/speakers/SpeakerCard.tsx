import { ArrowUpRight, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { colorClasses, colorForKey } from "@/lib/design/tokens";
import type { Speaker } from "@/types/models";
import { Avatar } from "@/components/common/Avatar";

export function SpeakerCard({ speaker }: { speaker: Speaker }) {
  const color = colorForKey(speaker.id);
  const c = colorClasses[color];

  return (
    <Link
      href={`/speakers/${speaker.id}`}
      className="group relative flex flex-col overflow-hidden rounded-card border border-border bg-card transition-all duration-300 ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:shadow-[0_20px_40px_-24px_rgba(0,0,0,0.35)]"
    >
      <span className={cn("h-1.5 w-full", c.bg)} />

      <div className="relative aspect-square overflow-hidden">
        <Avatar
          name={speaker.fullName}
          src={speaker.profilePicture}
          rounded="rounded-none"
          className="size-full transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
        />
        {speaker.isTopSpeaker && (
          <span
            className={cn(
              "absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider backdrop-blur",
              c.text,
            )}
          >
            <Star className="size-3 fill-current" />
            Top
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-xl font-bold tracking-tight">
            {speaker.fullName}
          </h3>
          <ArrowUpRight className="mt-1 size-5 shrink-0 text-muted-foreground transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{speaker.tagLine}</p>
        {speaker.company && (
          <p className={cn("mt-2 text-xs font-medium", c.text)}>
            {speaker.company}
          </p>
        )}
      </div>
    </Link>
  );
}
