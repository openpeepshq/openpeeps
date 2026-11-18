import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { MessageFrame } from '@atproto/xrpc-server';

// subscribeRepos serves the persisted at_repo_commits stream over a shared
// 250ms poll loop. These tests pin its cursor arithmetic: a `?cursor=<id>`
// resume skips every commit at or before the cursor, frames are numbered from
// seq 1 per connection, and the upgrade handler only answers the
// subscribeRepos path. The ws transport and the commit stream are mocked, so
// no socket or database is needed; frames are decoded with the real
// MessageFrame to stay faithful to the wire format.

type SentFrame = {
  seq: number;
  repo: string;
  commit: string;
  since: string | null;
};

const decodeFrame = (bytes: Uint8Array): SentFrame => {
  const frame = MessageFrame.fromBytes(Buffer.from(bytes));
  const body = frame.body as {
    seq: number;
    repo: string;
    commit: string;
    since?: string | null;
  };
  return {
    seq: body.seq,
    repo: body.repo,
    commit: body.commit,
    since: body.since ?? null,
  };
};

// Poll until `fn` stops throwing, so we can assert on the async poll-loop
// output without a waitFor dependency or real timers.
const pollUntil = async (fn: () => void, timeoutMs = 3000, intervalMs = 50) => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      fn();
      return;
    } catch (err) {
      if (Date.now() > deadline) throw err;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
};

class FakeWebSocket {
  sent: Uint8Array[] = [];
  closed = false;
  private handlers: Record<string, () => void> = {};
  on(event: string, fn: () => void) {
    this.handlers[event] = fn;
  }
  private emit(event: string) {
    this.handlers[event]?.();
  }
  close() {
    this.closed = true;
    this.emit('close');
  }
  send(bytes: Uint8Array) {
    this.sent.push(bytes);
  }
  get frames(): SentFrame[] {
    return this.sent.map(decodeFrame);
  }
}

// The mock factory cannot reference module-scope bindings (vitest hoisting),
// so the per-test handleUpgrade callback is held in a hoisted mutable slot.
const { wsState } = vi.hoisted(() => ({
  wsState: { upgradeCb: null as null | ((ws: FakeWebSocket) => void) },
}));

const COMMITS = [
  {
    id: 'c-0001',
    createdAt: '2026-01-01T00:00:01.000Z',
    did: 'did:plc:remote1',
    rev: '3rev1',
    commitCid: 'bafy-commit-1',
    prev: null,
    car: new Uint8Array([1]),
    ops: [
      {
        action: 'create' as const,
        path: 'app.bsky.actor.profile/self',
        cid: 'bafy-rec-1',
      },
    ],
  },
  {
    id: 'c-0002',
    createdAt: '2026-01-01T00:00:02.000Z',
    did: 'did:plc:remote1',
    rev: '3rev2',
    commitCid: 'bafy-commit-2',
    prev: 'c-0001',
    car: new Uint8Array([2]),
    ops: [
      {
        action: 'create' as const,
        path: 'app.bsky.feed.post/3post1',
        cid: 'bafy-rec-2',
      },
    ],
  },
  {
    id: 'c-0003',
    createdAt: '2026-01-01T00:00:03.000Z',
    did: 'did:plc:remote1',
    rev: '3rev3',
    commitCid: 'bafy-commit-3',
    prev: 'c-0002',
    car: new Uint8Array([3]),
    ops: [
      {
        action: 'create' as const,
        path: 'app.bsky.feed.post/3post2',
        cid: 'bafy-rec-3',
      },
    ],
  },
];

const listLocalRepoCommits = vi.fn(async () => COMMITS);

vi.mock('@openpeepshq/core/atproto', () => ({ listLocalRepoCommits }));
vi.mock('@openpeepshq/core/log', () => ({
  logger: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  }),
}));
vi.mock('ws', () => ({
  WebSocketServer: class {
    handleUpgrade = (
      _req: { url?: string },
      _socket: unknown,
      _head: unknown,
      cb: (ws: FakeWebSocket) => void,
    ) => {
      wsState.upgradeCb = cb;
    };
  },
}));

const { attachSubscribeRepos } = await import('./subscribe');

let upgrade: (
  req: { url?: string },
  socket: unknown,
  head: unknown,
) => void = () => {};
let fake: FakeWebSocket;

// Wire an upgrade listener capture, then attach the handler, then hand the
// captured callback a fake socket. Returns the fake for assertions.
const connect = (server: EventEmitter, url: string) => {
  vi.spyOn(server, 'on').mockImplementation(
    (event: string | symbol, fn: (...a: unknown[]) => void) => {
      if (event === 'upgrade')
        upgrade = fn as (req: { url?: string }, s: unknown, h: unknown) => void;
      return server;
    },
  );
  attachSubscribeRepos(server as never);
  fake = new FakeWebSocket();
  upgrade({ url }, {}, {});
  wsState.upgradeCb?.(fake);
  return fake;
};

describe('subscribeRepos (shared poll loop)', () => {
  beforeEach(() => {
    wsState.upgradeCb = null;
    vi.clearAllMocks();
    listLocalRepoCommits.mockResolvedValue(COMMITS);
  });

  // The module-level subscriber set persists across tests; deregister each
  // fake so the shared poll loop does not leak state (or sockets) forward.
  afterEach(() => {
    fake?.close();
  });

  it('streams every commit from seq 1 for a fresh connection', async () => {
    const server = new EventEmitter();
    connect(server, '/xrpc/com.atproto.sync.subscribeRepos');
    await pollUntil(() => {
      expect(fake.frames.map((f) => f.commit)).toEqual([
        'bafy-commit-1',
        'bafy-commit-2',
        'bafy-commit-3',
      ]);
    });
    // Per-connection seq starts at 1 and increments.
    expect(fake.frames.map((f) => f.seq)).toEqual([1, 2, 3]);
    // `since` chains from the previous commit; the first frame has none.
    expect(fake.frames.map((f) => f.since)).toEqual([null, 'c-0001', 'c-0002']);
    expect(fake.frames[0].repo).toBe('did:plc:remote1');
  });

  it('resumes after the cursor: commits at or before it are skipped', async () => {
    const server = new EventEmitter();
    connect(server, '/xrpc/com.atproto.sync.subscribeRepos?cursor=c-0002');
    await pollUntil(() => {
      expect(fake.frames.length).toBe(1);
      expect(fake.frames[0].commit).toBe('bafy-commit-3');
    });
    // The resumed connection starts its own seq counter at 1.
    expect(fake.frames[0].seq).toBe(1);
    // It reports the cursor as its starting `since`.
    expect(fake.frames[0].since).toBe('c-0002');
  });

  it('does not open a stream for other upgrade paths', async () => {
    const server = new EventEmitter();
    connect(server, '/xrpc/com.atproto.sync.getRepos');
    // Give the poll loop a couple of cycles: no frame must ever be sent.
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(fake.sent).toEqual([]);
  });
});
