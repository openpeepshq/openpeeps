// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PublicPost } from '@openpeepshq/common';
import { CALENDAR_RANGE_LIMIT } from '../../contexts/openpeeps/hooks/posts';
import { useEventsCalendar } from './useEventsCalendar';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// The Openpeeps context is module-private, so the `useOpenpeeps` read is
// mocked; everything above the HTTP boundary (buildOpenpeepsApi api hooks,
// TanStack Query, the calendar hook) runs for real. Each window's range
// endpoint answers a full first page, then a short overflow page.
const fake = vi.hoisted(() => {
  let counter = 0;
  const state = {
    calls: [] as Array<{ from: string; offset?: number }>,
    walkArmed: true,
    /** When set, even the first page comes back short (no paging case). */
    shortFirstPage: false,
    /** When set, the first page returns exactly these rows (short page). */
    customFirstPage: null as unknown[] | null,
  };
  type RangeOptions = {
    queryParameters: {
      from: string;
      to: string;
      limit: number;
      offset?: number;
    };
  };
  type RangeEndpoint = {
    (options: RangeOptions): Promise<{ data: unknown[] }>;
    queryKey: (args: {
      pathParameters?: unknown;
      queryParameters?: unknown;
    }) => unknown[];
  };

  const ymdPlus = (ymd: string, days: number): string => {
    const date = new Date(
      Number(ymd.slice(0, 4)),
      Number(ymd.slice(5, 7)) - 1,
      Number(ymd.slice(8, 10)) + days,
    );
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  };

  const eventPost = (start: string, index = 0) => ({
    id: `post-${start}-${index}-${counter++}`,
    data: { type: 'event', start, name: 'Meet' },
    occurrenceStart: start,
  });

  // Fixture days sit two and three days inside the requested window, so the
  // day buckets are valid whatever month the browser timezone renders.
  const routed = Object.assign(
    (async (options: RangeOptions) => {
      const { queryParameters } = options;
      state.calls.push({
        from: queryParameters.from,
        offset: queryParameters.offset,
      });
      const fullDay = ymdPlus(queryParameters.from.slice(0, 10), 2);
      const shortDay = ymdPlus(queryParameters.from.slice(0, 10), 3);
      if (queryParameters.offset === undefined) {
        if (state.customFirstPage) {
          return { data: state.customFirstPage };
        }
        if (state.shortFirstPage) {
          return {
            data: [eventPost(`${fullDay}T10:00:00.000Z`, 0)],
          };
        }
        return {
          data: Array.from({ length: CALENDAR_RANGE_LIMIT }, (_, index) =>
            eventPost(`${fullDay}T10:00:00.000Z`, index),
          ),
        };
      }
      if (!state.walkArmed) {
        return { data: [] };
      }
      state.walkArmed = false;
      return {
        data: [eventPost(`${shortDay}T10:00:00.000Z`, 0)],
      };
    }) as RangeEndpoint,
    {
      queryKey: ({
        pathParameters,
        queryParameters,
      }: {
        pathParameters?: unknown;
        queryParameters?: unknown;
      }) => ['fake-range', pathParameters ?? null, queryParameters ?? null],
    },
  );

  // Every unreachable branch of the client becomes a self-similar stub: any
  // path is callable like an endpoint and exposes `queryKey`, so
  // buildOpenpeepsApi can wire hooks without touching live transport.
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

  const client = stubTree() as {
    posts: {
      feeds: {
        events: {
          range: RangeEndpoint;
          my: { range: RangeEndpoint };
          group: { range: RangeEndpoint };
        };
      };
    };
  };
  client.posts = {
    feeds: {
      events: {
        range: routed,
        my: { range: routed },
        group: { range: routed },
      },
    },
  };
  return {
    state,
    client,
    eventPost,
  };
});

vi.mock('../../contexts/openpeeps', async () => {
  const { buildOpenpeepsApi } = await import('../../contexts/openpeeps/hooks');
  const { QueryClient } = await import('@tanstack/react-query');
  const fakeApi = buildOpenpeepsApi(
    fake.client as never,
    () => undefined,
    () => undefined,
  );
  return {
    useOpenpeeps: () => ({
      openpeepsApi: fakeApi,
      client: fake.client,
      queryClient: new QueryClient(),
    }),
  };
});

type Captured = ReturnType<typeof useEventsCalendar>;

const mountHook = (
  scope: Parameters<typeof useEventsCalendar>[0] = {},
): {
  root: Root;
  read: () => Captured;
} => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  let captured: Captured | undefined;
  const Probe = (): null => {
    captured = useEventsCalendar(scope);
    return null;
  };
  const root = createRoot(document.createElement('div'));
  act(() => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <Probe />
      </QueryClientProvider>,
    );
  });
  return {
    root,
    read: () => {
      expect(captured).toBeDefined();
      return captured as Captured;
    },
  };
};

const totalByDay = (byDay: Map<string, unknown[]>): number =>
  [...byDay.values()].reduce((sum, bucket) => sum + bucket.length, 0);

