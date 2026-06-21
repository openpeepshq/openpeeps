# Architecture

The AllPeeP Community Server is a full-stack application built on [SvelteKit](https://kit.svelte.dev/) with a modular, monorepo architecture. The system is organized into platform packages, shared libraries, and frontend/backend components.

## System Overview

The AllPeeP platform follows a layered architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐         │
│  │  Svelte  │  │  React   │  │ React Native │         │
│  │  (Web)   │  │  (Web)   │  │  (Mobile)   │         │
│  └──────────┘  └──────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │   App    │  │  Worker   │  │   CLI    │           │
│  │(SvelteKit)│ │ (Jobs)    │  │ (Admin)  │           │
│  └──────────┘  └──────────┘  └──────────┘           │
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
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │  Client  │  │  Common   │  │ Libraries│           │
│  │  (API)   │  │  (Types)  │  │  (Utils) │           │
│  └──────────┘  └──────────┘  └──────────┘           │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    Data Layer                            │
│  ┌──────────┐  ┌──────────┐                           │
│  │ ArangoDB │  │  Redis   │                           │
│  │  (Graph) │  │  (Cache)  │                           │
│  └──────────┘  └──────────┘                           │
└─────────────────────────────────────────────────────────┘
```

## Package Structure

The platform is organized as a monorepo with the following packages:

### Platform Packages

- **`@openpeeps/app`** - Main SvelteKit application server
- **`@openpeeps/core`** - Backend business logic and data access
- **`@openpeeps/worker`** - Background job processor
- **`@openpeeps/cli`** - Command-line administration tools
- **`@openpeeps/svelte`** - Svelte component library
- **`@openpeeps/react`** - React component library and hooks
- **`@openpeeps/react-native`** - React Native components
- **`@openpeeps/client`** - API client library
- **`@openpeeps/common`** - Shared types and utilities
- **`@openpeeps/i18n`** - Internationalization

### Libraries

- **`@openpeeps/arango-querybuilder`** - ArangoDB query builder
- **`@openpeeps/fetch-client`** - HTTP client with event handling
- **`@openpeeps/geocoder`** - Geocoding service abstraction
- **`@openpeeps/greenscreen`** - Background processing for video
- **`@openpeeps/ui`** - Shared UI components
- **`@openpeeps/svelte5-email`** - Email template rendering

### Dependency Graph

```
@openpeeps/app (SvelteKit Server)
   ├── @openpeeps/core (Business Logic)
   │   ├── @openpeeps/common (Types & Utils)
   │   ├── @openpeeps/arango-querybuilder
   │   └── @openpeeps/fetch-client
   ├── @openpeeps/svelte (Components)
   │   ├── @openpeeps/client (API Client)
   │   │   └── @openpeeps/common
   │   └── @openpeeps/common
   ├── @openpeeps/worker (Background Jobs)
   │   └── @openpeeps/core
   └── @openpeeps/cli (Admin Tools)
       └── @openpeeps/core

@openpeeps/react (React Library)
   ├── @openpeeps/client
   └── @openpeeps/common

@openpeeps/react-native (Mobile)
   └── @openpeeps/common
```

## Architecture Components

### Frontend

The frontend supports multiple platforms:

- **[Frontend Architecture](/docs/development/architecture/frontend)** - Frontend components and structure
  - **[Primary Web Interface](/docs/development/architecture/frontend/primary-web-interface)** - Layout and responsive design
- **[React Components](/docs/development/architecture/frontend)** - React library for web applications
- **[React Native](/docs/development/architecture/frontend)** - Mobile app components

### Backend

The backend is organized into several components:

- **[Backend Architecture](/docs/development/architecture/backend)** - Backend components and patterns
  - Core Package - Business logic, data models, and database operations
  - API Layer - RESTful API endpoints with OpenAPI documentation
  - Worker - Background job processing
  - CLI - Administrative command-line tools

## Data Storage

- **ArangoDB** - Primary graph database for entities and relationships
- **Redis** - Caching and event pub/sub system

See the [Data Storage](/docs/development/data-storage) documentation for details.

## Key Technologies

- **SvelteKit** - Full-stack web framework
- **Svelte 5** - Component framework with runes
- **React** - Component library for web
- **React Native** - Mobile app framework
- **TypeScript** - Type-safe development
- **Zod** - Runtime type validation
- **ArangoDB** - Multi-model graph database
- **Redis** - In-memory data store
- **LiveKit** - Real-time video/audio
- **Stripe** - Payment processing
- **BullMQ** - Job queue management

## Development Workflow

1. **Shared Code**: Types and utilities in `@openpeeps/common`
2. **Backend Logic**: Business logic in `@openpeeps/core`
3. **API Client**: Type-safe client in `@openpeeps/client`
4. **Frontend**: Components consume client, client uses common types
5. **Build Process**: Packages are built independently and linked via workspace

## Next Steps

- Learn about the [Frontend Architecture](/docs/development/architecture/frontend)
- Learn about the [Backend Architecture](/docs/development/architecture/backend)
- Review [Code Style](/docs/development/code-style) guidelines
- Understand [Data Storage](/docs/development/data-storage) patterns
