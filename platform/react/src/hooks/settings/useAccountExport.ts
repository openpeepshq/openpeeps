import { useCallback, useState } from 'react';
import type { TFunction } from 'i18next';
import type { OpenpeepsClient } from '@openpeepshq/client';
import type { SettingsStatus } from './useTimezonePreference';

/**
 * Account data export (web delivery of the shared start → poll → download flow).
 *
 * Timing is deliberately asymmetric, and the two constants below are the
 * load-bearing pair — keep them calibrated together:
 * - `POLL_DEADLINE_MS` (15 min): how long the client keeps polling the status
 *   endpoint before giving up. Generous on purpose so even a very large
 *   (unbounded) export can finish while the user waits.
 * - `EXPORT_TTL_MS` (7 days, server side, `platform/core/src/accounts/exportStore.ts`):
 *   how long the assembled zip + its one-time token survive once ready.
 * So the client gives up at 15 minutes while the server keeps the archive
 * available for 7 days — a stalled or interrupted poll can still retrieve a
 * completed export well after the client deadline, and the token outlives any
 * single session. The client deadline is a UX cap, not a data-deletion signal.
 */

/** Milliseconds between two status polls while the export job runs. */
const POLL_INTERVAL_MS = 2000;
/**
 * How long the client keeps polling before giving up (15 min). See the module
 * comment above for why this is deliberately far shorter than the server-side
 * `EXPORT_TTL_MS` (7 days); the two are the load-bearing pair, so keep them
 * calibrated together.
 */
const POLL_DEADLINE_MS = 15 * 60 * 1000;

/** Single filename web and RN hand the user, so both platforms name the
 * same file. The server's `Content-Disposition` must stay in sync with it. */
export const EXPORT_FILENAME = 'openpeeps-account-export.zip';

type ExportState = 'building' | 'ready' | 'error' | 'expired' | 'not-found';

/**
 * Web delivery for the zip: fetch it and hand it to the browser as a
 * download. RN overrides this (it has no `fetch`/`<a>` — it hands the URL to
 * an external handler instead).
 */
const downloadWeb = async (url: string, t: TFunction): Promise<void> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      t('settings.account.exportDownloadError', {
        defaultValue: 'The download failed. Please try again.',
      }),
    );
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = EXPORT_FILENAME;
  link.click();
  URL.revokeObjectURL(blobUrl);
};

/**
 * Run the account data export: start the job, poll its status until the
 * archive is ready (or it fails/expires), then hand the download URL to the
 * platform's downloader. Component-test friendly: `client` and `t` come in as
 * arguments instead of being read from context; `download` defaults to the
 * web blob download so only the rendering platform differs.
 */
export const useAccountExport = ({
  client,
  t,
  download = downloadWeb,
}: {
  client: OpenpeepsClient;
  t: TFunction;
  /** Hand the download URL to the platform (web blob by default).
   * Must be stable across renders: `run` closes over it and re-memoizes
   * only when it changes. The second arg is the translation function, so the
   * default web downloader can localize its failure message; a platform
   * override that doesn't need it simply ignores it. */
  download?: (url: string, t: TFunction) => Promise<void>;
}) => {
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<SettingsStatus>(null);

  const run = useCallback(async () => {
    setExporting(true);
    try {
      const started = await client.accounts.current.export.start({});
      if (!('data' in started)) {
        throw new Error(
          t('settings.account.exportRequestFailed', {
            defaultValue: 'The export request failed.',
          }),
        );
      }
      const { jobId } = started.data;

      let state: ExportState = 'building';
      let downloadToken: string | undefined;
      let errorMessage: string | undefined;
      const deadline = Date.now() + POLL_DEADLINE_MS;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const res = await client.accounts.current.export.status({
          queryParameters: { jobId },
        });
        if (!('data' in res)) {
          throw new Error(
            t('settings.account.exportRequestFailed', {
              defaultValue: 'The export request failed.',
            }),
          );
        }
        const s = res.data;
        if (s.state === 'ready' && s.downloadToken) {
          state = 'ready';
          downloadToken = s.downloadToken;
          break;
        }
        if (s.state === 'error') {
          state = 'error';
          errorMessage = s.error;
          break;
        }
        if (s.state === 'expired') {
          state = 'expired';
          break;
        }
        if (s.state === 'not-found') {
          // The request endpoint pre-seeds `building` before it returns the
          // jobId, so a missing record can only mean it was lost (Redis
          // eviction/failover) — polling cannot recover it. Stop with a
          // "start a new export" message, mirroring `expired`.
          state = 'not-found';
          break;
        }
        state = 'building';
      }
      if (state === 'expired') {
        throw new Error(
          t('settings.account.exportExpired', {
            defaultValue: 'This export has expired. Please start a new one.',
          }),
        );
      }
      if (state === 'not-found') {
        throw new Error(
          t('settings.account.exportNotFound', {
            defaultValue:
              'This export could not be found. Please start a new one.',
          }),
        );
      }
      if (state !== 'ready' || !downloadToken) {
        throw new Error(
          errorMessage ??
            t('settings.account.exportTimeout', {
              defaultValue:
                'The export did not finish in time. Please try again.',
            }),
        );
      }

      const url =
        await client.accounts.current.export.downloadUrl(downloadToken);
      await download(url, t);
    } catch (err) {
      setStatus({
        type: 'error',
        message: t('settings.account.exportFailed', {
          defaultValue: `Failed: ${(err as Error).message}`,
          error: (err as Error).message,
        }),
      });
    } finally {
      setExporting(false);
    }
  }, [client, t, download]);

  return {
    exporting,
    status,
    startExport: run,
    clearExportStatus: () => setStatus(null),
  };
};
