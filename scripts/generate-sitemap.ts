// Runs before `vite dev` and `vite build`; writes public/sitemap.xml.
// Add every new public (no login) page to `entries`.
// No changefreq/priority/lastmod: we have no page-specific change dates,
// and invented values are ignored or distrusted by search engines.
import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://chemtraceit.com";

const entries: string[] = ["/", "/team"];

const urls = entries.map((path) => `  <url>\n    <loc>${BASE_URL}${path}</loc>\n  </url>`);

writeFileSync(
  resolve("public/sitemap.xml"),
  ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...urls, "</urlset>", ""].join("\n"),
);
console.log(`sitemap.xml written (${entries.length} entries)`);
