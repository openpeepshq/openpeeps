import { endpoint, z } from '#lib/endpoint';
import { authNeeded, forbidden } from '#lib/errors';
import {
  accountExportStatusSchema,
  type AccountExportReady,
  type AccountExportState,
} from '@openpeepshq/common/types';
import { getExportByJob } from '@openpeepshq/core/accounts';
import { ensureAccount } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';

export const Query = z.object({
  jobId: z.uuid(),
});

export const Output = accountExportStatusSchema;

export const Error = {
  403: forbidden(),
  401: authNeeded(),
};

/**
 * Report the state of an export the account started. `state` is `building`
 * while the worker assembles the archive, `ready` once the archive exists
 * (exposing the single-use `downloadToken` and its `expiresAt`), `expired`
 * once the archive's token has lapsed or been cleaned up (start a new export),
 * `error` on failure, or `not-found` for an unknown job.
 */
export const apiEndpoint = endpoint({ Output, Query, Error }).handle(
  async (input: { jobId: string }, event: RequestEvent) => {
    const account = ensureAccount(event);
    const record = await getExportByJob(input.jobId);
    // Unknown job (no record written yet) → not-found.
    if (!record) {
      return { jobId: input.jobId, state: 'not-found' as AccountExportState };
    }
    if (record.accountId !== account.id) {
      throw forbidden();
    }
    const ready = record.state === 'ready' && !!record.token;
    // The ready payload is the shared `AccountExportReady` triple (state +
    // single-use token + expiry); `null` when the archive isn't ready yet.
    const readyPayload: AccountExportReady | null = ready
      ? {
          state: 'ready',
          downloadToken: record.token,
          expiresAt: record.expiresAt,
        }
      : null;
    return {
      jobId: input.jobId,
      state: readyPayload ? 'ready' : (record.state as AccountExportState),
      downloadToken: readyPayload?.downloadToken,
      expiresAt: readyPayload?.expiresAt,
      error: record.state === 'error' ? record.error : undefined,
    };
  },
);
