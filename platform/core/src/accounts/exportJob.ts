import path from 'node:path';
import { queueAndWorker } from '../jobs';
import { logger } from '../log';
import { findAccount } from './finders';
import { buildAccountExportZip, type AccountExportManifest } from './export';
import type { AccountExportReady } from '@openpeepshq/common/types';
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
  /**
   * The shared ready triple (state + single-use token + expiry), single-sourced
   * from `AccountExportReady` so it can't drift from the status endpoint's
   * `downloadToken`/`expiresAt` payload. `path`/`manifest` are job-local book-
   * keeping (where the zip landed, its counts) and are not part of the
   * download-ready shape.
   */
  ready?: AccountExportReady;
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

    // The assembly is bounded: created posts, thread context, reacted-to
    // posts and media are each paged at `EXPORT_PAGE_SIZE` and every file is
    // streamed straight to the staging directory, so the worker never holds
    // the account's whole data set in memory (review #237 r13).
    const { zipPath, manifest } = await buildAccountExportZip(account, destDir);
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
    // The ready triple is the shared `AccountExportReady` shape (same single
    // source the status endpoint reports) — `path`/`manifest` stay job-local.
    const ready: AccountExportReady = {
      state: 'ready',
      downloadToken: token,
      expiresAt,
    };
    return { ready, path: zipPath, manifest };
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