describe('useEventsCalendar offset paging', () => {
  afterEach(() => {
    fake.state.calls.length = 0;
    fake.state.walkArmed = true;
    fake.state.shortFirstPage = false;
    fake.state.customFirstPage = null;
  });

  it('does not page when the first page comes back short', async () => {
    // A short first page (fewer rows than CALENDAR_RANGE_LIMIT) proves the
    // end of the list — no offset walk may run at all.
    fake.state.shortFirstPage = true;
    let mount: ReturnType<typeof mountHook> | undefined;
    await act(async () => {
      mount = mountHook();
    });
    await act(async () => {});
    await act(async () => {});

    expect(fake.state.calls).toHaveLength(1);
    expect(fake.state.calls[0]!.offset).toBeUndefined();
    expect(mount!.read().isFetchingNextPage).toBe(false);

    await act(async () => {
      mount!.root.unmount();
    });
  });

  it('walks offset pages while pages come back full and stops on a short page', async () => {
    let mount: ReturnType<typeof mountHook> | undefined;
    await act(async () => {
      mount = mountHook();
    });
    await act(async () => {
      await vi.waitFor(() => {
        expect(fake.state.calls).toHaveLength(2);
      });
    });
    await act(async () => {});

    const state = fake.state;
    // First page (no offset) plus one overflow page at CALENDAR_RANGE_LIMIT.
    expect(state.calls).toHaveLength(2);
    expect(state.calls[0]!.offset).toBeUndefined();
    expect(state.calls[1]!.offset).toBe(CALENDAR_RANGE_LIMIT);

    const read = mount!.read();
    // Full first page + short overflow page both land in the day buckets,
    // split across the two fixture days of the window.
    expect(totalByDay(read.byDay)).toBe(CALENDAR_RANGE_LIMIT + 1);
    expect(read.byDay.size).toBe(2);

    await act(async () => {
      mount!.root.unmount();
    });
  });

  it('clears overflow rows on a scope switch and re-walks the new window', async () => {
    let mount: ReturnType<typeof mountHook> | undefined;
    await act(async () => {
      mount = mountHook();
    });
    await act(async () => {});
    await act(async () => {});
    expect(totalByDay(mount!.read().byDay)).toBe(CALENDAR_RANGE_LIMIT + 1);

    // The next window's first page comes back full again, so the reset
    // overflow state must allow a fresh offset walk for the new window.
    fake.state.walkArmed = true;
    await act(async () => {
      mount!.read().shiftMonth(1);
    });
    await act(async () => {
      await vi.waitFor(() => {
        expect(fake.state.calls).toHaveLength(4);
      });
    });
    await act(async () => {});

    // Two windows, each walked once: full first page then a short page.
    expect(fake.state.calls).toHaveLength(4);
    expect(fake.state.calls[2]!.offset).toBeUndefined();
    expect(fake.state.calls[2]!.from).not.toBe(fake.state.calls[0]!.from);
    expect(fake.state.calls[3]!.offset).toBe(CALENDAR_RANGE_LIMIT);
    expect(totalByDay(mount!.read().byDay)).toBe(CALENDAR_RANGE_LIMIT + 1);
    expect(mount!.read().byDay.size).toBe(2);

    await act(async () => {
      mount!.root.unmount();
    });
  });
});

describe('useEventsCalendar agenda window guard (issue #2131)', () => {
  afterEach(() => {
    fake.state.calls.length = 0;
    fake.state.walkArmed = true;
    fake.state.shortFirstPage = false;
    fake.state.customFirstPage = null;
  });

  // Real-time fixtures. Fake timers would block the async TanStack query from
  // resolving, so the rows are built relative to the real clock: one started
  // 4h ago (its implied one-hour end has passed, so it is genuinely past) and
  // one starting 30h ahead. We assert the *out-of-window* row is absent from
  // the grid — the guard drops it regardless of which month it falls in, so
  // the assertion is stable across month boundaries and time zones.
  const makeRow = (offsetMs: number) =>
    fake.eventPost(new Date(Date.now() + offsetMs).toISOString());
  const HOUR = 60 * 60 * 1000;
  const idsInByDay = (byDay: Map<string, unknown[]>): string[] =>
    [...byDay.values()].flat().map((post) => (post as PublicPost).id);

  it('does not render a past row on the Upcoming tab', async () => {
    const past = makeRow(-4 * HOUR);
    const upcoming = makeRow(30 * HOUR);
    fake.state.customFirstPage = [past, upcoming];
    let mount: ReturnType<typeof mountHook> | undefined;
    await act(async () => {
      mount = mountHook({ window: 'upcoming' });
    });
    await act(async () => {});

    const ids = idsInByDay(mount!.read().byDay);
    expect(ids).not.toContain(past.id);

    await act(async () => {
      mount!.root.unmount();
    });
  });

  it('does not render a future row on the Past tab', async () => {
    const past = makeRow(-4 * HOUR);
    const upcoming = makeRow(30 * HOUR);
    fake.state.customFirstPage = [past, upcoming];
    let mount: ReturnType<typeof mountHook> | undefined;
    await act(async () => {
      mount = mountHook({ window: 'past' });
    });
    await act(async () => {});

    const ids = idsInByDay(mount!.read().byDay);
    expect(ids).not.toContain(upcoming.id);

    await act(async () => {
      mount!.root.unmount();
    });
  });
});
