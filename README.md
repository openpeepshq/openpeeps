# OpenPeeps: The Open Source Community Solution by AllPeeP


### Docker based

Point a DNS `A` record at the VM, then run the installer on the VM:

```bash
sudo ./scripts/install-openpeeps-docker.sh openpeeps.example.com owner@example.com owner
```

The script installs Docker when needed, writes a Docker Compose stack under `/opt/openpeeps`, starts ArangoDB, Redis, OpenPeeps, the worker, Traefik for HTTPS, and Watchtower for weekly container updates on Mondays at 09:00 GMT, then creates the optional initial account. Ports `80` and `443` must be reachable from the internet for HTTPS provisioning. The domain must be a valid DNS hostname without a scheme, port, or path.

Use environment variables to customize the install:

```bash
OPENPEEPS_TAG=latest \
SMTP_SERVER=mail.example.com \
SMTP_LOGIN=noreply@example.com \
SMTP_PASSWORD=secret \
SMTP_FROM_ADDRESS=noreply@example.com \
sudo -E ./scripts/install-openpeeps-docker.sh openpeeps.example.com
```

### Set up Local Development

1. Install nodejs 20.x
2. Install ffmpeg - On MacOS `brew update && brew install ffmpeg`
3. Install pnpm with `npm i -g pnpm`
4. Copy `.env.dev.example` to `.env`
5. Copy `platform/app/.env.example` to `platform/app/.env`
6. Run `docker compose up -d db redis` to start the database and redis
7. Run `pnpm install`
8. Run `pnpm --filter @openpeeps/app... build`
9. In directory `platform/app` run `pnpm run dev`
10. Install playwright with `pnpm exec playwright install`

## Development

- During development, when a change is made in either the `platform/` or in the `libraries/` directory, you have to go in there and run `pnpm build` to rebuild the packages with your changes.


### Documentation

Visit /docs/development on your localhost or OpenPeeps install or https://openpeeps.ap.social/docs/ for the latest stable version documentation.


### Database
The default database server can be accessed at port 8529. 

http://localhost:8529/
