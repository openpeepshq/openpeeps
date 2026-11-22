import { randomUUID } from 'node:crypto';
import { endpoint } from '#lib/endpoint';
import { authNeeded, forbidden } from '#lib/errors';
import {
  accountExportJobSchema,
  type AccountExportJob,
} from '@openpeepshq/common/types';
import {
  accountExportQueue,
  markExportBuilding,
} from '@openpeepshq/core/accounts';
import { ensureAccount } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';

export const Output = accountExportJobSchema;

export const Error = {
  403: forbidden(),
  401: authNeeded(),
};

/**
 * Start a personal-data export for the authenticated account. The export
 * (created posts + thread context, reacted-to posts, profile data and media)
 * is assembled asynchronously by the `account-export` worker; the returned
 * `jobId` is polled at `export/status` to learn when the download is ready.
 */
export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_: unknown, event: RequestEvent): Promise<AccountExportJob> => {
    const account = ensureAccount(event);

    const jobId = randomUUID();
    // Pre-seed "building" so the status endpoint is immediately meaningful.
    await markExportBuilding(jobId, account.id);
    await accountExportQueue().add(
      'export',
      { accountId: account.id },
      { jobId },
    );

    return { jobId };
  },
);
