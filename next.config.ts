import type { NextConfig } from "next";

// Photo host for next/image. Read at build time; falls back to the store's Supabase project so
// photos still work if the hosting build forgets NEXT_PUBLIC_SUPABASE_URL (the URL is public anyway).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ahhzcobkkfpqseulxftx.supabase.co";
const supabaseHost = new URL(SUPABASE_URL).hostname;

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;

// Lets `next dev` use Cloudflare bindings locally (added for @opennextjs/cloudflare).
import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
