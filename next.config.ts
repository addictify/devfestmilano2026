import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  images: {
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
