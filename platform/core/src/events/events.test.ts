import { beforeEach, describe, expect, it, vi } from 'vitest';

// Pins the `hub.ready()` bounded-wait logic added by PR #2336 (review round 5,
// item 1): `ready()` resolves once every `on` subscription registered so far has
// finished its asynchronous Redis connect + SUBSCRIBE, but is bounded by
// `SUBSCRIBE_READY_TIMEOUT_MS` (10s) so an unavailable Redis cannot hold server
// startup hostage. On timeout it warns and continues (a down Redis already
// degrades every hub consumer). No real Redis is needed: the connection is
// mocked so the subscription's `connect` (node-redis's `getConnection()`)
// resolves on a controllable promise, and the 10s bound is driven by fake
// timers so the timeout branch is deterministic and fast.
//
// The pending unit `ready()` waits on is `getConnection().then(connect +
// SUBSCRIBE)` — the subscription's `connect()` (a forever-retrying node-redis
// `connect()`, per the module doc) is what keeps it pending. So the controllable
// promise lives on the mocked connection, not on `subscribe` (which the
// handler fires and forgets).
//
// Like the real usage in `install.ts`, each test registers its handler via
// `hub.on` *before* calling `hub.ready()` — `ready()` only waits on the
// subscriptions pending at the moment it is called.
//
// The module is reset per test (`vi.resetModules` + dynamic import) so each test
// gets a fresh `hub` with an empty `pendingSubscriptions` set — a leftover
// pending subscription from a prior test would otherwise make `ready()` warn or
// hang.

const log = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

const redis = vi.hoisted(() => {
  const state: { conn: Promise<unknown> | null } = { conn: null };
  return {
    state,
    getConnection: () => {
      if (!state.conn) throw new Error('redis conn not set');
      return state.conn;
    },
  };
});

vi.mock('../log', () => ({
  logger: () => ({ info: log.info, warn: log.warn, error: log.error }),
}));

vi.mock('../redis/connection', () => ({
  getConnection: redis.getConnection,
}));

// `./once` (imported by `./index`) pulls in BullMQ, which is not available here.
// Mock the job factory so importing `./index` never touches BullMQ; the tests
// exercise `ready()`, which does not use the once-queue.
vi.mock('../jobs', () => ({
  queueAndWorker: () => [() => ({ add: vi.fn() }), () => undefined],
}));

const setConn = (value: unknown) => {
  redis.state.conn = value as Promise<unknown> | null;
};

const freshHub = async () => {
  vi.resetModules();
  const mod = await import('./index');
  return mod.hub;
};

const makeControllable = () => {
  let resolveFn: () => void = () => undefined;
  const promise = new Promise<unknown>((r) => {
    resolveFn = () => r({ subscribe: async () => undefined });
  });
  return { promise, resolve: () => resolveFn() };
};

beforeEach(() => {
  log.warn.mockClear();
  log.info.mockClear();
  log.error.mockClear();
  setConn(null);
  vi.useRealTimers();
});

describe('hub.ready() bounded wait', () => {
  it('resolves immediately when no subscription is in flight', async () => {
    const hub = await freshHub();
    await expect(hub.ready()).resolves.toBeUndefined();
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('resolves once a pending subscription settles within the bound', async () => {
    vi.useFakeTimers();
    const hub = await freshHub();
    const conn = makeControllable();
    setConn(conn.promise); // Redis connect stays pending until we resolve it

    hub.on('postCreated', () => undefined); // registers a pending subscription
    const readyPromise = hub.ready();

    // While the connect is pending, `ready()` must not have resolved.
    let resolved = false;
    void readyPromise.then(() => {
      resolved = true;
    });
    await vi.advanceTimersByTimeAsync(1_000); // well within the 10s bound
    expect(resolved).toBe(false);

    conn.resolve(); // connect (and thus the subscription) settles in time
    await expect(readyPromise).resolves.toBeUndefined();
    expect(log.warn).not.toHaveBeenCalled(); // settled within the bound
    vi.useRealTimers();
  });

  it('resolves after the 10s timeout and warns when a subscription never settles', async () => {
    vi.useFakeTimers();
    const hub = await freshHub();
    const conn = makeControllable();
    setConn(conn.promise); // connect never resolves → subscription stays pending

    hub.on('postCreated', () => undefined); // registers a pending subscription
    const readyPromise = hub.ready();

    // Advance past the 10s bound; the subscription stays pending the whole way.
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(readyPromise).resolves.toBeUndefined();
    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn.mock.calls[0][1]).toMatch(/still pending/);
    vi.useRealTimers();
  });
});
