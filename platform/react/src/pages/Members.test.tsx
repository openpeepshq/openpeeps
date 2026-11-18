/** @vitest-environment jsdom */
/**
 * Consumer-pin for the Members directory view (issue #211 round-6 review S1).
 *
 * The behavioral contract is "the directory list is filtered, pickers are not".
 * The server/SQL layer and the shared hook (`useProfiles(directory)` →
 * `queryParams: { directory: 'true' }`) are already pinned; this pins the
 * consumer wiring: if `platform/react/src/pages/Members.tsx` ever reverts
 * `useProfiles(true)` to plain `useProfiles()`, the profiles list is requested
 * without `directory=true` and this test fails.
 *
 * Everything above the HTTP boundary runs for real (buildOpenpeepsApi's
 * profileHooks, apiHook, TanStack Query) — only the transport is stubbed: a
 * fake `client` whose `profiles.list` endpoint records the query parameters it
 * was called with.
 */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => {
  const calls: Array<{ queryParameters?: Record<string, unknown> }> = [];
  const listEndpoint = Object.assign(
    async (options?: { queryParameters?: Record<string, string | number> }) => {
      calls.push({ queryParameters: options?.queryParameters });
      return { data: [] as unknown[] };
    },
    {
      queryKey: ({
        pathParameters,
        queryParameters,
      }: {
        pathParameters?: unknown;
        queryParameters?: unknown;
      }) => ['profiles', pathParameters ?? null, queryParameters ?? null],
    },
  );
  const stubEndpoint = Object.assign(async () => ({ data: [] }), {
    queryKey: (...args: unknown[]) => ['stub', ...args],
  });
  const stubTree = (): unknown => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get: (target: Record<string, unknown>, prop: string) => {
        if (prop in target) return target[prop];
        const value =
          (stubEndpoint as unknown as Record<string, unknown>)[prop] ??
          stubTree();
        target[prop] = value;
        return value;
      },
    };
    return new Proxy<Record<string, unknown>>({}, handler);
  };
  // The client is a self-similar stub tree (any path is callable and exposes
  // `queryKey`, so buildOpenpeepsApi can wire all hooks without live
  // transport) with the real recording `profiles.list` endpoint injected.
  const client = stubTree() as Record<string, unknown>;
  const profiles = stubTree() as Record<string, unknown>;
  profiles.list = listEndpoint;
  client.profiles = profiles;
  return {
    calls,
    client,
  };
});

vi.mock('../contexts/openpeeps', async () => {
  const { buildOpenpeepsApi } = await import('../contexts/openpeeps/hooks');
  return {
    useT: () => (key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? key,
    useOpenpeeps: () => ({
      openpeepsApi: buildOpenpeepsApi(
        fake.client as never,
        () => undefined,
        () => undefined,
      ),
      queryClient: new QueryClient(),
    }),
  };
});

vi.mock('../components', () => ({
  AccessDeniedLoader: (props: { children?: React.ReactNode }) =>
    createElement('div', null, props.children),
  ProfileCard: () => null,
}));

vi.mock('@openpeepshq/react-ui', () => ({
  Input: () => null,
  // authHooks (via buildOpenpeepsApi) loads the real ToastProvider module,
  // which imports `Toast` from react-ui at module scope.
  Toast: () => null,
}));

import { Members } from './Members';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('Members directory view consumer wiring (issue #211 S1)', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    fake.calls.length = 0;
    container = document.createElement('div');
    document.body.appendChild(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    root = createRoot(container);
    act(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <Members />
        </QueryClientProvider>,
      );
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('requests the profiles list with directory=true', async () => {
    // Wait for the query to have issued its (stubbed) request.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(fake.calls.length).toBeGreaterThan(0);
    const directoryCalls = fake.calls.filter(
      (call) => call.queryParameters?.directory === 'true',
    );
    expect(directoryCalls.length).toBeGreaterThan(0);
  });
});
