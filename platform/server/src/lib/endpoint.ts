import { endpoint as riddlEndpoint } from '@riddl/core';
import type { RequestEvent } from '@riddl/core';
import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

// Augment zod with `.openapi(...)` so endpoints can attach OpenAPI metadata
// to their schemas for Riddl's `zod-to-openapi` integration. Safe to call
// multiple times.
extendZodWithOpenApi(z);

export { z, type RequestEvent };

/**
 * Thin wrapper around Riddl's `endpoint` factory.
 *
 * Riddl passes body, query, and path params as separate fields. This helper
 * merges them into a single `input` object so handlers can destructure one
 * argument.
 *
 * Note: schemas from `@openpeepshq/common/types` use zod v3 while Riddl's types
 * are typed against zod v4. The wrapper is deliberately type-opaque
 * (everything is `unknown`/`any` at its boundary) to keep TypeScript out of
 * the deeply-recursive zod inference paths that would otherwise OOM when
 * compiling 150+ endpoints. At runtime zod v3 and v4 are call-compatible.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

interface Spec {
  Param?: Any;
  Query?: Any;
  Input?: Any;
  Output?: Any;
  Stream?: Any;
  Error?: Record<string, { status: number; message?: string; key?: string }>;
  Modifier?: (r: Any) => Any;
}

interface EndpointHandle {
  handle: <I = Any>(
    handler: (input: I, event: RequestEvent) => Promise<Any>,
  ) => Any;
}

export const endpoint = (spec: Spec = {}): EndpointHandle => {
  const inner = riddlEndpoint(spec as Any);
  return {
    handle: (handler) =>
      inner.handler(async ({ body, query, param, event }) => {
        const input = {
          ...((body as Record<string, unknown>) ?? {}),
          ...((query as Record<string, unknown>) ?? {}),
          ...((param as Record<string, unknown>) ?? {}),
        };
        return (await handler(input as Any, event)) as Any;
      }),
  };
};
