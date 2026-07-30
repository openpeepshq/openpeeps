# Frontend Architecture

The OpenPeeps web UI is a React SPA. Shared UI lives in `@openpeeps/react`;
the assembled app is `@openpeeps/web`. React Native covers mobile.

## Frontend Options

### Web SPA (Primary)

The main web application is a **Vite + React** single-page app that talks to
`@openpeeps/server` over `/api/openpeeps/core/v1`.

**Location**: `platform/web/`

**Key Features:**

- Client-side routing (React Router)
- Type-safe API integration via `@openpeeps/client`
- Progressive Web App (PWA) support
- Mobile-first responsive design

**Technology Stack:**

- React 19 - Component framework
- React Router - Client routing
- TypeScript - Type safety
- Tailwind CSS - Styling
- Vite - Build tool

**Package**: `@openpeeps/web`

**Documentation:**

- [Primary Web Interface Layout](/docs/development/architecture/frontend/primary-web-interface) - Layout structure and responsive design

### React Component Library

React components and hooks for building OpenPeeps web applications.

**Location**: `platform/react/`

**Key Features:**

- React Query integration for data fetching
- Custom hooks for OpenPeeps resources
- Context providers for authentication and data
- Type-safe API integration

**Package**: `@openpeeps/react`

**Key Exports:**

- `AllPeepProvider` - Main context provider
- `useAllPeep()` - Hook to access the API
- Hooks for posts, profiles, groups, jams, etc.
- Credentials store management

**Dependencies:**

- `@openpeeps/client` - API client
- `@openpeeps/common` - Shared types
- `@tanstack/react-query` - Data fetching
- React - Component framework

### React Native Components

Mobile app components for iOS and Android.

**Location**: `platform/react-native/`

**Package**: `@openpeeps/react-native`

**Features:**

- Native mobile components
- Platform-specific implementations
- Shared business logic with web

## Shared Frontend Packages

### Client Library

Type-safe API client used by all frontend frameworks.

**Location**: `platform/client/`

**Package**: `@openpeeps/client`

**Features:**

- Type-safe endpoint definitions
- Automatic request/response validation
- Error handling
- Authentication management

**Usage:**

```typescript
import { allpeepClient } from '@openpeeps/client';

const client = allpeepClient({ baseUrl: 'https://api.example.com' });
const posts = await client.posts.list();
```

### Common Package

Shared types, utilities, and constants used across frontend and backend.

**Location**: `platform/common/`

**Package**: `@openpeeps/common`

**Exports:**

- Type definitions (Profile, Post, Group, etc.)
- Zod schemas for validation
- Utility functions
- Constants and enums

## Frontend Architecture Patterns

### Component Structure

Components follow a consistent structure:

```svelte
<script lang="ts">
  import type { PublicProfile } from '@openpeeps/common/types';
  import { profileByHandleStore } from '@openpeeps/svelte/api';

  interface Props {
    handle: string;
  }

  let { handle }: Props = $props();

  let profileQuery = $derived(profileByHandleStore(handle));
  let profile = $derived($profileQuery.data);
</script>

<div>
  <!-- Component markup -->
</div>
```

### State Management

**Svelte:**

- Uses Svelte 5 runes for reactivity
- Stores for server state (TanStack Query integration)
- Local component state with `$state()`
- Derived state with `$derived()`

**React:**

- React Query for server state
- Context API for global state
- Local state with `useState()`

### Data Fetching

**Svelte:**

```typescript
import { getPostStore } from '@openpeeps/svelte/api';

let postQuery = $derived(getPostStore(postId));
let post = $derived($postQuery.data);
```

**React:**

```typescript
import { useAllPeep } from '@openpeeps/react';

const { posts } = useAllPeep();
const { data: post } = posts.findById(postId);
```

### API Integration

All frontends use the `@openpeeps/client` package for type-safe API access:

```typescript
// Client automatically handles:
// - Type validation
// - Error handling
// - Authentication
// - Request/response transformation
```

## UI Libraries

### React UI

Shared primitives live in `@openpeeps/react-ui` and higher-level components in
`@openpeeps/react`:

- Buttons, inputs, cards
- Navigation components
- Theme system
- Responsive utilities

### Tailwind CSS

Utility-first CSS framework for styling:

- Consistent design system
- Responsive design
- Dark mode support
- Custom theme configuration

## Build Process

### Development

```bash
# API + worker (see run-openpeeps skill)
cd platform/server
pnpm dev
pnpm dev:worker

# Web SPA
cd platform/web
pnpm dev

# Shared React components (watch mode)
cd platform/react
pnpm build:watch
```

### Production

```bash
# Build server + web dependency closure
pnpm -r \
  --filter "@openpeeps/server..." \
  --filter "@openpeeps/web..." \
  build
```

## Frontend Best Practices

1. **Type Safety**: Always use TypeScript types from `@openpeeps/common`
2. **Component Reusability**: Use shared components from `@openpeeps/react`
3. **API Client**: Always use `@openpeeps/client` for API calls
4. **State Management**: Prefer React Query for server state
5. **Responsive Design**: Mobile-first approach
6. **Accessibility**: Follow WCAG guidelines
7. **Performance**: Lazy load components, optimize images, use code splitting

## Examples

### React Hook Usage

```tsx
import { useAllPeep } from '@openpeeps/react';

function PostList() {
  const { posts } = useAllPeep();
  const { data, isLoading } = posts.list();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>{data?.map((post) => <PostItem key={post.id} post={post} />)}</div>
  );
}
```

## Related Documentation

- [Primary Web Interface Layout](/docs/development/architecture/frontend/primary-web-interface) - Layout and responsive design
- [Routes](/docs/development/routes) - URL structure and routing
- [Code Style](/docs/development/code-style) - Frontend coding standards
- [Backend Architecture](/docs/development/architecture/backend) - API and server architecture
