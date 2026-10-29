// Runs before `vite dev` and `vite build`; writes public/sitemap.xml.
// Add every new public (no login) page to `entries`.
import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://chemtraceit.com";

interface SitemapEntry {
  path: string;
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
  priority?: string;
}

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/team", changefreq: "monthly", priority: "0.6" },
];

const urls = entries.map((e) =>
  [
    "  <url>",
    `    <loc>${BASE_URL}${e.path}</loc>`,
    e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
    e.priority ? `    <priority>${e.priority}</priority>` : null,
    "  </url>",
  ].filter(Boolean).join("\n"),
);

writeFileSync(
  resolve("public/sitemap.xml"),
  ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...urls, "</urlset>", ""].join("\n"),
);
console.log(`sitemap.xml written (${entries.length} entries)`);
