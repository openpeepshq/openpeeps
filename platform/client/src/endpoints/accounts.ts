import type { FetchClient } from '@openpeepshq/fetch-client';
import type {
  AccountExportJob,
  AccountExportStatus,
  PublicAccount,
  PushSubscription,
  PushSubscriptionData,
  SuccessResponse,
  UpdateAccountPasswordRequest,
} from '@openpeepshq/common';
import { allpeepNoPayloadEndpoint, allpeepPayloadEndpoint } from './helpers';

export const accounts = (rawClient: FetchClient) => ({
  current: {
    update: allpeepPayloadEndpoint<
      SuccessResponse,
      UpdateAccountPasswordRequest
    >(rawClient, '/accounts/current', 'patch'),
    read: allpeepNoPayloadEndpoint<PublicAccount>(
      rawClient,
      '/accounts/current',
    ),
    /**
     * Personal-data export (GDPR-style). The archive is assembled
     * asynchronously: `start()` enqueues the job and returns the `jobId`,
     * `status(jobId)` is polled until `ready`, and `downloadUrl(token)`
     * yields the one-time URL that streams the zip (auth is the token).
     */
    export: {
      start: allpeepPayloadEndpoint<AccountExportJob, Record<string, never>>(
        rawClient,
        '/accounts/current/export/request',
        'post',
      ),
      status: allpeepNoPayloadEndpoint<
        AccountExportStatus,
        undefined,
        { jobId: string }
      >(rawClient, '/accounts/current/export/status'),
      /**
       * One-time URL that streams the assembled archive. The token is the
       * credential (single-use, 7-day TTL); no auth header is required.
       * Resolves the client's base URL so it works in web and RN alike.
       *
       * The path is relative to the client base: `rawClient.getConfig()`
       * already returns `<options.baseUrl>/api/openpeeps/core/v1` (set in
       * `index.ts`), so appending the prefix again would double it and 404
       * against the server route `/api/openpeeps/core/v1/.../download`.
       */
      downloadUrl: async (downloadToken: string): Promise<string> => {
        const config = await rawClient.getConfig();
        const base = (config.baseUrl ?? '').replace(/\/$/, '');
        return `${base}/accounts/current/export/download?token=${encodeURIComponent(downloadToken)}`;
      },
    },
    createPushSubscription: allpeepPayloadEndpoint<
      PushSubscription,
      PushSubscriptionData
    >(rawClient, '/accounts/current/push-subscriptions'),
    listPushSubscriptions: allpeepNoPayloadEndpoint<PushSubscription[]>(
      rawClient,
      '/accounts/current/push-subscriptions',
    ),
    testPushSubscription: allpeepPayloadEndpoint<
      SuccessResponse,
      { subscriptionKey: string }
    >(rawClient, '/accounts/current/push-subscriptions/test'),
    validationEmail: allpeepNoPayloadEndpoint<SuccessResponse>(
      rawClient,
      '/accounts/current/validation-email',
      'post',
    ),
    deletePushSubcription: allpeepNoPayloadEndpoint<
      SuccessResponse,
      { pushSubscriptionId: string }
    >(
      rawClient,
      '/accounts/current/push-subscriptions/:pushSubscriptionId',
      'delete',
    ),
  },
});
