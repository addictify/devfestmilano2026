import { useLocale, useTranslations } from "next-intl";
import { Clock, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { colorClasses, type GdgColor } from "@/lib/design/tokens";
import { localized } from "@/lib/localize";
import { formatTimeRange } from "@/lib/time";
import type { Session, Speaker, Track } from "@/types/models";
import { AddToCalendar } from "@/components/common/AddToCalendar";
import { siteConfig } from "@/lib/site";

const LEVEL_DOT: Record<string, string> = {
  beginner: "bg-gdg-green",
  intermediate: "bg-gdg-yellow",
  advanced: "bg-gdg-red",
};

export function SessionCard({
  session,
  speakers,
  track,
  showTime = true,
}: {
  session: Session;
  speakers: Speaker[];
  track?: Track;
  showTime?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("agendaPage");
  const color: GdgColor = track?.color ?? "blue";
  const c = colorClasses[color];
  const service = session.isServiceSession;

  return (
    <article
      className={cn(
        "group relative flex gap-4 overflow-hidden rounded-2xl border border-border bg-card p-5 transition-colors",
        service && "bg-muted/50",
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", service ? "bg-border" : c.bg)} />

      <div className="flex min-w-0 flex-1 flex-col gap-2.5 pl-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
          {showTime && session.startsAt && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {formatTimeRange(session.startsAt, session.endsAt, locale)}
            </span>
          )}
          {session.roomName && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {session.roomName}
            </span>
          )}
          {track && !service && (
            <span className={cn("inline-flex items-center gap-1.5", c.text)}>
              <span className={cn("size-2 rounded-full", c.bg)} />
              {localized(track.name, locale)}
            </span>
          )}
        </div>

        <h3
          className={cn(
            "font-display font-bold tracking-tight",
            service ? "text-base text-muted-foreground" : "text-lg",
          )}
        >
          {session.title}
        </h3>

        {!service && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {localized(session.description, locale)}
          </p>
        )}

        {speakers.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {speakers.map((sp) => (
              <Link
                key={sp.id}
                href={`/speakers/${sp.id}`}
                className="text-sm font-medium transition-colors hover:text-gdg-blue"
              >
                {sp.fullName}
              </Link>
            ))}
          </div>
        )}

        {!service && session.startsAt && session.endsAt && (
          <div className="mt-2">
            <AddToCalendar
              size="sm"
              variant="ghost"
              filename={`devfest-${session.id}.ics`}
              event={{
                title: session.title,
                description: localized(session.description, locale),
                location: session.roomName,
                start: session.startsAt,
                end: session.endsAt,
                url: `${siteConfig.url}/${locale}/agenda`,
              }}
            />
          </div>
        )}

        {!service && (session.tags.length > 0 || session.level || session.language) && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {session.level && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                <span className={cn("size-2 rounded-full", LEVEL_DOT[session.level])} />
                {session.level}
              </span>
            )}
            {session.language && (
              <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                {session.language === "it" ? t("italian") : t("english")}
              </span>
            )}
            {session.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2 py-0.5 text-[0.7rem] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
