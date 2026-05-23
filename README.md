# OpenPeeps: The Open Source Community Solution by AllPeeP


### Docker based

TBD

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
10. Install playwright with `pnpm exec playwright install` (from the `tests/` package)
11. Run integration tests with `pnpm --filter @openpeeps/tests run test:integration`

## Development

- During development, when a change is made in either the `platform/` or in the `libraries/` directory, you have to go in there and run `pnpm build` to rebuild the packages with your changes.


### Documentation

Visit /docs/development on your localhost or OpenPeeps install or https://openpeeps.ap.social/docs/ for the latest stable version documentation.


### Database
The default database server can be accessed at port 8529. 

http://localhost:8529/
