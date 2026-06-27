"use client";

import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";

export function FavoriteButton({ sessionId, className }: { sessionId: string; className?: string }) {
  const { isFavorite, toggle, ready } = useFavorites();
  const t = useTranslations("myschedule");
  const active = isFavorite(sessionId);

  return (
    <button
      type="button"
      onClick={() => toggle(sessionId)}
      aria-pressed={active}
      aria-label={active ? t("remove") : t("add")}
      disabled={!ready}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full border border-border bg-card/80 backdrop-blur transition-colors hover:bg-muted disabled:opacity-50",
        className,
      )}
    >
      <Star className={cn("size-4", active ? "fill-gdg-yellow text-gdg-yellow" : "text-muted-foreground")} />
    </button>
  );
}
