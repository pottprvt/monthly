import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/merchant", destination: "/dashboard", permanent: true },
      { source: "/me", destination: "/subscriptions", permanent: true },
    ];
  },
};

export default nextConfig;
