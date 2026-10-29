# SEO optimisation plan

Much of the groundwork already exists from the last change: a sitemap, crawler rules, per-page titles/descriptions/canonical for Home and Team, and WebSite/Organization data. This plan completes the checklist.

## What will change

1. **One SEO building block for every page.** Extend the existing page-details piece to also set keywords, a robots rule (index for public pages, noindex for private ones) and optional structured data. Use it on every page:
   - Public, indexed: Home, Team (unique titles 50-60 chars, descriptions 150-160 chars with a call to action, keywords).
   - Private, noindex: Sign in, Welcome, Tool, Research, Admin, Moderator, Benchmark, Not found — each still gets its own unique title.
2. **Structured data.**
   - Home: WebSite + Organization (already sitewide) plus a SoftwareApplication entry describing the platform.
   - Team: AboutPage with a BreadcrumbList.
3. **Headings and page structure.**
   - The Sign-in/Welcome logo block currently uses a top-level heading for the brand name; change it so each of those pages has one heading describing the page ("Sign in to Chemtraceit", etc.).
   - Check every page has exactly one top heading, ordered sub-headings, and proper main/section/nav/footer areas; Team member cards become articles.
4. **Images.** Descriptive alt text on all logo images, explicit width/height to prevent layout shift, lazy loading for images below the fold. The only images are three small logo PNGs (10-24 KB); convert them to WebP at build time with a PNG fallback.
5. **Sitemap and crawler rules.** Replace the hand-written sitemap with a small generator that runs before each preview/build and lists all public routes (Home, Team), so new public pages only need adding to one list. Add the skip rules for private pages to the Google/Bing blocks too (they currently allow everything).
6. **Speed.** Load each page's code only when it is opened (Home stays instant; the heavy tool, research, admin pages load on demand), with a light loading state. Load fonts without blocking the first paint.

## Acceptance check
- Run Lighthouse (SEO + performance) on Home and Team on desktop and mobile; target SEO above 90 and report the scores.
- Confirm each page has a unique title and description in the browser.

## Limits to know
- This is a single-page app: Google reads the per-page details, but social link previews (WhatsApp, LinkedIn) only see the sitewide home page details.

## Technical details
- `PageMeta` gains `keywords`, `noindex`, `jsonLd` props; added to all pages in `src/pages`.
- `BrandHero` heading level becomes configurable; Auth/Welcome supply their own `h1`.
- `vite-imagetools` for logo WebP + `<picture>` fallback in `BrandLogo`.
- `scripts/generate-sitemap.ts` with `predev`/`prebuild` hooks, base `https://chemtraceit.com`, no lastmod.
- `React.lazy` + `Suspense` for all routes except Landing in `App.tsx`; fonts via `preload` + `display=swap`.
