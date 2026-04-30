#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'USAGE'
Install OpenPeeps on an empty VM with Docker.

Usage:
  install-openpeeps-docker.sh DOMAIN [ADMIN_EMAIL] [ADMIN_HANDLE]

Environment:
  OPENPEEPS_DOMAIN             Domain name to serve, alternative to DOMAIN.
  OPENPEEPS_ADMIN_EMAIL        Initial account email, alternative to ADMIN_EMAIL.
  OPENPEEPS_ADMIN_HANDLE       Initial account handle, alternative to ADMIN_HANDLE.
  OPENPEEPS_IMAGE              Container image, default: codeberg.org/openpeeps/openpeeps.
  OPENPEEPS_TAG                Container tag, default: stable.
  OPENPEEPS_ROOT               Install directory, default: /opt/openpeeps.
  OPENPEEPS_LETSENCRYPT_EMAIL  Email for Traefik/Let's Encrypt, default: admin@DOMAIN.
  WATCHTOWER_SCHEDULE          Cron schedule for autoupdates, default: 0 0 9 * * MON.
  SMTP_SERVER                  SMTP host.
  SMTP_PORT                    SMTP port, default: 465.
  SMTP_LOGIN                   SMTP username.
  SMTP_PASSWORD                SMTP password.
  SMTP_FROM_ADDRESS            Default sender address.
  JAMS_LIVEKIT_API_KEY         Optional LiveKit API key.
  JAMS_LIVEKIT_API_SECRET      Optional LiveKit API secret.
  CODEBERG_USERNAME            Optional registry username for private images.
  CODEBERG_TOKEN               Optional registry token/password for private images.

Examples:
  sudo ./scripts/install-openpeeps-docker.sh openpeeps.example.com owner@example.com owner
  OPENPEEPS_TAG=latest sudo -E ./scripts/install-openpeeps-docker.sh openpeeps.example.com
USAGE
}

is_valid_domain() {
  local domain="$1"
  local tld="${domain##*.}"

  if [ "${#domain}" -gt 253 ] || [ "${domain}" = "${tld}" ]; then
    return 1
  fi

  if [[ "${domain}" == *..* ]] || [[ "${domain}" =~ [/:_] ]]; then
    return 1
  fi

  if [[ ! "${domain}" =~ ^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$ ]]; then
    return 1
  fi

  [[ "${tld}" =~ ^[A-Za-z]{2,63}$ ]]
}

DOMAIN="${OPENPEEPS_DOMAIN:-${1:-}}"
ADMIN_EMAIL="${OPENPEEPS_ADMIN_EMAIL:-${2:-}}"
ADMIN_HANDLE="${OPENPEEPS_ADMIN_HANDLE:-${3:-}}"

if [ -z "${DOMAIN}" ] || [ "${DOMAIN}" = "-h" ] || [ "${DOMAIN}" = "--help" ]; then
  usage
  exit 1
fi

if ! is_valid_domain "${DOMAIN}"; then
  echo "Invalid domain '${DOMAIN}'. Provide a DNS hostname like openpeeps.example.com, without scheme, port, or path." >&2
  exit 1
fi

OPENPEEPS_IMAGE="${OPENPEEPS_IMAGE:-codeberg.org/openpeeps/openpeeps}"
OPENPEEPS_TAG="${OPENPEEPS_TAG:-stable}"
OPENPEEPS_ROOT="${OPENPEEPS_ROOT:-/opt/openpeeps}"
OPENPEEPS_DOMAIN="${DOMAIN}"
OPENPEEPS_LETSENCRYPT_EMAIL="${OPENPEEPS_LETSENCRYPT_EMAIL:-admin@${DOMAIN}}"
WATCHTOWER_SCHEDULE="${WATCHTOWER_SCHEDULE:-0 0 9 * * MON}"
SMTP_PORT="${SMTP_PORT:-465}"
SMTP_SERVER="${SMTP_SERVER:-}"
SMTP_LOGIN="${SMTP_LOGIN:-}"
SMTP_PASSWORD="${SMTP_PASSWORD:-}"
SMTP_FROM_ADDRESS="${SMTP_FROM_ADDRESS:-}"
JAMS_LIVEKIT_API_KEY="${JAMS_LIVEKIT_API_KEY:-}"
JAMS_LIVEKIT_API_SECRET="${JAMS_LIVEKIT_API_SECRET:-}"

