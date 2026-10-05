# ActivityPub Federation Test Harness

End-to-end federation testing between two OpenPeeps instances and one
Mastodon instance. All domains share a configurable suffix (default
`.activity-pub.test.ap.social`).

## What this tests

| Check           | Description                                                      |
| --------------- | ---------------------------------------------------------------- |
| Actor URLs      | OpenPeeps and Mastodon serve valid ActivityPub `Person` objects  |
| WebFinger       | Mastodon actor resolves via OpenPeeps' WebFinger endpoint        |
| Note federation | A public note on OpenPeeps appears in Mastodon's search          |
| Cross-follow    | Mastodon follows an OpenPeeps actor; the follow edge is recorded |
| Shared inbox    | Activities are delivered via shared inbox (`POST /ap/inbox`)     |

## Architecture

```
                    ┌──────────────────────────────────┐
                    │  Traefik (TLS termination)         │
                    │  172.50.0.30    port 80 + 443       │
                    │  Routes by Host header            │
                    └────┬──────┬───────────┬──────────┘
                         │      │           │
           ┌─────────────┘      │           └──────────────┐
           v                    v                          v
┌──────────────────┐  ┌──────────────────┐    ┌─────────────────────┐
│OpenPeeps Alpha   │  │OpenPeeps Beta    │    │Mastodon             │
│172.50.0.40      │  │172.50.0.50       │    │172.50.0.60          │
│alpha.<domain>    │  │beta.<domain>     │    │mastodon.<domain>    │
│Postgres: alpha_  │  │Postgres: beta_   │    │Postgres: masto_     │
│Redis: redis-    │  │Redis: redis-    │    │Redis: redis-masto   │
│alpha (DB 0)      │  │beta (DB 0)      │    │(DB 0)               │
└──────────────────┘  └──────────────────┘    └─────────────────────┘
           │                    │                          │
           └────────────┬───────┴──────────────────────────┘
                       │
              ┌────────┴────────┐
              │   PostgreSQL    │
              │  172.50.0.10    │
              │  3 databases    │
              └────────┬────────┘
                       │
             ┌─────────┼──────────┬──────────────┐
             v         v          v              v
       redis-alpha  redis-beta  redis-mastodon  pg_data
```

### Key design decisions

- **Traefik** terminates TLS and routes by Host header. All domains resolve to
  Traefik's IP (`172.50.0.30`) via `extra_hosts` in every container, so
  inter-service HTTPS works without external DNS even in local mode.
- **TLS configuration (Traefik v3)**: the certificate and TLS store/options
  live in `traefik/dynamic.yml` (loaded through the file provider). Traefik v3
  no longer parses the top-level static `certificates` / `tls` keys, so the cert
  must be configured dynamically. A router with `tls=true` and no
  `certResolver` uses the default store, which serves `/certs/tls.crt`.
- **Certificates:**
  - _Local_ (default): a local root CA + wildcard cert for `*.<domain>`, mounted
    into every container. Node trusts it via `NODE_EXTRA_CA_CERTS`, Ruby
    (Mastodon) via `SSL_CERT_FILE`.
  - _Public_ (`PUBLIC=1`): Traefik's built-in ACME resolver obtains a Let's
    Encrypt certificate automatically via HTTP-01 challenge on port 80. No
    external `certbot` is needed — Traefik renews 90-day certs transparently.
    `certs/ca.crt` is populated from the OS CA bundle so Mastodon/Ruby and
    OpenPeeps/Node validate the LE cert using the public trust store.
- **Separate Redis per service**: each OpenPeeps instance and Mastodon get
  their own Redis to avoid BullMQ queue-name collisions.
- **Separate Postgres databases**: `openpeeps_alpha`, `openpeeps_beta`, and
  `mastodon_production` live in a single Postgres server (see `postgres/init.sql`).
- **Separate OpenPeeps instances**: each runs from the same Docker image but
  with a different `ACTIVITY_PUB_DEFAULT_DOMAIN` and `DATABASE_URL`.

## Quick start (local, laptop)

```bash
# 1. On the federation branch
git checkout 1028-federation-fedify

# 2. Run setup (builds images, initializes DBs, creates accounts)
cd platform/tests/activitypub
./setup.sh

# 3. Run federation tests
./test-federation.sh

# 4. Tear down
docker compose down -v
```

## Public deployment (internet-accessible server)

Deploy the harness on a VM with a public IP so the instances are reachable from
any browser or federated server. The difference from local mode is **only**
configuration: one `.env` file.

