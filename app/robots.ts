import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/store-server";

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/cart"] }], sitemap: `${siteUrl()}/sitemap.xml` };
}