export OPENPEEPS_DOMAIN OPENPEEPS_IMAGE OPENPEEPS_TAG OPENPEEPS_LETSENCRYPT_EMAIL WATCHTOWER_SCHEDULE
export SMTP_SERVER SMTP_PORT SMTP_LOGIN SMTP_PASSWORD SMTP_FROM_ADDRESS JAMS_LIVEKIT_API_KEY JAMS_LIVEKIT_API_SECRET

if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  if ! command -v sudo >/dev/null 2>&1; then
    echo "Run this script as root, or install sudo and rerun it." >&2
    exit 1
  fi
  SUDO="sudo"
fi

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command '$1' is not available." >&2
    exit 1
  fi
}

install_curl() {
  if command -v curl >/dev/null 2>&1; then
    return
  fi

  if command -v apt-get >/dev/null 2>&1; then
    $SUDO apt-get update
    $SUDO apt-get install -y curl ca-certificates
  elif command -v dnf >/dev/null 2>&1; then
    $SUDO dnf install -y curl ca-certificates
  elif command -v yum >/dev/null 2>&1; then
    $SUDO yum install -y curl ca-certificates
  elif command -v apk >/dev/null 2>&1; then
    $SUDO apk add --no-cache curl ca-certificates
  else
    echo "Install curl first, then rerun this script." >&2
    exit 1
  fi
}

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    return
  fi

  echo "Installing Docker ..."
  install_curl
  curl -fsSL https://get.docker.com | $SUDO sh
}

start_docker() {
  if docker_cmd info >/dev/null 2>&1; then
    return
  fi

  if command -v systemctl >/dev/null 2>&1; then
    $SUDO systemctl enable --now docker
  elif command -v service >/dev/null 2>&1; then
    $SUDO service docker start
  fi

  if ! docker_cmd info >/dev/null 2>&1; then
    echo "Docker is installed but the daemon is not running." >&2
    exit 1
  fi
}

docker_cmd() {
  if [ -n "$SUDO" ]; then
    $SUDO docker "$@"
  else
    docker "$@"
  fi
}

compose() {
  docker_cmd compose --project-directory "${OPENPEEPS_ROOT}" --env-file "${OPENPEEPS_ROOT}/config.env" -f "${OPENPEEPS_ROOT}/docker-compose.yml" "$@"
}

write_file() {
  local path="$1"
  if [ -n "$SUDO" ]; then
    $SUDO tee "$path" >/dev/null
  else
    tee "$path" >/dev/null
  fi
}

append_file() {
  local path="$1"
  if [ -n "$SUDO" ]; then
    $SUDO tee -a "$path" >/dev/null
  else
    tee -a "$path" >/dev/null
  fi
}

install_docker
require_command docker
start_docker

if ! docker_cmd compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin is not available. Install docker compose and rerun this script." >&2
  exit 1
fi

if [ -n "${CODEBERG_USERNAME:-}" ] && [ -n "${CODEBERG_TOKEN:-}" ]; then
  echo "Logging in to codeberg.org ..."
  printf '%s' "${CODEBERG_TOKEN}" | docker_cmd login codeberg.org -u "${CODEBERG_USERNAME}" --password-stdin
fi

echo "Creating ${OPENPEEPS_ROOT} ..."
$SUDO mkdir -p "${OPENPEEPS_ROOT}"
$SUDO touch "${OPENPEEPS_ROOT}/secrets.env"
$SUDO chmod 600 "${OPENPEEPS_ROOT}/secrets.env"