### 1. Requirements

- A VM with a public IP and **ports 80 and 443 open** to the internet.
- Docker + docker compose (v2).
- Control of a DNS zone. You need **three A/AAAA records** (or one wildcard)
  pointing at the VM's public IP:

  ```
  alpha.example.com    →  <public-ip>
  beta.example.com     →  <public-ip>
  mastodon.example.com →  <public-ip>
  ```

  Traefik answers on whatever domain(s) the records cover. `extra_hosts` keeps
  container→Traefik traffic on the internal network (`172.50.0.30`), so DNS only
  needs to cover _external_ reachability — propagation of the records is what
  Traefik's ACME HTTP-01 challenge validates.

### 2. Configure `.env`

```bash
cd platform/tests/activitypub

# Copy the example and set your domain + contact email.
cp .env.example .env

cat > .env <<EOF
DNS_SUFFIX=example.com
PUBLIC=1
ACME_EMAIL=admin@example.com
SMTP_SERVER=smtp.example.com
SMTP_PORT=587
SMTP_ENABLE_STARTTLS_AUTO=true
SMTP_AUTHENTICATION=plain
SMTP_LOGIN=postmaster@example.com
SMTP_PASSWORD=***
MASTODON_SECRET_KEY_BASE=$(openssl rand -hex 64)
MASTODON_OTP_SECRET=$(openssl rand -hex 40)
MASTODON_ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY=$(openssl rand -hex 32)
MASTODON_ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY=$(openssl rand -hex 32)
MASTODON_ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT=$(openssl rand -hex 32)
EOF
```

Only `DNS_SUFFIX`, `PUBLIC=1` and `ACME_EMAIL` are required; the rest default
to Mailpit (local email capture). Set the SMTP vars to a real provider if you
want Mastodon (and OpenPeeps) to send real email.

### 3. Run setup

```bash
./setup.sh
```

`setup.sh` will:

1. check that `alpha/beta/mastodon.<your-domain>` resolve,
2. start Traefik, which automatically requests a Let's Encrypt certificate via
   ACME (HTTP-01 challenge on port 80) and stores it in `certs/acme.json`,
3. start the rest of the stack and confirm each domain serves HTTPS.

Then run the automated checks:

```bash
./test-federation.sh
```

### 4. Security hardening (do these)

- The test accounts all use `password123`. Change them or lock the instance down
  behind a VPN / auth before exposing.
- Firewall: allow only `22`, `80` and `443` from the internet (Mailpit is already
  bound to `127.0.0.1`; Postgres/Redis are not published).
- `JWT_SECRET` is randomized by `setup.sh` in public mode — review it in `.env`.

### 5. Certificate renewal

Traefik's ACME resolver stores certificate state in `certs/acme.json` and
renewals **90-day Let's Encrypt certificates automatically** — no manual renewal
timer, no deploy hooks, no `certbot` on the host. Simply restarting the Traefik
container (`docker compose restart traefik`) picks up renewed certs.

`setup.sh` does not re-request a certificate if `certs/acme.json` already
exists and contains a valid cert for the domains.

## Manual inspection

Once running (local mode uses the self-signed CA in `certs/`). Replace
`$DNS_SUFFIX` in the commands below with your domain (the local default is
`activity-pub.test.ap.social`).

```bash
# View an OpenPeeps actor (ActivityPub JSON)
curl -s --cacert certs/ca.crt \
  -H "Accept: application/activity+json" \
  https://alpha.$DNS_SUFFIX/ap/users/alice

# View a Mastodon actor
curl -s --cacert certs/ca.crt \
  -H "Accept: application/activity+json" \
  https://mastodon.$DNS_SUFFIX/users/admin

# Check Traefik routing is healthy
curl -sI --cacert certs/ca.crt https://alpha.$DNS_SUFFIX/health

# Mastodon admin UI
open https://mastodon.$DNS_SUFFIX        # log in as admin / password123
```

On a public deployment, the certificates are trusted by the system, so the same
commands work **without** `--cacert certs/ca.crt`:

```bash
curl -s -H "Accept: application/activity+json" https://alpha.example.com/ap/users/alice
```

## Environment variables

Written into `.env` by `setup.sh` (compose reads `.env` automatically).

