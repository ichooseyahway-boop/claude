import type { MetadataRoute } from "next";
import { env } from "@/lib/env.public";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.appUrl();
  const routes: {
    path: string;
    priority: number;
    changeFrequency: "monthly" | "yearly";
  }[] = [
    { path: "/", priority: 1, changeFrequency: "monthly" },
    { path: "/how-it-works", priority: 0.8, changeFrequency: "monthly" },
    { path: "/sample-briefing", priority: 0.8, changeFrequency: "monthly" },
    { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
    { path: "/security", priority: 0.6, changeFrequency: "monthly" },
    { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
    { path: "/get-started", priority: 0.7, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  ];
  const now = new Date();
  return routes.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
