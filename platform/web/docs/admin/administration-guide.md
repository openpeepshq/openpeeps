# OpenPeeps: Administration Guide

This is the information needed to set up the server and administer a
community.

<div style="height:20px"></div>

## What runs

A community needs four pieces:

- **Postgres** — community data. Schema migrations run when the API starts.
- **Redis** — background jobs, pub/sub, and caches.
- **API** — the OpenPeeps server. It also serves the web app. The production
  image listens on port `8080`.
- **Worker** — a second process with the same environment. Email, media
  processing, push notifications, and scheduled jobs do not run on the API
  process.

`ffmpeg` must be available to the API and worker (it is included in the
production image).

<div style="height:20px"></div>

## Configure the server

Set these before the first production start. Use the same values on the API
and the worker.

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET` | Signs access tokens. Required in production; must be identical on every API and worker replica. Generate one with `opc secrets create-jwt-secret`. |
| `DATABASE_URL` | Postgres connection string. |
| `REDIS_HOST` | Redis hostname. Set `REDIS_PORT` when it is not `6379`. |
| `SERVER_HOST` | Public host used in emails, OIDC redirects, and the default production CORS origin. Example: `community.example.com`. |
| `ENVIRONMENT` | Set to `production` on a deployed stack. |

Optional integrations stay off until you set them: SMTP (`EMAIL_*`), media
storage, LiveKit (`JAMS_LIVEKIT_*`), web push (`VAPID_*`), Stripe, and Sentry
(`SENTRY_DSN`). See `.env.dev.example` in the repository for the full list.

Persist uploaded files. The image stores media at
`MEDIA_STORAGE_PARAMS_PATH` (default `/apat/.media`) and logs at
`LOGS_LOCAL_PATH` (default `/apat/.logs`). Mount both, plus Postgres and Redis
data, on volumes that survive container replacement.

<div style="height:20px"></div>

## Start the stack

The repository includes a Traefik compose file for a production-style deploy:

```bash
cd traefik
cp .env.example .env
# set SERVICE_DOMAIN, Postgres credentials, and JWT_SECRET
docker compose up -d --build
```

That file starts Postgres, Redis, and the API behind Traefik. Start the
worker as its own container from the same image and env file, with command
`worker` (or `OPENPEEPS_COMMAND=worker`).

Put rate limits at the edge (Traefik or a CDN) on authentication routes and
anonymous public reads.

For a local development stack, follow the repository `README.md`.

<div style="height:20px"></div>

## First administrator

On an empty database, the first account created is assigned the **owner**
role. Sign up through the web app, or create the account from the server:

```bash
opc accounts create \
  -e you@example.com \
  -u yourhandle \
  -p 'a-long-password' \
  --email-validated
```

`opc` is on `PATH` inside the production image. It reads the same environment
as the server (`DATABASE_URL`, `REDIS_HOST`, and the rest).

To grant owner later:

```bash
opc profiles role -u yourhandle -r owner
```

<div style="height:20px"></div>

## Administer the community

Signed-in owners and moderators open **Administration** at `/admin`. Each
section is shown only when the profile's role includes the matching
capability.

| Section | Path |
| --- | --- |
| Members | `/admin/members` |
| Groups | `/admin/groups` |
| Invites | `/admin/invites` |
| Moderation | `/admin/moderation` |
| Backups | `/admin/backups` |
| Analytics | `/admin/analytics` |
| API keys | `/admin/api-keys` |
| Plugins | `/admin/plugins` |
| Configuration | `/admin/configuration` |
| Diagnostics | `/admin/diagnostics` |
| Database | `/admin/db` |

Further guides:

- [Theming](/docs/admin/theming) — colors, fonts, and images
- [Content](/docs/admin/messaging) — tagline, about page, welcome page, and guidelines
- [OIDC SSO](/docs/admin/oidc-sso) and [Generic SSO](/docs/admin/generic-sso)
- [Subscriptions](/docs/admin/payments/subscriptions)
- [Backups](/docs/admin/backups)
- [MCP for operators](/docs/admin/mcp)

<div style="height:20px"></div>

## Command line

On the server host, `opc` covers the same operator tasks when the admin UI is
unavailable:

| Command | Purpose |
| --- | --- |
| `opc accounts create` / `opc accounts list` | Create or list accounts |
| `opc profiles role` | Assign or remove a role |
| `opc backups create` / `list` / `restore` | Backup and restore |
| `opc config <key> <value>` | Set a community config value |
| `opc secrets create-jwt-secret` | Print a new JWT secret |
| `opc email test` | Send a test message with the configured SMTP settings |
| `opc stats current` | Print current server stats as JSON |

`opc db clear` deletes the database contents. Do not run it on a community
you intend to keep.
