/**
 * Pins the `useMyDrafts` offset-pagination contract (#382, round-14 review
 * item 3). It is the only drafts finders entry built on
 * `infiniteOffsetQueryApiHook` (every other feed hook is chronological), so
 * the offset path — `pageSize` plumbing into `limit`, the offset-free first
 * fetch, and `fetchNextPage` advancing `offset` by `pageSize` — is exercised
 * nowhere else in the repo. The real api hooks and TanStack Query run; only
 * the transport endpoint is stubbed, returning exactly two pages.
 */
// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { postHooks } from './posts';

const fake = vi.hoisted(() => {
  const state = {
    pageSize: 2,
    calls: [] as Array<{ limit?: number; offset?: number }>,
  };
  const page = (n: number) =>
    Array.from({ length: state.pageSize }, (_, i) => ({
      id: `post-${n}-${i}`,
      data: { type: 'note', content: `p${n}-${i}` },
    }));
  const listDrafts = Object.assign(
    async (options: {
      pathParameters?: unknown;
      queryParameters?: { limit?: number; offset?: number };
    }) => {
      const { limit, offset } = options.queryParameters ?? {};
      state.calls.push({ limit, offset });
      return { data: page((offset ?? 0) / state.pageSize + 1) };
    },
    {
      queryKey: ({
        pathParameters,
        queryParameters,
      }: {
        pathParameters?: unknown;
        queryParameters?: unknown;
      }) => ['posts-drafts', pathParameters ?? null, queryParameters ?? null],
    },
  );
  // Every client path the api constructor touches besides `listDrafts` is a
  // self-similar stub: callable like an endpoint, with a `queryKey`.
  const stubEndpoint = Object.assign(async () => ({ data: [] }), {
    queryKey: (...args: unknown[]) => ['fake-stub', ...args],
  });
  const stubTree = (): unknown => {
    const handler = {
      get: (target: Record<string, unknown>, prop: string) => {
        if (prop in target) return target[prop];
        const leaf = stubEndpoint as unknown as Record<string, unknown>;
        const value = leaf[prop] ?? stubTree();
        target[prop] = value;
        return value;
      },
    };
    return new Proxy<Record<string, unknown>>({}, handler);
  };
  const client = stubTree() as Record<string, unknown>;
  client.posts = { listDrafts } as never;
  return { state, client };
});

const api = postHooks(fake.client as never);

type HookResult = ReturnType<typeof api.useMyDrafts>;

let root: Root | undefined;
let captured: HookResult | undefined;

const mountHook = (pageSize?: number) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Probe = (): null => {
    captured = api.useMyDrafts(pageSize);
    return null;
  };
  const el = document.createElement('div');
  const r = createRoot(el);
  act(() => {
    r.render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(Probe),
      ),
    );
  });
  root = r;
};

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  captured = undefined;
  fake.state.calls = [];
});

describe('useMyDrafts offset pagination (#382)', () => {
  it('sends limit = pageSize (offset-free first fetch), flattens pages, and advances offset on fetchNextPage', async () => {
    fake.state.pageSize = 2;
    mountHook(2);

    await vi.waitFor(async () => {
      await act(async () => {});
      expect(captured!.data?.pages).toHaveLength(1);
    });

    // The first fetch carries the pageSize as `limit` and no offset — the
    // server's offset endpoint treats a missing offset as the start.
    expect(fake.state.calls).toEqual([{ limit: 2, offset: undefined }]);
    // `data.pages` is the flattened infinite-query shape: one array of rows
    // per fetched page.
    expect(captured!.data?.pages).toEqual([
      [
        expect.objectContaining({ id: 'post-1-0' }),
        expect.objectContaining({ id: 'post-1-1' }),
      ],
    ]);
    // A full page means another page exists.
    expect(captured!.hasNextPage).toBe(true);

    act(() => {
      void captured!.fetchNextPage();
    });

    await vi.waitFor(async () => {
      await act(async () => {});
      expect(captured!.data?.pages).toHaveLength(2);
    });

    // fetchNextPage advanced the offset by exactly the pageSize and kept the
    // limit.
    expect(fake.state.calls).toEqual([
      { limit: 2, offset: undefined },
      { limit: 2, offset: 2 },
    ]);
    expect(captured!.data?.pages).toEqual([
      [
        expect.objectContaining({ id: 'post-1-0' }),
        expect.objectContaining({ id: 'post-1-1' }),
      ],
      [
        expect.objectContaining({ id: 'post-2-0' }),
        expect.objectContaining({ id: 'post-2-1' }),
      ],
    ]);
  });

  it('uses the default feed limit when no pageSize is given', async () => {
    fake.state.pageSize = 2;
    mountHook();

    await vi.waitFor(async () => {
      await act(async () => {});
      expect(captured!.data).toBeDefined();
    });

    expect(fake.state.calls[0]?.limit).toBe(15);
    expect(fake.state.calls[0]?.offset).toBeUndefined();
  });
});
