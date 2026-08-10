# Architecture

The AllPeeP Community Server is a modular monorepo: a React web client, an
Express API server, shared libraries, and background workers.

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
│  ┌──────────┐  ┌──────────────┐                         │
│  │  React   │  │ React Native │                         │
│  │  (Web)   │  │  (Mobile)    │                         │
│  └──────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Server  │  │  Worker  │  │   CLI    │             │
│  │ (API)    │  │ (Jobs)   │  │ (Admin)  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    Business Logic Layer                  │
│  ┌──────────────────────────────────────────┐           │
│  │              Core Package                │           │
│  │  (Posts, Profiles, Groups, Jams, etc.)  │           │
│  └──────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    Shared Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Client  │  │  Common  │  │ Libraries│             │
│  │  (API)   │  │  (Types) │  │  (Utils) │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    Data Layer                            │
│  ┌──────────┐  ┌──────────┐                             │
│  │PostgreSQL│  │  Redis   │                             │
│  │ (primary)│  │  (Cache) │                             │
│  └──────────┘  └──────────┘                             │
└─────────────────────────────────────────────────────────┘
```

## Package Structure

### Platform packages

- **`@openpeepshq/server`** — Express + Riddl API server and static SPA host
- **`@openpeepshq/web`** — Vite + React SPA
- **`@openpeepshq/react`** — Shared React components and hooks
- **`@openpeepshq/core`** — Backend business logic and data access
- **`@openpeepshq/worker`** — Background job processor
- **`@openpeepshq/cli`** — Command-line administration tools
- **`@openpeepshq/react-native`** — React Native components
- **`@openpeepshq/client`** — API client library
- **`@openpeepshq/common`** — Shared types and utilities
- **`@openpeepshq/i18n`** — Internationalization

### Libraries

- **`@openpeepshq/fetch-client`** — HTTP client with event handling
- **`@openpeepshq/geocoder`** — Geocoding service abstraction
- **`@openpeepshq/greenscreen`** — Background processing for video
- **`@openpeepshq/react-ui`** — Shared React UI components
- **`@openpeepshq/arango-querybuilder`** — Legacy Arango query builder (cutover /
  historical tooling only; not the PG runtime path)

### Dependency graph

```
@openpeepshq/web (React SPA)
   ├── @openpeepshq/react
   │   ├── @openpeepshq/client
   │   └── @openpeepshq/common
   └── @openpeepshq/react-ui

@openpeepshq/server (API)
   ├── @openpeepshq/core
   │   ├── @openpeepshq/common
   │   └── @openpeepshq/fetch-client
   └── @openpeepshq/worker
       └── @openpeepshq/core
```

## Architecture components

- **[Frontend Architecture](/docs/development/architecture/frontend)** — React
  web client and React Native mobile
- **[Backend Architecture](/docs/development/architecture/backend)** — Core,
  API server, worker, CLI
- **[Realtime Architecture](/docs/development/architecture/realtime)** — HTTP,
  LiveKit, SSE, BullMQ/Redis hub, and push (no app-wide WebSocket)

## Data storage

- **PostgreSQL** — Primary database for entities and relationships (Drizzle ORM)
- **Redis** — Caching and event pub/sub system

See [Data Storage](/docs/development/data-storage) for details.

## Key technologies

- **React** — Web UI (`@openpeepshq/web`, `@openpeepshq/react`)
- **Express + Riddl** — API server (`@openpeepshq/server`)
- **TypeScript** — Type-safe development
- **Zod** — Runtime type validation
- **PostgreSQL** — Primary relational store
- **Redis** — In-memory data store
- **LiveKit** — Real-time video/audio
- **Stripe** — Payment processing
- **BullMQ** — Job queue management

## Development workflow

1. **Shared code**: Types and utilities in `@openpeepshq/common`
2. **Backend logic**: Business logic in `@openpeepshq/core`
3. **API**: Endpoints in `@openpeepshq/server/src/api/`
4. **Frontend**: React components in `@openpeepshq/react`, pages in `@openpeepshq/web`
5. **Build**: `pnpm -r --filter "@openpeepshq/server..." --filter "@openpeepshq/web..." build`
