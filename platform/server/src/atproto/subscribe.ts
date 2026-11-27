import type { Server as HttpServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { MessageFrame } from '@atproto/xrpc-server';
import { listLocalRepoCommits } from '@openpeepshq/core/atproto';
import type { LocalRepoCommit } from '@openpeepshq/core/atproto';
import { logger } from '@openpeepshq/core/log';

// Cursor contract: `?cursor=` is a commit id (the uuidv7 `at_repo_commits`
// primary key; replay is uuidv7-lexicographic), while `seq` in each frame is
// a per-connection ordinal that resets to 0 on (re)connect — resume a
// stream with `?cursor=<last commit id>`, never with `seq`.

const log = logger('server:atproto:subscribe');

const toFrame = (event: LocalRepoCommit, seq: number) =>
  new MessageFrame(
    {
      seq,
      rebase: false,
      tooBig: false,
      repo: event.did,
      commit: event.commitCid,
      rev: event.rev,
      since: event.prev ?? null,
      blocks: event.car,
      ops: event.ops.map((op) => ({
        action: op.action,
        path: op.path,
        cid: op.action === 'delete' ? null : (op.cid ?? null),
      })),
      blobs: [],
      time: event.createdAt ?? new Date().toISOString(),
    },
    { type: '#commit' },
  );

const POLL_MS = 250;

// `?cursor=` must be a commit id (uuidv7 primary key of at_repo_commits);
// `listLocalRepoCommits` passes it into `gt(atRepoCommits.id, cursor)`
// untyped, so a non-uuid literal would reach the database as an
// invalid-uuid error and 500 the connection. A garbage cursor degrades to
// "stream from head" instead.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const parseCursor = (raw: string | null): string | null =>
  raw && UUID_RE.test(raw) ? raw : null;

type Subscriber = {
  ws: WebSocket;
  cursor: string | null;
  seq: number;
};

// One shared poll loop serves every connection: the oldest outstanding
// subscriber cursor bounds each query, and idle connections at the head add
// no extra DB load. A per-connection loop would cost 4 queries/s per idle
// subscriber. Commit ids are uuidv7, so lexicographic ordering matches the
// stream order used by listLocalRepoCommits.
const subscribers = new Set<Subscriber>();
let pollTimer: NodeJS.Timeout | undefined;

const oldestCursor = () =>
  [...subscribers].reduce<string | null>(
    (acc, sub) =>
      sub.cursor !== null && (acc === null || sub.cursor < acc)
        ? sub.cursor
        : acc,
    null,
  );

const pollOnce = async () => {
  if (subscribers.size === 0) return;
  const commits = await listLocalRepoCommits(oldestCursor(), 500);
  for (const commit of commits) {
    for (const sub of subscribers) {
      if (sub.cursor !== null && commit.id && commit.id <= sub.cursor) {
        continue;
      }
      sub.seq += 1;
      try {
        sub.ws.send(toFrame(commit, sub.seq).toBytes());
        sub.cursor = commit.id ?? sub.cursor;
      } catch (error) {
        log.error('Failed to write subscribeRepos frame', error);
        subscribers.delete(sub);
        try {
          sub.ws.close(1011, 'stream failed');
        } catch {
          // socket already gone
        }
      }
    }
  }
};

const ensurePoller = () => {
  if (pollTimer) return;
  const loop = async () => {
    if (subscribers.size === 0) {
      pollTimer = undefined;
      return;
    }
    try {
      await pollOnce();
    } catch (error) {
      log.error('subscribeRepos poll failed', error);
    }
    pollTimer = setTimeout(loop, POLL_MS);
  };
  pollTimer = setTimeout(loop, POLL_MS);
};

// subscribeRepos streams the persisted at_repo_commits stream, not an
// in-process fan-out: snapshots are produced by worker processes, so a
// process-local listener never sees them, and a `?cursor=<commit id>`
// resumes the stream after a reconnect or restart. `seq` is a
// per-connection, per-frame monotonic counter (starts at 0 on connect,
// +1 per delivered frame) used only to order frames *within* a
// connection; it is NOT a resume cursor and resets to 0 on every
// (re)connect, so consumers resubscribing with `?cursor=` must key their
// replay position on the `?cursor=` commit-id parameter and the frame's
// `rev`/`commit`/`since` fields — never on `seq` — or they will see seqs
// restart (and appear out of order) across reconnects.
export const attachSubscribeRepos = (server: HttpServer) => {
  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    const [path, query] = (req.url ?? '').split('?');
    if (path !== '/xrpc/com.atproto.sync.subscribeRepos') {
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      const raw = new URLSearchParams(query ?? '').get('cursor');
      const sub: Subscriber = {
        ws,
        cursor: parseCursor(raw),
        seq: 0,
      };
      subscribers.add(sub);
      ensurePoller();
      ws.on('close', () => {
        subscribers.delete(sub);
      });
      ws.on('error', () => {
        subscribers.delete(sub);
      });
    });
  });
};
