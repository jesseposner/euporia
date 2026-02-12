import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "cdn.shopify.com" },
    ],
  },
};

export default nextConfig;
