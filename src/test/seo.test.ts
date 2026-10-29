// SEO guardrails: sitemap, robots.txt and index.html must stay crawl-correct.
import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

const PRIVATE_PATHS = ["/app", "/research", "/welcome", "/admin", "/moderator", "/benchmark", "/auth"];

describe("sitemap.xml", () => {
  const sitemap = read("public/sitemap.xml");

  it("lists only the two public pages as absolute production URLs", () => {
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual(["https://chemtraceit.com/", "https://chemtraceit.com/team"]);
  });

  it("never lists private routes", () => {
    for (const p of PRIVATE_PATHS) expect(sitemap).not.toContain(`https://chemtraceit.com${p}`);
  });

  it("has no invented lastmod dates", () => {
    expect(sitemap).not.toContain("<lastmod>");
  });
});

describe("robots.txt", () => {
  const robots = read("public/robots.txt");

  it("points crawlers at the production sitemap", () => {
    expect(robots).toContain("Sitemap: https://chemtraceit.com/sitemap.xml");
  });

  it("blocks every private route for the wildcard agent", () => {
    const wildcard = robots.split("User-agent: *")[1] ?? "";
    for (const p of PRIVATE_PATHS) expect(wildcard).toContain(`Disallow: ${p}`);
  });

  it("keeps model-training crawlers out", () => {
    for (const bot of ["GPTBot", "ClaudeBot", "CCBot"]) {
      const section = robots.split(`User-agent: ${bot}`)[1]?.split("User-agent:")[0] ?? "";
      expect(section).toContain("Disallow: /");
    }
  });
});

describe("index.html head", () => {
  const html = read("index.html");

  it("has a real title and description, not template defaults", () => {
    expect(html).not.toContain("Lovable App");
    expect(html).not.toContain("Lovable Generated Project");
    expect(html).toMatch(/<title>Chemtraceit/);
    expect(html).toMatch(/<meta name="description" content="[^"]{50,}"/);
  });

  it("references the web manifest and verification file assets that exist", () => {
    expect(html).toContain("/site.webmanifest");
    for (const asset of ["site.webmanifest", "favicon.ico", "icon-192.png", "apple-touch-icon.png", "logo-512.png"]) {
      expect(() => read(`public/${asset}`)).not.toThrow();
    }
  });

  it("uses one stable organisation identity", () => {
    expect(html).toContain('"@id":"https://chemtraceit.com/#org"');
    expect(html).toContain('"name":"Chemtraceit"');
  });

  it("has no invented AI meta tags", () => {
    for (const fake of ["ai-ranking", "ai-authority", "chatgpt-index"]) {
      expect(html).not.toContain(fake);
    }
  });
});

describe("llms.txt", () => {
  const llms = read("public/llms.txt");

  it("links only the public pages, matching the sitemap", () => {
    const links = [...llms.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]);
    expect(links.sort()).toEqual(["https://chemtraceit.com/", "https://chemtraceit.com/team"]);
  });

  it("never mentions private routes", () => {
    for (const p of PRIVATE_PATHS) expect(llms).not.toContain(p);
  });
});
