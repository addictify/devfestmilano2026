import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SpeakerLink } from "@/types/models";

function labelFor(type: string) {
  const k = type.toLowerCase();
  if (k.includes("twitter") || k === "x") return "X";
  if (k.includes("linkedin")) return "LinkedIn";
  if (k.includes("github")) return "GitHub";
  if (k.includes("youtube")) return "YouTube";
  if (k.includes("instagram")) return "Instagram";
  if (k.includes("blog")) return "Blog";
  if (k.includes("company")) return "Website";
  return type.replaceAll("_", " ");
}

export function SocialLinks({
  links,
  className,
}: {
  links: SpeakerLink[];
  className?: string;
}) {
  if (!links?.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {links.map((link, i) => (
        <a
          key={`${link.type}-${i}`}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          {link.title ?? labelFor(link.type)}
          <ArrowUpRight className="size-3.5 opacity-60 transition-opacity group-hover:opacity-100" />
        </a>
      ))}
    </div>
  );
}
