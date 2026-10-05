#!/bin/bash
# =============================================================================
# ActivityPub Federation Test Harness — Setup Script
# =============================================================================
# Creates a self-signed CA, starts the docker-compose stack, initializes
# Mastodon, enables federation on both OpenPeeps instances, and creates
# test accounts.
#
# Prerequisites:
#   - Docker + docker compose (v2)
#   - openssl
#   - Git checkout on the '1028-federation-fedify' branch
#
# Domain layout:
#   alpha.activity-pub.test.ap.social   → OpenPeeps Alpha
#   beta.activity-pub.test.ap.social    → OpenPeeps Beta
#   mastodon.activity-pub.test.ap.social → Mastodon
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
CERTS_DIR="$SCRIPT_DIR/certs"
# Domain suffix + deployment mode are taken from the environment or .env
DNS_SUFFIX="${DNS_SUFFIX:-activity-pub.test.ap.social}"
PUBLIC="${PUBLIC:-0}"
ACME_EMAIL="${ACME_EMAIL:-}"

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $*"; }
ok()    { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} ✓ $*"; }
warn()  { echo -e "${YELLOW}[$(date +%H:%M:%S)]${NC} ! $*"; }
err()   { echo -e "${RED}[$(date +%H:%M:%S)]${NC} ✗ $*" >&2; }

# ── Verify prerequisites ────────────────────────────────────────────────────
check_prereqs() {
  command -v docker >/dev/null 2>&1 || { err "docker not found"; exit 1; }
  command -v openssl >/dev/null 2>&1 || { err "openssl not found"; exit 1; }
  docker compose version >/dev/null 2>&1 || { err "docker compose v2 not found"; exit 1; }
}

