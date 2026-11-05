import type { Server as HttpServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { MessageFrame } from '@atproto/xrpc-server';
import { onLocalRepoCommit } from '@openpeepshq/core/atproto';
import { logger } from '@openpeepshq/core/log';

const log = logger('server:atproto:subscribe');

let seq = 0;

export const attachSubscribeRepos = (server: HttpServer) => {
  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    const path = (req.url ?? '').split('?')[0];
    if (path !== '/xrpc/com.atproto.sync.subscribeRepos') {
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      const off = onLocalRepoCommit((event) => {
        const frame = new MessageFrame(
          {
            seq: ++seq,
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
            time: new Date().toISOString(),
          },
          { type: '#commit' },
        );
        try {
          ws.send(frame.toBytes());
        } catch (error) {
          log.error('Failed to write subscribeRepos frame', error);
        }
      });
      ws.on('close', off);
      ws.on('error', off);
    });
  });
};
