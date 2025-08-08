import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.screenshotone.com" },
      { protocol: "https", hostname: "r2.erweima.ai" },
    ],
  },
};

export default nextConfig;
