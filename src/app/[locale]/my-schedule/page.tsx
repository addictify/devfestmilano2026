import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getSessions, getSpeakers, getTracks } from "@/lib/data/content";
import { MyScheduleList } from "@/components/agenda/MyScheduleList";

export const metadata: Metadata = { robots: { index: false } };

export default async function MySchedulePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [sessions, speakers, tracks] = await Promise.all([getSessions(), getSpeakers(), getTracks()]);
  return <MyScheduleList sessions={sessions} speakers={speakers} tracks={tracks} />;
}
