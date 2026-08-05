"use client";

import { createContext, useContext } from "react";
import { siteConfig } from "@/lib/site";
import type { SiteSettings } from "@/lib/data/settings";

const fallback: SiteSettings = {
  ticketsAvailable: siteConfig.ticketsAvailable,
  speakersPublished: siteConfig.speakersPublished,
  schedulePublished: siteConfig.schedulePublished,
  cfpOpen: siteConfig.cfpOpen,
};

const SiteSettingsContext = createContext<SiteSettings>(fallback);

export function SiteSettingsProvider({ value, children }: { value: SiteSettings; children: React.ReactNode }) {
  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export const useSiteSettings = () => useContext(SiteSettingsContext);
