# Frontend Architecture

The OpenPeeps web UI is a React SPA. Shared UI lives in `@openpeepshq/react`;
the assembled app is `@openpeepshq/web`. React Native covers mobile.

## Frontend Options

### Web SPA (Primary)

The main web application is a **Vite + React** single-page app that talks to
`@openpeepshq/server` over `/api/openpeeps/core/v1`.

**Location**: `platform/web/`

**Key Features:**

- Client-side routing (React Router)
- Type-safe API integration via `@openpeepshq/client`
- Progressive Web App (PWA) support
- Mobile-first responsive design

**Technology Stack:**

- React 19 - Component framework
- React Router - Client routing
- TypeScript - Type safety
- Tailwind CSS - Styling
- Vite - Build tool

**Package**: `@openpeepshq/web`

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

**Package**: `@openpeepshq/react`

**Key Exports:**

- `OpenpeepsProvider` - Main context provider
- `useOpenpeeps()` - Hook to access the API client and query helpers
- Hooks for posts, profiles, groups, jams, etc. (via `openpeepsApi`)
- Credentials / session management

**Dependencies:**

- `@openpeepshq/client` - API client
- `@openpeepshq/common` - Shared types
- `@tanstack/react-query` - Data fetching
- React - Component framework

### React Native Components

Mobile app components for iOS and Android.

**Location**: `platform/rn-components/`

**Package**: `@openpeepshq/rn-components`

**Features:**

- Native mobile components
- Platform-specific implementations
- Shared business logic with web

## Shared Frontend Packages

### Client Library

Type-safe API client used by all frontend frameworks.

**Location**: `platform/client/`

**Package**: `@openpeepshq/client`

**Features:**

- Type-safe endpoint definitions
- Automatic request/response validation
- Error handling
- Authentication management

**Usage:**

```typescript
import { allpeepClient } from '@openpeepshq/client';

const client = allpeepClient({ baseUrl: 'https://api.example.com' });
const posts = await client.posts.list();
```

### Common Package

Shared types, utilities, and constants used across frontend and backend.

**Location**: `platform/common/`

**Package**: `@openpeepshq/common`

**Exports:**

- Type definitions (Profile, Post, Group, etc.)
- Zod schemas for validation
- Utility functions
- Constants and enums

## Frontend Architecture Patterns

### Component Structure

Components are TypeScript React modules (`.tsx`), typically arrow functions with
explicit props types:

```tsx
import type { PublicProfile } from '@openpeepshq/common/types';
import { useOpenpeeps } from '@openpeepshq/react';

type Props = {
  handle: string;
};

export const ProfileByHandle = ({ handle }: Props) => {
  const { openpeepsApi } = useOpenpeeps();
  const { data: profile } = openpeepsApi.useProfileByHandle(handle);

  return <div>{/* Component markup */}</div>;
};
```

### State Management

- **React Query** for server state (via `openpeepsApi.*` hooks)
- **React Context** for session, theme, and cross-cutting UI (`OpenpeepsProvider`,
  profile / toast providers)
- **Local state** with `useState` / `useReducer`

### Data Fetching

```tsx
import { useOpenpeeps } from '@openpeepshq/react';

const { openpeepsApi } = useOpenpeeps();
const { data: post, isLoading } = openpeepsApi.usePost(postId);
```

### API Integration

All frontends use the `@openpeepshq/client` package for type-safe API access:

```typescript
// Client automatically handles:
// - Type validation
// - Error handling
// - Authentication
// - Request/response transformation
```

## UI Libraries

### React UI

Shared primitives live in `@openpeepshq/react-ui` and higher-level components in
`@openpeepshq/react`:

- Buttons, inputs, dialogs, cards
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
  --filter "@openpeepshq/server..." \
  --filter "@openpeepshq/web..." \
  build
```

## Frontend Best Practices

1. **Type Safety**: Always use TypeScript types from `@openpeepshq/common`
2. **Component Reusability**: Use shared components from `@openpeepshq/react`
3. **API Client**: Always use `@openpeepshq/client` / `openpeepsApi` for API calls
4. **State Management**: Prefer React Query for server state
5. **Responsive Design**: Mobile-first approach
6. **Accessibility**: Follow WCAG guidelines
7. **Performance**: Lazy load components, optimize images, use code splitting

## Examples

### React Hook Usage

```tsx
import { useOpenpeeps } from '@openpeepshq/react';

export const PostList = () => {
  const { openpeepsApi } = useOpenpeeps();
  const { data, isLoading } = openpeepsApi.useLocalFeed();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>{data?.map((post) => <PostItem key={post.id} post={post} />)}</div>
  );
};
```

## Related Documentation

- [Primary Web Interface Layout](/docs/development/architecture/frontend/primary-web-interface) - Layout and responsive design
- [Routes](/docs/development/routes) - URL structure and routing
- [Code Style](/docs/development/code-style) - Frontend coding standards
- [Backend Architecture](/docs/development/architecture/backend) - API and server architecture
