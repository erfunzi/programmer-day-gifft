# معماری / Architecture

`frontend/src/components` contains React-owned screens. `components/ui` contains the shadcn-style Radix/CVA primitives; `lib` contains API, card analysis and image export. No legacy HTML injection or dynamically loaded application scripts remain. Existing CSS, typography and character assets are preserved.

`backend/config/settings/base.py` reads the single repository-root `.env` without overriding process variables. `local.py` and `production.py` select development and production behavior; `manage.py`, WSGI, ASGI and Celery use these modules consistently. The CRM reference informed this separation; its business settings, secrets and external services were not copied.

`workspace` owns database models, API routes and Django tests. PostgreSQL is the application database. SQLite is used only by the isolated test settings, not by production.

## Containers

The production Compose file runs PostgreSQL, Django/Gunicorn and a built React frontend served by Nginx. The development override mounts backend and frontend sources for reload and preserves container dependencies in a named volume. Only the frontend is exposed on localhost port 8080. Existing host Nginx can route `developer.lyroo.space` to it.

Redis, Celery worker and Celery Beat are available through the optional `jobs` profile. They are infrastructure for background jobs; current AI endpoints remain synchronous and are not silently queued. No periodic business task is configured.

Database changes use committed Django migration files. Neither image build, container startup nor HTTP requests run migrations or create tables. Applying migrations is an explicit release step:

```sh
docker compose run --rm backend python manage.py migrate --settings=config.settings.production
```

For a database created by the earlier experimental `ensure_schema` implementation, verify table/constraint compatibility before choosing `--fake-initial`. Do not mark migrations applied blindly. Old Node/SQLite user data has not been automatically imported into PostgreSQL.

## Reversible cleanup

The old Node backend, Drizzle schema, build scripts and Node tests moved to `.archive/node-version`. Old cache/database files, work assets and Sites metadata are preserved there too. The HTML bridge and duplicate public server output are in `.archive/frontend-bridge`. `.archive` is ignored by Git and excluded from both container build contexts. It is a local recovery copy, not a production dependency or a distributed backup.

Source assets now live under `frontend/public`; only public fonts, styles, favicon and character images are shipped. Frontend tests live under `frontend/tests`; Django tests under `backend/workspace/tests`.

## Validation

Frontend: production Vite build and Playwright desktop/mobile tests. Backend: Django system checks, migrations consistency check, API tests with fake credentials and an isolated SQLite test database. Full PostgreSQL/container integration additionally requires a running Docker engine.
