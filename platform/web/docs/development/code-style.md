# Code Style

## Linting

The AllPeeP Community Server uses [prettier](https://prettier.io) and [eslint](https://eslint.org/).

## Naming Conventions

### Types and Interfaces

- **Types**: Use PascalCase (e.g., `PostWithMeta`, `Profile`, `PublicProfile`)
- **Interfaces**: Use PascalCase (e.g., `Props`, `EmailComponentProps`, `JamContext`)
- **Type aliases**: Use PascalCase (e.g., `PostType`, `VisibilityType`, `ThemeOptions`)

### Zod Schemas

If types are to be used for runtime validation they should be created as [zod](https://zod.io) schemas:

- **Schema names**: Use camelCase and end with the word `Schema` (e.g., `profileDataSchema`, `postDataSchema`, `jamSettingsSchema`)
- **Type inference**: The Type should be in PascalCase and has the same name without the `Schema` suffix (e.g., `ProfileData`, `PostData`, `JamSettings`)
- **Export pattern**: Export both the schema and the inferred type:
  ```typescript
  export const profileDataSchema = z.object({...});
  export type ProfileData = z.infer<typeof profileDataSchema>;
  ```

### Functions

- **Function names**: Use camelCase (e.g., `createPost`, `findPost`, `listPosts`, `transformPost`)
- **Async functions**: Prefer `async/await` syntax over promise chains
- **Arrow functions**: Prefer arrow functions for exported functions
- **Function naming patterns**:
  - `find*` - for finding single entities (e.g., `findPost`, `findGroup`)
  - `list*` - for finding multiple entities (e.g., `listPosts`, `listPostsByProfile`)
  - `create*` - for creating entities (e.g., `createPost`)
  - `update*` - for updating entities (e.g., `updatePost`)
  - `delete*` - for deleting entities (e.g., `deletePost`)
  - `*Mutation` / `*Action` - for mutation helpers (e.g., `createPostMutation`,
    `updateCurrentProfileAction`)
  - `use*` - for React Query / UI hooks (e.g., `usePost`, `useProfileByHandle`)

### Variables and Constants

- **Variables**: Use camelCase (e.g., `mergedPost`, `profileSettings`, `participantReactions`)
- **Constants**: Use UPPER_SNAKE_CASE for true constants (e.g., `THEME_OPTIONS`, `handleRegexBase`) or camelCase for exported constants (e.g., `baseSchema`, `idSchema`)
- **Regular expressions**: Use camelCase with `Regex` suffix (e.g., `handleRegex`, `hashtagRegex`)

### Components

- **React components**: Files should be named in PascalCase matching the
  component export (e.g., `Avatar.tsx` exports `Avatar`)
- **Component props**: Define props with TypeScript types / interfaces
- **Component exports**: Prefer named exports; the exported name should match
  the file name

### API Routes

- **API endpoint files**: Use HTTP method names in PascalCase (e.g., `GET.ts`, `POST.ts`, `PUT.ts`, `DELETE.ts`)
- **Route handlers**: Riddl endpoint modules named by HTTP method (`GET.ts`, `POST.ts`, …)
- **API structure**: Follow the pattern `platform/server/src/api/openpeeps/core/v1/[resource]/[method].ts`

### File Organization

- **Core domain logic**: Organize by domain with action-based files:
  - `mutations.ts` - for create/update/delete operations
  - `finders.ts` - for query/find operations
  - `mapping.ts` - for database mapping operations
  - `helpers.ts` - for helper/utility functions
  - `index.ts` - for re-exports
- **Component organization**: Group related components in directories (e.g., `components/jams/`)
- **Type definitions**: Centralize shared types in `@openpeepshq/common/types`

## Code Structure

### Imports

- **Type imports**: Use `import type` for type-only imports:
  ```typescript
  import type { PostWithMeta, Profile } from '@openpeepshq/common/types';
  ```
- **Value imports**: Use regular `import` for runtime values:
  ```typescript
  import { allpeepDb } from '../db';
  import { transformPost } from './helpers';
  ```
- **Import grouping**: Group imports logically:
  1. External dependencies
  2. Internal type imports
  3. Internal value imports
  4. Relative imports
- **Import style**: Prefer named imports over default imports when possible

### TypeScript Patterns

- **Type safety**: Use strict TypeScript settings and avoid `any` when possible
- **Type inference**: Leverage TypeScript's type inference, especially with Zod schemas using `z.infer<typeof schema>`
- **Generic functions**: Use generics for reusable utility functions:
  ```typescript
  export const pick = <T, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> => {...}
  ```
- **Optional chaining**: Use optional chaining and nullish coalescing where appropriate
- **Async/await**: Prefer `async/await` over promise chains for better readability

### React Patterns

- **Hooks**: Use custom hooks for reusable logic (e.g., `useOpenpeeps`,
  `useCurrentProfile`)
- **Context**: Use React Context for shared state (`OpenpeepsProvider`, toast /
  theme / profile providers)
- **Components**: Prefer named arrow-function components with explicit props
  types (avoid `React.FC` unless required)
- **Hook naming**: Custom hooks should start with `use`

### API Route Patterns

- **Endpoint structure**: Use the `endpoint` helper from `@openpeepshq/server`:

  ```typescript
  export const Param = z.object({...});
  export const Output = schema;
  export const Error = { 404: notFound(), 403: forbidden() };

  export const apiEndpoint = endpoint({ Param, Output, Error }).handle(async (param, event) => {...});
  ```

- **Error handling**: Use consistent error helpers (e.g., `notFound()`, `forbidden()`)
- **Authorization**: Use authorization helpers (e.g., `ensurePostCapabilities`, `ensureServiceScope`)

### Database Patterns

- **Database access**: Use `allpeepDb()` to get database connection
- **Mapping operations**: Use mapping objects for database operations (e.g., `postsMapping.find()`, `profilesMapping.create()`)
- **Query building**: Use the query builder pattern with filters and sorts
- **Relations**: Use relation finders for graph queries (e.g., `relationsFrom()`)

### Data Fetching (React Query)

- Prefer hooks from `@openpeepshq/react` backed by `@openpeepshq/client`
- Keep mutations next to the resource hooks they update

## Examples

### Type and Schema Definition

```typescript
export const profileDataSchema = z.object({
  handle: accountNameSchema,
  displayName: z.string().max(30).optional(),
  bio: z.string().optional(),
});
export type ProfileData = z.infer<typeof profileDataSchema>;
export const profileSchema = modelSchema(profileDataSchema);
export type Profile = Model<ProfileData>;
```

### Function Definition

```typescript
export const createPost = async (
  data: PostDataUnion,
  profile: Profile,
  postData: PostData,
  relations: {
    inReplyToId?: string | null;
    repostId?: string;
  } = {},
): Promise<PostWithMeta> => {
  // implementation
};
```

### React Component

```tsx
import type { PublicProfile } from '@openpeepshq/common/types';

type Props = {
  profile?: PublicProfile;
  size?: number;
};

export const Avatar = ({ profile, size = 3.5 }: Props) => (
  <div style={{ width: `${size}rem`, height: `${size}rem` }}>
    {/* component content */}
  </div>
);
```

### API Endpoint

```typescript
import { endpoint, z } from '#lib/endpoint';
import { findPost } from '@openpeepshq/core/posts';
import { publicPostSchema } from '@openpeepshq/common/types';
import { notFound, forbidden } from '#lib/errors';

export const Param = z.object({
  postId: z.string(),
});

export const Output = publicPostSchema;

export const Error = {
  404: notFound(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (param, _event) => {
    const post = await findPost(param.postId);
    if (!post) {
      throw notFound(`Post with id ${param.postId}`);
    }
    return post;
  },
);
```
