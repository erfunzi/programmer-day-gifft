# Developer Card · Studio

**A personal workspace for builders.**  
Sign in with GitHub, get a living developer card, track your craft, and share a story that feels like you — not a resume template.

Live: [developer.lyroo.space](https://developer.lyroo.space)

---

## Why it exists

Behind every commit there is a person: curiosity, taste, late nights, small wins, and unfinished ideas that eventually ship.

Developer Card turns public GitHub signal into something human — a portrait of how you build. On Programmer’s Day (day 256), the card carries an extra celebration. The rest of the year, it stays useful as a quiet studio for progress, time, and shareable presence.

---

## What you get

- **GitHub sign-in** — official OAuth, no passwords, no private-repo access
- **Personal developer card** — name, craft, character, stats, and share link
- **Theme studio** — curated visual themes for the card surface
- **Game-style rating** — five clear 0–100 attributes that read at a glance
- **Activity reports** — yearly comparison and progress context
- **Work timer** — persistent time tracking for focused building
- **AI insights** (optional) — grounded Gemini summaries from public profile evidence
- **Character imagery** — archetype characters inspired by languages, topics, and projects
- **PNG export** — download the card as shown on screen
- **Visitor mode** — share `?u=username` so others can view and then build their own
- **Telegram publishing** — optional channel posts with membership-aware lifecycle

---

## Product principles

1. **Public signal only** — we never ask for private repository scopes.
2. **Identity stays yours** — GitHub is the source of truth for login and profile.
3. **Shareable by default** — every card can travel as a link, QR, image, or channel post.
4. **Infrastructure stays invisible** — React, Django, and Postgres power the studio without changing the card’s voice.

---

## Architecture

Monorepo layout:

| Layer | Path | Role |
| --- | --- | --- |
| Frontend | `frontend/` | React + Vite + Tailwind + React Query, served by Nginx |
| Backend | `backend/` | Django APIs, GitHub OAuth, sessions, AI, Telegram |
| Data | PostgreSQL | Profiles, sessions, reports, timer, Telegram links |
| Compose | `docker-compose.yml` | Production services with one shared `.env` |
| Dev overlay | `docker-compose.dev.yml` | Hot reload for local work |

```text
Browser
  └─ Nginx (frontend)
       ├─ static React app
       └─ /api /auth /telegram  →  Django (backend)  →  PostgreSQL
                                              └─ GitHub / Gemini / Telegram APIs
```

---

## Quick start (local)

Requirements: Docker, Docker Compose, and a GitHub OAuth App.

```bash
cp .env.example .env
# fill secrets in .env

docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Then open the URL from `DEV_APP_ORIGIN` (default `http://localhost:8080`).

### GitHub OAuth App

Create an OAuth App and set:

- **Homepage URL:** your local or production origin
- **Authorization callback URL:**  
  `https://your-domain/auth/github/callback`  
  (local example: `http://localhost:8080/auth/github/callback`)

Put `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env`.

---

## Production

Production compose runs:

- `frontend` on `127.0.0.1:${FRONTEND_PORT:-8080}`
- `backend` (Gunicorn)
- `postgres`

Typical host setup: reverse-proxy `developer.lyroo.space` to the frontend port, terminate TLS at host Nginx, keep other sites untouched.

```bash
cd /opt/developer-card
git pull
docker compose up -d --build
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py set_telegram_webhook
```

Set `APP_ORIGIN=https://developer.lyroo.space` and `TRUST`/`DJANGO_ALLOWED_HOSTS` accordingly.

---

## Environment

Copy `.env.example` → `.env`. Important keys:

| Key | Purpose |
| --- | --- |
| `APP_ORIGIN` | Canonical HTTPS origin used for OAuth redirects and share links |
| `DJANGO_SECRET_KEY` / `SESSION_SECRET` | Session crypto |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | OAuth credentials (must match the same GitHub app) |
| `GEMINI_API_KEY` | Optional AI + image generation |
| `ATRIA_API_KEY` / `AGENTROUTER_API_KEY` | Optional AI fallbacks after Gemini |
| `POSTGRES_*` | Database connection |
| `FRONTEND_PORT` | Host port for the frontend container |
| `TELEGRAM_BOT_TOKEN` | Bot API token |
| `TELEGRAM_BOT_USERNAME` | Bot username for deep links |
| `TELEGRAM_CHANNEL_ID` | Channel id or `@handle` |
| `TELEGRAM_CHANNEL_URL` | Public channel URL |
| `TELEGRAM_WEBHOOK_SECRET` | Shared secret for webhook verification |
| `TELEGRAM_REQUIRE_JOIN` | Require linked membership before publishing |
| `TELEGRAM_ADMIN_ID` | Numeric Telegram user id for backend error alerts |

Never commit `.env`.

---

### Bilingual profiles and saved appearance

`POST /api/me/preferences` stores the account theme and language (`fa` by default, or `en`). Public cards use these server values, even when an old URL contains different query parameters. Visitors cannot access Settings. Shared links and QR codes include the selected language.

One structured AI generation returns both `locales.fa` and `locales.en`, including role, two-part slogan, traits, headline, analysis, resume, evidence-backed skills and growth suggestions. Raw GitHub statistics stay deterministic. Schema 3 replaces the legacy Persian-only cache on the owner's next analysis request.

During an active owner session, the client checks analysis every five minutes. Cached evidence is refreshed after five minutes; AI output is reused for up to 24 hours unless its evidence fingerprint changes. Major changes include profile identity/bio, README content and repository names/descriptions/languages/topics. Popularity counter changes do not invalidate the fingerprint. Language/theme changes never invoke the model. All regeneration uses the same bilingual prompt and per-account database lock. Failed validation preserves the previous saved output.

Deploy with the new `0005_profile_preferences` migration before serving the updated backend.

---

## Telegram channel publishing

Developer Card can publish a visual post to **lyrooDev** after GitHub sign-in.

### Capabilities

- HTML captions with bold, italic, links, code, blockquotes, and `<pre>` layouts
- Channel custom emoji ids
- Deep-link account linking (`/start link_…`)
- Membership-aware publishing when `TELEGRAM_REQUIRE_JOIN=true`
- Automatic post removal when a linked member leaves (`chat_member` webhook)
- Bot `/start` and `/help` welcome flows
- Admin alerts for backend failures to `TELEGRAM_ADMIN_ID`

### Setup

1. Add the bot to the channel as an administrator (post + delete).
2. Fill Telegram variables in `.env`.
3. Deploy on HTTPS.
4. Register webhook + bot commands:

```bash
docker compose exec backend python manage.py set_telegram_webhook
```

Telegram cannot infer GitHub identity by itself. Users connect from the card UI, open the bot deep link, and keep channel membership if join-gated publishing is enabled.

---

## Scripts

From the repo root:

```bash
npm run build          # frontend production build
npm run test           # frontend tests
npm run check:compose  # validate compose files
```

Backend tests (inside the backend environment):

```bash
docker compose exec backend python manage.py test
```

---

## Privacy & trust

- OAuth scope is limited to public profile reading (`read:user`)
- Session cookies are HTTP-only and Secure in production
- No private repository contents are requested
- AI prompts are built from public profile evidence only
- Telegram admin alerts exclude secrets

---

## Contributing shape

Keep changes small and intentional:

- Preserve the card’s visual language unless the task is design work
- Prefer public, explainable signals over speculative traits
- Treat Telegram publishing as best-effort — login must never fail because Telegram is down
- Keep production compose safe to run beside existing host Nginx sites

---

## Credits

Built with appreciation for the people who ship quietly and persistently.

**Live studio:** [developer.lyroo.space](https://developer.lyroo.space)  
**Creator:** [@erfunzi](https://github.com/erfunzi)

Happy Programmer’s Day. Keep building. ✳

### Telegram publication lifecycle

The first card publication is automatic once per account. Refreshing or signing in again does not repost it. Manual republication requires seven days since the last publication and confirmation that the previous channel message is absent. Deleted publications retain their timestamp.

The default `telegram-maintenance` Compose service checks membership deadlines every minute, independently of browser sessions. After the two-hour grace period, unlinked accounts and confirmed non-members have their card removed. Membership API failures are retried. The bot needs channel administration rights to check membership and delete its messages.

Apply the lifecycle migration before starting the updated services:

```sh
docker compose build
docker compose run --rm backend python manage.py migrate
docker compose up -d
```

For deployments without Compose, supervise `python manage.py enforce_telegram_membership --loop` alongside the web server. One-off checks use the same command without `--loop`.