echo "Writing docker-compose.yml ..."
write_file "${OPENPEEPS_ROOT}/docker-compose.yml" <<'COMPOSE'
services:
  db:
    image: arangodb:3.11
    restart: always
    environment:
      - ARANGO_NO_AUTH=1
    healthcheck:
      test: ["CMD-SHELL", "wget -q --spider --proxy=off 127.0.0.1:8529/_api/version || exit 1"]
    volumes:
      - arangodb:/var/lib/arangodb3
    networks:
      - internal

  redis:
    image: redis:alpine
    restart: always
    command:
      - redis-server
      - --appendonly
      - "yes"
      - --appendfsync
      - "no"
      - --no-appendfsync-on-rewrite
      - "yes"
      - --notify-keyspace-events
      - KEA
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
    volumes:
      - redis:/data
    networks:
      - internal

  openpeeps:
    image: ${OPENPEEPS_IMAGE}:${OPENPEEPS_TAG}
    restart: always
    env_file:
      - config.env
      - secrets.env
    environment:
      - DB_URL=http://db:8529
      - REDIS_HOST=redis
      - SERVER_HOST=${OPENPEEPS_DOMAIN}
      - ORIGIN=https://${OPENPEEPS_DOMAIN}
      - EMAIL_CONFIG_HOST=${SMTP_SERVER}
      - EMAIL_CONFIG_PORT=${SMTP_PORT}
      - EMAIL_CONFIG_AUTH_USER=${SMTP_LOGIN}
      - EMAIL_CONFIG_AUTH_PASS=${SMTP_PASSWORD}
      - EMAIL_DEFAULT_FROM=${SMTP_FROM_ADDRESS}
      - JAMS_LIVEKIT_API_KEY=${JAMS_LIVEKIT_API_KEY}
      - JAMS_LIVEKIT_API_SECRET=${JAMS_LIVEKIT_API_SECRET}
    healthcheck:
      test: ["CMD-SHELL", "wget -q --spider --proxy=off 127.0.0.1:8080/health || exit 1"]
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - media:/apat/.media
      - logs:/apat/.logs
    labels:
      - traefik.enable=true
      - traefik.docker.network=openpeeps_public
      - traefik.http.routers.openpeeps.rule=Host(`${OPENPEEPS_DOMAIN}`)
      - traefik.http.routers.openpeeps.entrypoints=websecure
      - traefik.http.routers.openpeeps.tls.certresolver=letsencrypt
      - traefik.http.services.openpeeps.loadbalancer.server.port=8080
    networks:
      - public
      - internal

  worker:
    image: ${OPENPEEPS_IMAGE}:${OPENPEEPS_TAG}
    restart: always
    command: ["/apat/docker/prod/start-worker.sh"]
    env_file:
      - config.env
      - secrets.env
    environment:
      - DB_URL=http://db:8529
      - REDIS_HOST=redis
      - SERVER_HOST=${OPENPEEPS_DOMAIN}
      - ORIGIN=https://${OPENPEEPS_DOMAIN}
      - EMAIL_CONFIG_HOST=${SMTP_SERVER}
      - EMAIL_CONFIG_PORT=${SMTP_PORT}
      - EMAIL_CONFIG_AUTH_USER=${SMTP_LOGIN}
      - EMAIL_CONFIG_AUTH_PASS=${SMTP_PASSWORD}
      - EMAIL_DEFAULT_FROM=${SMTP_FROM_ADDRESS}
      - EMAIL_RENDER_HOST_BASE_URL=http://openpeeps:8080
      - JAMS_LIVEKIT_API_KEY=${JAMS_LIVEKIT_API_KEY}
      - JAMS_LIVEKIT_API_SECRET=${JAMS_LIVEKIT_API_SECRET}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
      openpeeps:
        condition: service_started
    volumes:
      - media:/apat/.media
      - logs:/apat/.logs
    networks:
      - internal

  traefik:
    image: traefik:v3
    restart: always
    command:
      - --entrypoints.web.address=:80
      - --entrypoints.web.http.redirections.entrypoint.to=websecure
      - --entrypoints.web.http.redirections.entrypoint.scheme=https
      - --entrypoints.websecure.address=:443
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --certificatesresolvers.letsencrypt.acme.httpchallenge=true
      - --certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web
      - --certificatesresolvers.letsencrypt.acme.email=${OPENPEEPS_LETSENCRYPT_EMAIL}
      - --certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - letsencrypt:/letsencrypt
    networks:
      - public

  watchtower:
    image: nickfedor/watchtower
    restart: always
    environment:
      - TZ=GMT
    command:
      - --schedule
      - ${WATCHTOWER_SCHEDULE}
      - --cleanup
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - public

