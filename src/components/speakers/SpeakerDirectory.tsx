"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import type { Speaker } from "@/types/models";
import { SpeakerCard } from "./SpeakerCard";
import { MotionReveal } from "@/components/common/MotionReveal";

export function SpeakerDirectory({ speakers }: { speakers: Speaker[] }) {
  const t = useTranslations("speakersPage");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return speakers;
    return speakers.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.tagLine.toLowerCase().includes(q) ||
        (s.company ?? "").toLowerCase().includes(q),
    );
  }, [speakers, query]);

  return (
    <div>
      <div className="relative mx-auto mb-10 max-w-md">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search")}
          className="h-12 w-full rounded-full border border-border bg-card pl-11 pr-4 text-sm outline-none transition-colors focus:border-gdg-blue focus-visible:outline-none"
          aria-label={t("search")}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="grid auto-rows-fr grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((speaker, i) => (
            <MotionReveal key={speaker.id} delay={(i % 4) * 0.05}>
              <SpeakerCard speaker={speaker} />
            </MotionReveal>
          ))}
        </div>
      )}
    </div>
  );
}
