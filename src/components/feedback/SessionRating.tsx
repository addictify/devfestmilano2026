"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { formatAverage, type PublicRating } from "@/lib/feedback-aggregate";
import { loadRatings } from "@/lib/feedback-client";

/**
 * A session's average rating, shown once enough people have voted.
 *
 * Whether it *may* be shown is decided on the server: below the threshold the
 * average is never published, so there is nothing here to hide. This component
 * renders what it was given.
 */
export function SessionRating({ sessionId }: { sessionId: string }) {
  const t = useTranslations("play");
  const [rating, setRating] = useState<PublicRating | null>(null);

  useEffect(() => {
    let active = true;
    loadRatings().then((map) => {
      if (active) setRating(map.get(sessionId) ?? null);
    });
    return () => {
      active = false;
    };
  }, [sessionId]);

  if (rating?.average === undefined) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={t("ratingCount", { count: rating.count })}
    >
      <Star className="size-3.5 fill-gdg-yellow text-gdg-yellow" />
      <span className="font-semibold text-foreground">
        {formatAverage(rating.average)}
      </span>
      <span>({rating.count})</span>
    </span>
  );
}