| Variable                                                | Default                       | Description                                               |
| ------------------------------------------------------- | ----------------------------- | --------------------------------------------------------- |
| `DNS_SUFFIX`                                            | `activity-pub.test.ap.social` | Domain suffix for all three instances                     |
| `PUBLIC`                                                | `0`                           | `1` → public VM mode (Let's Encrypt via Traefik ACME)     |
| `ACME_EMAIL`                                            | _(empty)_                     | Let's Encrypt account email (public mode)                 |
| `JWT_SECRET`                                            | `test-jwt-secret-change-me`   | OpenPeeps JWT secret (randomized in public mode)          |
| `MASTODON_SECRET_KEY_BASE`                              | _(generated)_                 | Generated by setup.sh if absent                           |
| `MASTODON_OTP_SECRET`                                   | _(generated)_                 | Generated by setup.sh if absent                           |
| `MASTODON_ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY`         | _(generated)_                 | Rails 7.1 encryption key (required for db:setup)          |
| `MASTODON_ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY`   | _(generated)_                 | Rails 7.1 encryption key (required for db:setup)          |
| `MASTODON_ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT` | _(generated)_                 | Rails 7.1 encryption key (required for db:setup)          |
| `SKIP_BUILD`                                            | `0`                           | `1` → skip `docker compose build` (reuse existing images) |
| `SMTP_SERVER`                                           | `mailpit`                     | Mastodon + OpenPeeps SMTP host                            |
| `SMTP_PORT`                                             | `1025`                        | SMTP port                                                 |
| `SMTP_ENABLE_STARTTLS_AUTO`                             | `false`                       | Enable STARTTLS (true with a real SMTP host)              |
| `SMTP_AUTHENTICATION`                                   | `none`                        | SMTP auth method                                          |
| `SMTP_LOGIN` / `SMTP_PASSWORD`                          | _(empty)_                     | SMTP credentials                                          |
| `EMAIL_CONFIG_HOST` etc.                                | `mailpit` / `1025` / `false`  | OpenPeeps email transport (overridable)                   |

## Tearing down

```bash
docker compose down -v     # removes containers, network, volumes
# local only: remove the /etc/hosts entries and the generated cert CA:
rm -rf certs/
```

Public mode keeps `certs/` so re-running `./setup.sh` reuses the live
certificate without re-issuing.

## Troubleshooting

**Traefik won't start / TLS errors (local)**: Regenerate certs:

```bash
rm -rf certs/ && ./setup.sh
```

**Mastodon can't reach OpenPeeps**: Check that `extra_hosts` are correctly
mapping the test domains to Traefik's IP (`172.50.0.30`).

**Follow activities not delivered**: Check Sidekiq logs for Mastodon:

```bash
docker compose logs mastodon-sidekiq
```

**OpenPeeps federation not active**: Verify the config was set:

```bash
docker compose exec postgres psql -U openpeeps -d openpeeps_alpha -c \
  "SELECT body FROM configs WHERE key = 'openpeeps-core';"
```

**Mastodon streaming fails**: The streaming service is optional for basic
federation. If it doesn't start, remove `mastodon-streaming` from the
`docker compose up` line in `setup.sh` — web + sidekiq are sufficient.

**Public mode: HTTPS not working**: Confirm DNS for
`alpha/beta/mastodon.<DNS_SUFFIX>` resolves to the VM's public IP and that
port 80 is open (needed for Traefik ACME HTTP-01 challenge). Restart Traefik:
`docker compose restart traefik` and check its logs for ACME errors.

**Public mode: HTTPS not trusted by curl**: You're probably running in local
mode. Either set `PUBLIC=1` in `.env` (so `test-federation.sh` drops the
self-signed CA) or, in local mode, keep using `--cacert certs/ca.crt`.

**Traefik returns 404 for all routes**: Traefik's Docker provider fails when
its baked-in API version is older than the Docker daemon's minimum. The
`DOCKER_API_VERSION=1.44` environment variable is set in `docker-compose.yml`
for the Traefik service — bump it to match your Docker daemon (see
`docker version --format server-api-version`).

**Mastodon 4.3.x admin account**: Mastodon 4.3.x removed `rake admin:create`.
`setup.sh` uses `rails runner` with `Account.new` + `User.new(validate: false)`
to create the admin account directly. Rails 7.1 also requires
`ACTIVE_RECORD_ENCRYPTION_*` keys before `db:setup`, so those are generated
into `.env` by `setup.sh` and must be present before running it.

**Mastodon OAuth password grant fails**: Mastodon 4.3.x supports the password
grant (used by `test-federation.sh`); ensure the admin account is `confirmed`
and `approved` (the `create_mastodon_admin` function in `setup.sh` sets both).
