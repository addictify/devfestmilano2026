import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Scanner } from "@/components/play/Scanner";

export const metadata: Metadata = { robots: { index: false } };

export default async function ScanPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Scanner />;
}
