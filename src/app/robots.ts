import type { MetadataRoute } from "next";
import { env } from "@/lib/env.public";

export default function robots(): MetadataRoute.Robots {
  const base = env.appUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Never expose private surfaces to crawlers.
        disallow: ["/app", "/ops", "/api", "/onboarding", "/confirmation"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
