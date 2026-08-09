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

- **`@openpeeps/server`** — Express + Riddl API server and static SPA host
- **`@openpeeps/web`** — Vite + React SPA
- **`@openpeeps/react`** — Shared React components and hooks
- **`@openpeeps/core`** — Backend business logic and data access
- **`@openpeeps/worker`** — Background job processor
- **`@openpeeps/cli`** — Command-line administration tools
- **`@openpeeps/react-native`** — React Native components
- **`@openpeeps/client`** — API client library
- **`@openpeeps/common`** — Shared types and utilities
- **`@openpeeps/i18n`** — Internationalization

### Libraries

- **`@openpeeps/fetch-client`** — HTTP client with event handling
- **`@openpeeps/geocoder`** — Geocoding service abstraction
- **`@openpeeps/greenscreen`** — Background processing for video
- **`@openpeeps/react-ui`** — Shared React UI components
- **`@openpeeps/arango-querybuilder`** — Legacy Arango query builder (cutover /
  historical tooling only; not the PG runtime path)

### Dependency graph

```
@openpeeps/web (React SPA)
   ├── @openpeeps/react
   │   ├── @openpeeps/client
   │   └── @openpeeps/common
   └── @openpeeps/react-ui

@openpeeps/server (API)
   ├── @openpeeps/core
   │   ├── @openpeeps/common
   │   └── @openpeeps/fetch-client
   └── @openpeeps/worker
       └── @openpeeps/core
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

- **React** — Web UI (`@openpeeps/web`, `@openpeeps/react`)
- **Express + Riddl** — API server (`@openpeeps/server`)
- **TypeScript** — Type-safe development
- **Zod** — Runtime type validation
- **PostgreSQL** — Primary relational store
- **Redis** — In-memory data store
- **LiveKit** — Real-time video/audio
- **Stripe** — Payment processing
- **BullMQ** — Job queue management

## Development workflow

1. **Shared code**: Types and utilities in `@openpeeps/common`
2. **Backend logic**: Business logic in `@openpeeps/core`
3. **API**: Endpoints in `@openpeeps/server/src/api/`
4. **Frontend**: React components in `@openpeeps/react`, pages in `@openpeeps/web`
5. **Build**: `pnpm -r --filter "@openpeeps/server..." --filter "@openpeeps/web..." build`
