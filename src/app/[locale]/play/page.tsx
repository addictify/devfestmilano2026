import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getBadges } from "@/lib/data/game";
import { PlayHome } from "@/components/play/PlayHome";

export const metadata: Metadata = { robots: { index: false } };

export default async function PlayPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const badges = await getBadges();
  return <PlayHome badges={badges} />;
}
