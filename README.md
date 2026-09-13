# Developer Card

Public GitHub profile cards. A private server token is used only for fixed public GitHub endpoints; no account password is needed.

## Local setup

Requires Node.js 22+. Run `npm ci`, then `npm run build`.
Copy `.env.example` to `.env`, and set `GITHUB_TOKEN` to a fine-grained personal access token with public-repository access only and no write permissions. Keep this file outside `dist`. Run `npm start` and open http://localhost:4173.

Never commit `.env`, paste tokens into chat, or expose a token as a frontend environment variable. GitHub token expiration/revocation still requires rotation. Account passwords do not work as API tokens.

## Deployment

- Existing Docker host: `docker compose up -d --build`. The existing localhost port 8081 is preserved. `.env` is read by Compose; the token is injected at runtime, never baked into the image. Public profile caches persist in the `github-cache` volume. Compose enables `TRUST_PROXY` because the supplied host nginx overwrites `X-Real-IP`; keep the container bound to localhost. Do not enable this flag on a directly public Node port.
- Sites: build as a Worker (`dist/server/index.js`, static assets in `dist/client`). Set `GITHUB_TOKEN` as a Sites secret before deploying. A local `.env` is not automatically available on hosted Sites.

## Quota and cache

The browser calls `/api/github/<username>` and never authenticates directly to GitHub. One uncached profile costs 1–3 GitHub requests (up to 200 public repositories). Responses are shared for 6 hours. On temporary upstream failure, a cached copy up to 7 days old is returned and marked stale in the UI. Not-found results are cached for 10 minutes. Concurrent requests for one profile are coalesced per process/isolate, and uncached lookups are throttled (20 per client per minute; 16 simultaneous profile loads).

Docker uses a disk cache. Sites uses Cloudflare's edge Cache API, which is per data center, can be evicted, and is not a globally consistent quota store. These limits mitigate normal bursts, not distributed abuse. High-traffic installations should add edge/WAF rate limiting and shared durable storage; use a GitHub App with appropriate installation quotas for larger scale. Authenticated personal tokens generally have 5,000 requests/hour, not unlimited access. No token rotation scheme bypasses GitHub limits.

## PNG export

`html-to-image` captures a clone of the displayed card DOM at 3× resolution, embedding fonts and the already-selected character. The card is captured face-on with animation stopped; the same text, layout, colors, avatar, traits and QR are retained. The page animation is not modified. Export fails visibly if an image cannot be embedded, rather than silently substituting another character.

## Verification

`npm test` checks server auth, cache, stale responses, quota handling, endpoint validation and concurrent request coalescing. `npm run build` creates Worker output. Keep generated `dist/client`, `dist/server`, `.cache`, `.env`, and `node_modules` out of source control.

References: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api and https://github.com/bubkoo/html-to-image
