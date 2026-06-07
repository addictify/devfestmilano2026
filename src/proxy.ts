import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next.js 16 renamed `middleware` to `proxy`. next-intl's locale negotiator
// is re-exported here as the default proxy handler (runs on the nodejs runtime).
const proxy = createMiddleware(routing);

export default proxy;

export const config = {
  // Match all pathnames except those starting with /api, Next internals,
  // Vercel internals, or anything containing a dot (static files).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
