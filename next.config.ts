import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// Static export for GitHub Pages is opt-in via STATIC_EXPORT=1 (see
// scripts/static-build.sh). Without the flag the build is the normal Next.js
// server build — ISR, route handlers, and image optimization all intact.
const isStaticExport = process.env.STATIC_EXPORT === "1";

// Docker builds set STANDALONE=1 to emit `.next/standalone` (a self-contained
// server + only the traced node_modules). Left off by default so the Vercel
// build keeps its current shape.
const isStandalone = !isStaticExport && process.env.STANDALONE === "1";

const nextConfig: NextConfig = {
  // GitHub Pages serves static assets only: emit an `out/` folder, skip the
  // server-side image optimizer, and write `/it/index.html`-style paths.
  ...(isStaticExport
    ? { output: "export" as const, trailingSlash: true }
    : {}),
  ...(isStandalone ? { output: "standalone" as const } : {}),
  images: {
    // The default optimizer needs a server; on static export use raw images.
    unoptimized: isStaticExport,
    remotePatterns: [
      // Sessionize speaker avatars
      { protocol: "https", hostname: "sessionize.com" },
      // Google account avatars (Sign-In)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Firebase Storage (sponsor logos, etc.)
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
