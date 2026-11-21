import path from 'node:path';
import { queueAndWorker } from '../jobs';
import { logger } from '../log';
import { findAccount } from './finders';
import {
  gatherAccountExport,
  buildAccountExportZip,
  type AccountExportManifest,
} from './export';
import {
  ensureExportDir,
  markExportBuilding,
  markExportReady,
  markExportError,
  cleanupExpiredExports,
  type AccountExportCleanupResult,
} from './exportStore';

const log = logger('app:accounts:exportJob');

export interface AccountExportJobData {
  accountId: string;
}

export interface AccountExportJobResult {
  token?: string;
  path?: string;
  manifest?: AccountExportManifest;
}

/**
 * Run a single account export: gather the account's data, assemble the zip
 * archive, and publish a short-lived download token. Failures are recorded
 * (not thrown) so the BullMQ job itself does not end up in a noisy failed
 * state — the status endpoint reports the error to the requester. `jobId` is
 * the BullMQ job id.
 *
 * The zip is staged under `<media.storage.params.path>/exports/<accountId>-<jobId>`.
 * `exportStore.ts` owns that path and the daily cleanup sweep reclaims it.
 */
export const processAccountExportJob = async (
  jobId: string,
  accountId: string,
): Promise<AccountExportJobResult> => {
  await markExportBuilding(jobId, accountId);
  try {
    const account = await findAccount(accountId);
    if (!account) {
      throw new Error('Account no longer exists');
    }

    const exportRoot = await ensureExportDir();
    const destDir = path.join(exportRoot, `${accountId}-${jobId}`);

    const bundle = await gatherAccountExport(account);
    const { zipPath, manifest } = await buildAccountExportZip(bundle, destDir);
    const { token, expiresAt } = await markExportReady(
      jobId,
      accountId,
      zipPath,
    );

    log.info(
      `Export ready for account ${accountId}: jobId=${jobId} ` +
        `created=${manifest.counts.createdPosts} ` +
        `context=${manifest.counts.contextPosts} ` +
        `reacted=${manifest.counts.reactedPosts} ` +
        `media=${manifest.counts.media} ` +
        `expiresAt=${expiresAt}`,
    );
    return { token, path: zipPath, manifest };
  } catch (error) {
    const message = (error as Error).message || 'Export failed';
    log.error(`Export failed for account ${accountId}: ${message}`, error);
    await markExportError(jobId, accountId, message).catch(() => {});
    return {};
  }
};

const [accountExportQueue, accountExportWorker] = queueAndWorker<
  AccountExportJobData,
  AccountExportJobResult | AccountExportCleanupResult
>(
  'account-export',
  async (job) => {
    // The daily cleanup scheduler fires jobs named `cleanup` with no data.
    if (job.name === 'cleanup') {
      return cleanupExpiredExports();
    }
    // `job.id` keys the export record; a missing id would collide concurrent
    // exports under any fallback key, so fail loudly instead of guessing.
    if (!job.id) {
      throw new Error(`account-export job ${job.name} has no job id`);
    }
    return processAccountExportJob(job.id, job.data.accountId);
  },
  {
    defaultJobOptions: {
      removeOnComplete: { count: 20 },
      removeOnFail: { age: 86400 * 7, count: 20 },
    },
  },
);

/**
 * Daily (02:15 UTC) sweep of stale export artifacts. Idempotent under
 * `upsertJobScheduler`, safe to call on every worker boot.
 */
export const ensureAccountExportCleanupSchedule = async (): Promise<void> => {
  const queue = accountExportQueue();
  await queue.upsertJobScheduler(
    'account-export-cleanup-daily',
    { pattern: '15 2 * * *' },
    { name: 'cleanup' },
  );
  log.info('Account export cleanup schedule registered: cron="15 2 * * *"');
};

export { accountExportQueue, accountExportWorker };
