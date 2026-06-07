import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["it", "en"],
  defaultLocale: "it",
  // Always prefix the locale in the URL (/it, /en) for clarity + SEO hreflang.
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
