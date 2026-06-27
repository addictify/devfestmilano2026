import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Leaderboard } from "@/components/play/Leaderboard";

export const metadata: Metadata = { robots: { index: false } };

export default async function LeaderboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Leaderboard />;
}