volumes:
  arangodb:
  redis:
  media:
  logs:
  letsencrypt:

networks:
  public:
    name: openpeeps_public
  internal:
    internal: true
COMPOSE

if [ ! -s "${OPENPEEPS_ROOT}/config.env" ]; then
  echo "Writing config.env ..."
  write_file "${OPENPEEPS_ROOT}/config.env" <<CONFIG
OPENPEEPS_DOMAIN=${DOMAIN}
OPENPEEPS_IMAGE=${OPENPEEPS_IMAGE}
OPENPEEPS_TAG=${OPENPEEPS_TAG}
OPENPEEPS_LETSENCRYPT_EMAIL=${OPENPEEPS_LETSENCRYPT_EMAIL}
WATCHTOWER_SCHEDULE=${WATCHTOWER_SCHEDULE}
SMTP_SERVER=${SMTP_SERVER}
SMTP_PORT=${SMTP_PORT}
SMTP_LOGIN=${SMTP_LOGIN}
SMTP_PASSWORD=${SMTP_PASSWORD}
SMTP_FROM_ADDRESS=${SMTP_FROM_ADDRESS}
JAMS_LIVEKIT_API_KEY=${JAMS_LIVEKIT_API_KEY}
JAMS_LIVEKIT_API_SECRET=${JAMS_LIVEKIT_API_SECRET}
CONFIG
else
  echo "Keeping existing ${OPENPEEPS_ROOT}/config.env."
fi
$SUDO chmod 600 "${OPENPEEPS_ROOT}/config.env"

echo "Pulling containers ..."
compose pull

if ! $SUDO grep -q '^JWT_SECRET=' "${OPENPEEPS_ROOT}/secrets.env"; then
  echo "Generating JWT secret ..."
  JWT_SECRET="$(compose run --rm --no-deps openpeeps ./platform/app/apc secrets create-jwt-secret)"
  printf 'JWT_SECRET=%s\n' "${JWT_SECRET}" | append_file "${OPENPEEPS_ROOT}/secrets.env"
else
  echo "JWT secret already exists."
fi

echo "Starting OpenPeeps ..."
compose up -d

echo "Waiting for OpenPeeps container health ..."
OPENPEEPS_CONTAINER_ID="$(compose ps -q openpeeps)"
for _ in $(seq 1 60); do
  HEALTH="$(docker_cmd inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' "${OPENPEEPS_CONTAINER_ID}" 2>/dev/null || true)"
  if [ "${HEALTH}" = "healthy" ]; then
    break
  fi
  sleep 5
done

if [ "${ADMIN_EMAIL}" != "" ] && [ "${ADMIN_HANDLE}" != "" ]; then
  echo "Creating initial account ${ADMIN_HANDLE} <${ADMIN_EMAIL}> ..."
  compose run --rm openpeeps ./platform/app/apc accounts create --email "${ADMIN_EMAIL}" --handle "${ADMIN_HANDLE}" || \
    echo "Initial account was not created. It may already exist; check compose logs if needed."
else
  echo "No initial account requested."
fi

echo
echo "OpenPeeps is installed."
echo "URL: https://${DOMAIN}"
echo "Directory: ${OPENPEEPS_ROOT}"
echo "Logs: docker compose --project-directory ${OPENPEEPS_ROOT} --env-file ${OPENPEEPS_ROOT}/config.env -f ${OPENPEEPS_ROOT}/docker-compose.yml logs -f"
