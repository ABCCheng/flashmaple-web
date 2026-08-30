import type { NextConfig } from "next";
import { version } from "./package.json"
import { API_ORIGIN } from "@/lib/env";

const longCacheAssets = ["/logo.png", "/logo-192.png", "/logo-512.png", "/favicon.ico", "/logo.svg", "/og.png"];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.2.207", "192.168.2.203"],
  output: "standalone",
  env: {
    APP_VERSION: version,
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        source: "/logo.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      ...longCacheAssets
        .filter((source) => source !== "/logo.svg")
        .map((source) => ({
          source,
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=31536000, immutable",
            },
          ],
        })),
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
