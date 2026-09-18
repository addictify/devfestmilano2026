"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import {
  formatAverage,
  MIN_PUBLIC_RATINGS,
  type RatingAggregate,
} from "@/lib/feedback-aggregate";
import { loadRatings } from "@/lib/feedback-client";

/**
 * A session's average rating, shown once enough people have voted.
 *
 * Renders nothing below the threshold: with one or two responses "the average"
 * is one identifiable person's opinion of a talk they just watched.
 */
export function SessionRating({ sessionId }: { sessionId: string }) {
  const t = useTranslations("play");
  const [aggregate, setAggregate] = useState<RatingAggregate | null>(null);

  useEffect(() => {
    let active = true;
    loadRatings().then((map) => {
      if (active) setAggregate(map.get(sessionId) ?? null);
    });
    return () => {
      active = false;
    };
  }, [sessionId]);

  if (!aggregate || aggregate.count < MIN_PUBLIC_RATINGS) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={t("ratingCount", { count: aggregate.count })}
    >
      <Star className="size-3.5 fill-gdg-yellow text-gdg-yellow" />
      <span className="font-semibold text-foreground">
        {formatAverage(aggregate.average)}
      </span>
      <span>({aggregate.count})</span>
    </span>
  );
}
