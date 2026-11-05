import { Firehose } from '@atproto/sync';
import { IdResolver } from '@atproto/identity';
import { and, eq, isNull } from 'drizzle-orm';
import { queueAndWorker } from '../jobs';
import { logger } from '../log';
import { config } from '../config';
import { pgDb } from '../db/pg/client';
import { profiles } from '../db/pg/schema/documents';
import { atprotoIngestEnabled, pdsHostAllowed } from './peers';
import { ingestCommitOps } from './ingest';
import {
  handleDnsConfigured,
  publishHandleTxt,
  type HandleTxtTarget,
} from './handleDns';

const log = logger('app:atproto:jobs');

export type AtprotoIngestJob = {
  pdsEndpoint: string;
  did?: string;
  handle?: string;
  ops?: {
    action: 'create' | 'update' | 'delete';
    path: string;
    cid?: string;
    record?: unknown;
  }[];
};

const [atprotoIngestQueue, atprotoIngestWorker] = queueAndWorker<
  AtprotoIngestJob,
  string[]
>('atproto-ingest', async (job) => {
  if (!(await atprotoIngestEnabled())) return [];
  const { pdsEndpoint, did, handle, ops } = job.data;
  if (!(await pdsHostAllowed(pdsEndpoint))) {
    log.info(`Dropped ingest from disallowed PDS ${pdsEndpoint}`);
    return [];
  }
  if (!did || !ops?.length) return [];
  return ingestCommitOps({ did, pdsEndpoint, handle, ops });
});

export const enqueueAtprotoIngest = async (job: AtprotoIngestJob) => {
  await atprotoIngestQueue().add('ingest', job, {
    removeOnComplete: 100,
    removeOnFail: 200,
  });
};

const asHttps = (host: string) =>
  host.includes('://') ? host : `https://${host}`;

export const startAllowlistedIngest = async () => {
  if (!(await atprotoIngestEnabled())) {
    return async () => undefined;
  }
  const cfg = await config();
  const resolver = new IdResolver({
    timeout: 8_000,
    plcUrl: cfg.atproto.plcDirectory,
  });
  const hose: Firehose[] = [];
  for (const host of cfg.atproto.allowedPdsHosts) {
    if (host.includes('*')) continue;
    const service = asHttps(host);
    if (!(await pdsHostAllowed(service))) continue;
    const firehose = new Firehose({
      service,
      idResolver: resolver,
      unauthenticatedCommits: true,
      unauthenticatedHandles: true,
      handleEvent: async (evt) => {
        if (
          evt.event !== 'create' &&
          evt.event !== 'update' &&
          evt.event !== 'delete'
        ) {
          return;
        }
        await enqueueAtprotoIngest({
          pdsEndpoint: service,
          did: evt.did,
          handle:
            'handle' in evt && typeof evt.handle === 'string'
              ? evt.handle
              : undefined,
          ops: [
            {
              action: evt.event,
              path: `${evt.collection}/${evt.rkey}`,
              cid: 'cid' in evt ? evt.cid.toString() : undefined,
              record: 'record' in evt ? evt.record : undefined,
            },
          ],
        });
      },
      onError: (error) => {
        log.error(`Ingest firehose ${service}`, error);
      },
    });
    firehose.start();
    hose.push(firehose);
    log.info(`AT ingest subscribed to ${service}`);
  }
  return async () => {
    await Promise.all(hose.map((item) => item.destroy()));
  };
};

/** @deprecated use startAllowlistedIngest */
export const pollAllowlistedPdsHosts = startAllowlistedIngest;

const [atprotoHandleDnsQueue, atprotoHandleDnsWorker] = queueAndWorker<
  HandleTxtTarget,
  { name: string; content: string; provider: string } | null
>('atproto-handle-dns', async (job) => publishHandleTxt(job.data));

export const enqueueHandleTxt = async (target: HandleTxtTarget) => {
  if (!(await handleDnsConfigured())) return;
  await atprotoHandleDnsQueue().add('publish', target, {
    jobId: `txt-${target.atHandle}`,
    removeOnComplete: 100,
    removeOnFail: 200,
  });
};

export const enqueueLocalHandleTxtSync = async () => {
  if (!(await handleDnsConfigured())) return 0;
  const db = pgDb();
  const rows = await db
    .select({
      atHandle: profiles.atHandle,
      did: profiles.did,
    })
    .from(profiles)
    .where(and(eq(profiles.type, 'local'), isNull(profiles.deletedAt)));
  let queued = 0;
  for (const row of rows) {
    if (!row.atHandle || !row.did) continue;
    await enqueueHandleTxt({ atHandle: row.atHandle, did: row.did });
    queued += 1;
  }
  return queued;
};

export {
  atprotoHandleDnsQueue,
  atprotoHandleDnsWorker,
  atprotoIngestQueue,
  atprotoIngestWorker,
};
