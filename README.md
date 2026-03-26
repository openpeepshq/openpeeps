# AP-AT: The AllPeep Community Solution

## Development

- During development, when a change is made in either the `platform/` or in the `libraries/` directory, you have to go in there 
and run `pnpm build` to rebuild the packages with your changes.

### Docker based

TBD

### Local

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



### Documentation

/docs/development on your localhost or AP-AT install
[https://gitlab.allpeep-hq.com/allpeep/open-source/ap-at/-/tree/main/app/src/routes/(unprotected)/docs/development]

### Database

http://localhost:8529/
