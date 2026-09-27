
- Routes: `/` marketing landing, `/app` synthesis tool, `/team` team page — separates public site from tool.
- Route engine rate limit: 5 uncached runs per IP per 2 min via `rate_limits` table — protects free AI quota during demos.
