# Traefik deployment stack

This directory contains a production-style `docker-compose.yml` for running
OpenPeeps behind a Traefik reverse proxy.

## Usage

```sh
cd traefik
cp .env.example .env
# edit .env and set SERVICE_DOMAIN
docker compose up -d --build
```

## Notes

- `PLUGINS_PATH=/plugins` is set explicitly so operators control which plugins
  are loaded by mounting the desired plugin tree to `../plugins`.
- The mounted plugin tree must be a built workspace: each plugin needs its
  own `node_modules` (so workspace symlinks resolve) and a compiled `dist/`
  directory. Run `pnpm install && pnpm -r --filter "*plugins*" build` in the
  plugin root before (re)starting the stack, otherwise plugin loading fails.
- Postgres and Redis run as compose-managed services.
- `traefik-public` is expected to be an external Docker network managed by your
  Traefik container.