# ── Verify the federation branch is checked out ─────────────────────────────
check_federation_branch() {
  local repo_root
  repo_root="$(git -C "$SCRIPT_DIR/../../.." rev-parse --show-toplevel 2>/dev/null || true)"

  if [ -z "$repo_root" ]; then
    warn "Could not determine git repo root — skipping branch check."
    warn "Ensure you are on the '1028-federation-fedify' branch."
    return
  fi

  local branch
  branch="$(git -C "$repo_root" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"

  if [ "$branch" != "1028-federation-fedify" ]; then
    err "You are on branch '$branch', not '1028-federation-fedify'."
    err "The federation test harness requires the federation branch."
    err "  Switch:  git -C $repo_root checkout 1028-federation-fedify"
    exit 1
  fi

  # Verify federation migration exists
  local migration_dir="$repo_root/platform/core/src/db/pg/sql"
  if ! ls "$migration_dir"/*federation*.sql >/dev/null 2>&1; then
    err "Federation migration not found in $migration_dir"
    err "Ensure the 1028-federation-fedify branch is checked out."
    exit 1
  fi

  ok "On federation branch ($(git -C "$repo_root" rev-parse --short HEAD)), schema files present."
}

# ── Ensure .env exists with Mastodon secrets + domain/mode settings ─────────
# Merges into an existing .env without clobbering keys the user already set,
# so hand-written .env values (DNS_SUFFIX, PUBLIC, SMTP_*, etc.) are preserved
# and visible to `docker compose` (which reads .env automatically).
ensure_env() {
  local env_file="$SCRIPT_DIR/.env"
  touch "$env_file"
  set -a; . "$env_file" 2>/dev/null || true; set +a
  : "${DNS_SUFFIX:=activity-pub.test.ap.social}"
  : "${PUBLIC:=0}"
  : "${ACME_EMAIL:=}"
  # Default the JWT; in public mode replace the weak default with a strong random one.
  : "${JWT_SECRET:=test-jwt-secret-change-me}"
  if [ "$PUBLIC" = "1" ] && [ "$JWT_SECRET" = "test-jwt-secret-change-me" ]; then
    JWT_SECRET="$(openssl rand -hex 32)"
  fi

  _dotenv_put MASTODON_SECRET_KEY_BASE "${MASTODON_SECRET_KEY_BASE:-$(openssl rand -hex 64)}"
  _dotenv_put MASTODON_OTP_SECRET "${MASTODON_OTP_SECRET:-$(openssl rand -hex 40)}"
  # Rails 7.1 (Mastodon 4.3.x) encryption keys — required before db:setup.
  _dotenv_put MASTODON_ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY "${MASTODON_ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY:-$(openssl rand -hex 32)}"
  _dotenv_put MASTODON_ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY "${MASTODON_ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY:-$(openssl rand -hex 32)}"
  _dotenv_put MASTODON_ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT "${MASTODON_ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT:-$(openssl rand -hex 32)}"
  _dotenv_put JWT_SECRET "${JWT_SECRET}"
  _dotenv_put DNS_SUFFIX "${DNS_SUFFIX}"
  _dotenv_put PUBLIC "${PUBLIC}"
  _dotenv_put ACME_EMAIL "${ACME_EMAIL}"
  ok ".env ready (secrets + domain/mode settings)."
}

# Set KEY=VALUE in .env only if the key is not already present.
_dotenv_put() {
  local key="$1" val="$2" env_file="$SCRIPT_DIR/.env"
  grep -q "^${key}=" "$env_file" && return 0
  printf '%s=%s\n' "$key" "$val" >> "$env_file"
}

# ── Generate TLS material ────────────────────────────────────────────────────
# Local mode  -> self-signed CA + wildcard cert (trusted via certs/ca.crt)
# Public mode -> Traefik ACME (no certbot needed); certs/ca.crt is populated
#                from the OS CA bundle so Mastodon/Ruby and OpenPeeps/Node
#                can make outbound HTTPS requests to federated peers.
generate_certs() {
  if [ "$PUBLIC" = "1" ]; then
    ensure_system_ca
    return
  fi
  generate_certs_local
}

generate_certs_local() {
  if [ -f "$CERTS_DIR/ca.crt" ] && [ -f "$CERTS_DIR/tls.crt" ] && [ -f "$CERTS_DIR/tls.key" ]; then
    ok "Certificates already exist — skipping generation."
    return
  fi

  info "Generating self-signed CA and wildcard certificate for *.$DNS_SUFFIX ..."
  mkdir -p "$CERTS_DIR"

  # Root CA (self-signed)
  openssl req -x509 -newkey rsa:4096 -nodes \
    -keyout "$CERTS_DIR/ca.key" \
    -out "$CERTS_DIR/ca.crt" \
    -days 365 \
    -subj "/CN=ActivityPub Test CA" 2>/dev/null

  # Wildcard CSR + private key
  openssl req -newkey rsa:2048 -nodes \
    -keyout "$CERTS_DIR/tls.key" \
    -out "$CERTS_DIR/tls.csr" \
    -days 365 \
    -subj "/CN=*$DNS_SUFFIX" 2>/dev/null

  # Sign the cert with SANs for all test domains
  cat > "$CERTS_DIR/san.cnf" <<SAN
[v3_ext]
subjectAltName = @alt_names
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
DNS.1 = *.$DNS_SUFFIX
DNS.2 = alpha.$DNS_SUFFIX
DNS.3 = beta.$DNS_SUFFIX
DNS.4 = mastodon.$DNS_SUFFIX
SAN

  openssl x509 -req \
    -in "$CERTS_DIR/tls.csr" \
    -CA "$CERTS_DIR/ca.crt" \
    -CAkey "$CERTS_DIR/ca.key" \
    -CAcreateserial \
    -out "$CERTS_DIR/tls.crt" \
    -days 365 \
    -extfile "$CERTS_DIR/san.cnf" \
    -extensions v3_ext 2>/dev/null

  rm -f "$CERTS_DIR/tls.csr" "$CERTS_DIR/san.cnf" "$CERTS_DIR/ca.srl"

  ok "Certificates generated in $CERTS_DIR"
}

# generate_certs_public -- REMOVED: Traefik's built-in ACME resolver
# (certificatesResolvers.le in traefik.yml) handles Let's Encrypt automatically.

# Ruby (Mastodon) and Node (OpenPeeps) point SSL_CERT_FILE / NODE_EXTRA_CA_CERTS at
# certs/ca.crt. In public mode there is no self-signed CA, so drop in the OS CA
# bundle so they trust the Let's Encrypt certificate like any visitor.
ensure_system_ca() {
  local f
  for f in \
    /etc/ssl/certs/ca-certificates.crt \
    /etc/ssl/certs/ca-bundle.crt \
    /etc/pki/tls/certs/ca-bundle.crt \
    /etc/ssl/cert.pem; do
    if [ -f "$f" ]; then cp "$f" "$CERTS_DIR/ca.crt"; return 0; fi
  done
  # Fallback: keep the file present so Ruby/Node don't crash on a missing path.
  # (A system without any standard CA bundle is unusual; supply your own if needed.)
  warn "No standard system CA bundle found — using the issued certificate as a fallback ca.crt."
  [ -f "$CERTS_DIR/tls.crt" ] && cp "$CERTS_DIR/tls.crt" "$CERTS_DIR/ca.crt"
  return 0
}

# ── Add /etc/hosts entries for local browser access ──────────────────────────
# Real DNS is used on a public server; /etc/hosts is only for local laptop runs.
if_public_skip_setup_hosts() {
  if [ "$PUBLIC" = "1" ]; then
    ok "PUBLIC=1 — using real DNS, skipping /etc/hosts."
    return 0
  fi
  return 1
}

setup_hosts() {
  if_public_skip_setup_hosts && return 0
  local hosts_file="/etc/hosts"
  local domains="alpha.$DNS_SUFFIX beta.$DNS_SUFFIX mastodon.$DNS_SUFFIX"

  if grep -q "$DNS_SUFFIX" "$hosts_file" 2>/dev/null; then
    ok "Test domains already present in $hosts_file."
    return
  fi

  if [ -w "$hosts_file" ]; then
    echo "127.0.0.1 $domains" >> "$hosts_file"
    ok "Test domains added to $hosts_file."
  else
    warn "Cannot write to $hosts_file (need sudo). Local browser access won't work"
    warn "until you add these entries manually:"
    warn "  127.0.0.1 $domains"
  fi
}

# ──────────────────────────────────────────────────────────────────────
# Generate Traefik dynamic config from the committed template, substituting
# the real DNS_SUFFIX. In PUBLIC mode, routers are rewritten to use Traefik's
# ACME certResolver (certResolver: le) instead of the static default cert.
# ──────────────────────────────────────────────────────────────────────
generate_traefik_dynamic() {
  info "Generating Traefik dynamic config for $DNS_SUFFIX ..."
  sed "s|activity-pub.test.ap.social|$DNS_SUFFIX|g" \
    "$SCRIPT_DIR/traefik/dynamic.yml" > "$SCRIPT_DIR/traefik/dynamic.yml.tmp"
  mv "$SCRIPT_DIR/traefik/dynamic.yml.tmp" "$SCRIPT_DIR/traefik/dynamic.yml"
  if [ "$PUBLIC" = "1" ]; then
    sed -i 's|      tls: true|      tls:\
        certResolver: le|g' \
      "$SCRIPT_DIR/traefik/dynamic.yml"
    ok "Traefik dynamic config set to use ACME certResolver (public mode)."
  fi
  ok "Traefik dynamic config written to traefik/dynamic.yml"
}

# ── Wait for a container to report healthy ───────────────────────────────────
wait_for_healthy() {
  local svc="$1"
  local timeout="${2:-120}"
  local elapsed=0

  info "Waiting for $svc to be healthy (up to ${timeout}s)..."
  while [ "$elapsed" -lt "$timeout" ]; do
    local state
    state="$(docker compose -f "$COMPOSE_FILE" ps --format '{{.State}}' "$svc" 2>/dev/null || true)"
    if [ "$state" = "healthy" ] || [ "$state" = "running" ]; then
      ok "$svc is $state."
      return 0
    fi
    sleep 3
    elapsed=$((elapsed + 3))
  done

  err "$svc did not become healthy within ${timeout}s."
  docker compose -f "$COMPOSE_FILE" logs --tail=20 "$svc" || true
  return 1
}

# ── In public mode, confirm Traefik is serving the LE cert for each domain ───
# A completed TLS handshake (any HTTP response from Traefik, even a 502 from a
# backend that is not up yet) proves the certificate is loaded and trusted.
wait_for_public_tls() {
  local d _ ok_local
  for d in alpha beta mastodon; do
    info "Probing https://$d.$DNS_SUFFIX ..."
    ok_local=0
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      if command -v curl >/dev/null 2>&1 && curl -sS -o /dev/null --max-time 10 "https://$d.$DNS_SUFFIX/health" 2>/dev/null; then
        ok_local=1
        break
      fi
      sleep 3
    done
    if [ "$ok_local" = "1" ]; then
      ok "$d.$DNS_SUFFIX is serving HTTPS with a valid certificate."
    else
      err "https://$d.$DNS_SUFFIX is not reachable over HTTPS (check DNS + port 443)."
    fi
  done
}

# ── Wait for Postgres to accept connections ──────────────────────────────────
wait_for_postgres() {
  local timeout="${1:-60}"
  local elapsed=0

  info "Waiting for Postgres (up to ${timeout}s)..."
  while [ "$elapsed" -lt "$timeout" ]; do
    if docker compose -f "$COMPOSE_FILE" exec -T postgres \
      pg_isready -U openpeeps -d openpeeps_main >/dev/null 2>&1; then
      ok "Postgres is accepting connections."
      return 0
    fi
    sleep 3
    elapsed=$((elapsed + 3))
  done

  err "Postgres did not become ready within ${timeout}s."
  docker compose -f "$COMPOSE_FILE" logs --tail=20 postgres || true
  return 1
}

# ── Create the Mastodon admin account (Mastodon 4.3.x has no rake admin:create) ──
# Uses Rails runner to build an Account + User with the Admin role, bypassing
# validations (no service-agreement prompt, blank-password guard, etc.) so the
# password grant in test-federation.sh can authenticate as admin/password123.
create_mastodon_admin() {
  local domain="$1"
  local admin_rb
  admin_rb="$(mktemp /tmp/mastodon-admin.XXXXXX.rb)"
  cat > "$admin_rb" <<RUBY
admin_role = User.reflect_on_association(:role).klass.find_by(name: "Admin")
a = Account.find_by(username: "admin", domain: nil)
if a.nil?
  a = Account.new
  a.username = "admin"
  a.domain = nil
  a.uri = "https://mastodon.${domain}/users/admin"
  a.inbox_url = "https://mastodon.${domain}/users/admin/inbox"
  a.outbox_url = "https://mastodon.${domain}/users/admin/outbox"
  a.protocol = "activitypub"
  a.save!(validate: false)
  puts "Account created (id=#{a.id})"
else
  puts "Account already exists (id=#{a.id})"
end

u = User.find_or_initialize_by(email: "admin@${domain}")
u.password = "password123"
u.password_confirmation = "password123"
u.account_id = a.id
u.role_id = admin_role.id
u.confirmed_at = Time.current
u.approved = true
u.confirmation_sent_at = Time.current
u.save!(validate: false)
puts "Admin user ready: email=#{u.email} role=#{u.role&.name} confirmed=#{u.confirmed?} approved=#{u.approved?}"
RUBY

  docker compose -f "$COMPOSE_FILE" run --rm -T mastodon-web \
    bash -c 'RAILS_ENV=production bundle exec rails runner -' < "$admin_rb" 2>&1 || {
    warn "Admin account creation exited non-zero."
  }
  rm -f "$admin_rb"
}

# ── Initialize Mastodon database + admin account ─────────────────────────────
setup_mastodon_db() {
  # Stop any running Mastodon containers so the temporary db:setup / admin-creation
  # containers don't collide on the static IPs (172.50.0.60-62).
  docker compose -f "$COMPOSE_FILE" stop mastodon-web mastodon-streaming mastodon-sidekiq 2>/dev/null || true

  info "Setting up Mastodon database schema..."
  docker compose -f "$COMPOSE_FILE" run --rm -T mastodon-web rake db:setup 2>&1 || {
    warn "db:setup exited non-zero (may be expected if schema already exists)."
  }

  info "Creating Mastodon admin account (Mastodon 4.3.x — rake admin:create removed)..."
  create_mastodon_admin "$DNS_SUFFIX"

  ok "Mastodon database initialized."
}

# ── Seed federation config + default roles via direct SQL ──────────────────────
# Runs BEFORE the server starts so that installFederation() reads active=true
# on first boot and backfillLocalFederationIdentities() has the config ready.
# Also seeds default roles so opc accounts create works for role assignment.
set_federation_config() {
  local db_name="$1"

  info "Enabling federation + seeding roles for database: $db_name"
  docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U openpeeps -d "$db_name" <<SQL
-- Federation config
INSERT INTO configs ("key", body)
VALUES ('openpeeps-core',
  '{"config": {"federation": {"active": true, "allowedHosts": ["*.$DNS_SUFFIX"]}}}'::jsonb)
ON CONFLICT ("key") DO UPDATE SET
  body = EXCLUDED.body,
  "updated_at" = now();

-- Default roles (subset needed for testing)
INSERT INTO roles (id, key, is_default, body, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'owner',
   true, '{"key":"owner","displayName":"Owner","capabilities":{"add":["*"]},"remove":[],"default":true,"description":"The owner of this community can do everything"}'::jsonb,
   now(), now())
ON CONFLICT DO NOTHING;

INSERT INTO roles (id, key, is_default, body, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'admin',
   true, '{"key":"admin","displayName":"Admin","capabilities":{"add":["core-accounts-*","core-posts-*","core-profiles-*","core-groups-*","core-reports-*"]},"remove":[],"default":true,"description":"An admin of the community"}'::jsonb,
   now(), now())
ON CONFLICT DO NOTHING;

INSERT INTO roles (id, key, is_default, body, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'member',
   true, '{"key":"member","displayName":"Member","capabilities":{"add":["core-local","core-posts-create-*","core-groups-create","core-reports-create","core-profiles-read","core-profiles-follow"],"remove":[],"default":true,"description":"A member of the community"}'::jsonb,
   now(), now())
ON CONFLICT DO NOTHING;
SQL
  ok "Federation config + roles set for $db_name."
}

# ── Create an OpenPeeps account via the opc CLI ───────────────────────────────
# Uses --entrypoint to run opc.mjs (symlinked at /usr/local/bin/opc) instead of the default start.sh.
create_openpeeps_account() {
  local instance="$1"
  local username="$2"
  local email="$3"
  local password="${4:-password123}"

  info "Creating account $username on $instance..."
  docker compose -f "$COMPOSE_FILE" run --rm \
    --entrypoint /usr/local/bin/opc \
    "$instance" \
    accounts create \
      -e "$email" \
      -u "$username" \
      -p "$password" \
      --email-validated 2>&1

  # Assign admin role via SQL (roles were seeded earlier in set_federation_config)
  local db_name
  case "$instance" in
    *alpha*) db_name='openpeeps_alpha' ;;
    *beta*)  db_name='openpeeps_beta'  ;;
    *)       db_name='openpeeps_alpha';;
  esac
  docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U openpeeps -d "$db_name" <<SQL
INSERT INTO has_role (id, from_id, to_id, created_at, updated_at)
SELECT gen_random_uuid(), p.id, r.id, now(), now()
FROM profiles p, roles r
WHERE p.handle = '$username' AND p.type = 'local' AND r.key = 'admin'
ON CONFLICT DO NOTHING;
SQL
  ok "Admin role assigned to $username on $instance"
}

# ── Main ─────────────────────────────────────────────────────────────────────
main() {
  # Run from the script directory so docker compose finds the .env file
  cd "$SCRIPT_DIR"

  check_prereqs
  check_federation_branch
  ensure_env
  generate_certs
  setup_hosts
  generate_traefik_dynamic

  # SKIP_BUILD=1 lets you reuse already-built images (avoids OOM on small VMs).
  if [ "${SKIP_BUILD:-0}" = "1" ]; then
    ok "SKIP_BUILD=1 — reusing existing images."
  else
    info "Building Docker images (this may take several minutes)..."
    docker compose -f "$COMPOSE_FILE" build 2>&1
  fi

  info "Starting infrastructure (postgres, redis, traefik, mailpit)..."
  docker compose -f "$COMPOSE_FILE" up -d \
    postgres \
    redis-alpha \
    redis-beta \
    redis-mastodon \
    mailpit \
    traefik

  wait_for_postgres 60
  wait_for_healthy traefik 30

  # In public mode, confirm Traefik is serving the LE certificate on each domain.
  if [ "$PUBLIC" = "1" ]; then
    wait_for_public_tls
  fi

  # ── OpenPeeps Alpha: migrate + config ────────────────────────────────────
  info "=== OpenPeeps Alpha ==="
  docker compose -f "$COMPOSE_FILE" run --rm \
    -e RUN_DB_MIGRATE_ON_BOOT=true \
    openpeeps-alpha \
    migrate 2>&1
  set_federation_config "openpeeps_alpha"
  create_openpeeps_account "openpeeps-alpha" "alice" "alice@alpha.$DNS_SUFFIX"

  docker compose -f "$COMPOSE_FILE" up -d openpeeps-alpha openpeeps-alpha-worker
  wait_for_healthy openpeeps-alpha 120

  # ── OpenPeeps Beta: migrate + config ─────────────────────────────────────
  info "=== OpenPeeps Beta ==="
  docker compose -f "$COMPOSE_FILE" run --rm \
    -e RUN_DB_MIGRATE_ON_BOOT=true \
    openpeeps-beta \
    migrate 2>&1
  set_federation_config "openpeeps_beta"
  create_openpeeps_account "openpeeps-beta" "bob" "bob@beta.$DNS_SUFFIX"

  docker compose -f "$COMPOSE_FILE" up -d openpeeps-beta openpeeps-beta-worker
  wait_for_healthy openpeeps-beta 120

  # ── Mastodon ─────────────────────────────────────────────────────────────
  info "=== Mastodon ==="
  setup_mastodon_db
  docker compose -f "$COMPOSE_FILE" up -d mastodon-web mastodon-streaming mastodon-sidekiq
  wait_for_healthy mastodon-web 180

  # ── Summary ──────────────────────────────────────────────────────────────
  echo ""
  echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN} ActivityPub Federation Test Harness — Ready                    ${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
  if [ "$PUBLIC" = "1" ]; then
    echo -e "${YELLOW} PUBLIC DEPLOYMENT${NC}"
    echo "    Domain  : *.$DNS_SUFFIX (Let's Encrypt certificate)"
    [ -n "$ACME_EMAIL" ] && echo "    Contact : $ACME_EMAIL (for certificate expiry notices)"
    echo "    Renewal : handled automatically by Traefik ACME (90-day LE certs)."
    echo "    WARNING : the test accounts use password123 — change them or restrict access before exposing publicly."
    echo "    Mailpit : bound to 127.0.0.1:8025 (view via an SSH tunnel to this server)."
  else
    echo -e "${YELLOW} LOCAL (laptop) DEPLOYMENT${NC}"
    echo "    Domain  : *.$DNS_SUFFIX (self-signed CA in certs/ca.crt)"
  fi
  echo "  Services:"
  echo "    OpenPeeps Alpha:  https://alpha.$DNS_SUFFIX"
  echo "    OpenPeeps Beta:   https://beta.$DNS_SUFFIX"
  echo "    Mastodon:         https://mastodon.$DNS_SUFFIX"
  echo "    Mailpit:          http://localhost:8025"
  echo ""
  echo "  Test accounts:"
  echo "    alpha/alice  password123"
  echo "    beta/bob    password123"
  echo "    mastodon/admin  password123"
  echo ""
  echo "  Next steps:"
  echo "    ./test-federation.sh                        # Run federation checks"
  echo "    docker compose -f $COMPOSE_FILE logs -f     # Watch all logs"
  echo ""
  echo "  Useful Actor URLs (fetch with Accept: application/activity+json):"
  echo "    https://alpha.$DNS_SUFFIX/ap/users/alice"
  echo "    https://beta.$DNS_SUFFIX/ap/users/bob"
  echo "    https://mastodon.$DNS_SUFFIX/users/admin"
  echo ""
}

main "$@"
