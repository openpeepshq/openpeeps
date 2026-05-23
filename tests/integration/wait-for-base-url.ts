import { debugLog } from './debug-log';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const record = error as { code?: string; cause?: unknown };
  if (record.code) return record.code;
  if (record.cause) return errorCode(record.cause);
  return undefined;
}

/**
 * Polls the app base URL until it responds or times out. CI service containers
 * (web, arangodb, redis) can take a few seconds to join the job network; Playwright
 * globalSetup used to fail immediately with getaddrinfo EAI_AGAIN on `web`.
 */
export async function waitForBaseUrl(
  baseURL: string,
  options?: { path?: string; maxAttempts?: number; delayMs?: number },
) {
  const path = options?.path ?? '/api';
  const maxAttempts = options?.maxAttempts ?? 60;
  const delayMs = options?.delayMs ?? 2000;
  const url = `${baseURL.replace(/\/$/, '')}${path}`;

  debugLog(
    'wait-for-base-url.ts:start',
    'waiting for base URL',
    { baseURL, url, maxAttempts, delayMs },
    'H1',
  );

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5_000),
      });

      debugLog(
        'wait-for-base-url.ts:attempt',
        'base URL responded',
        { attempt, status: response.status, url },
        'H1',
      );

      if (response.status < 500) {
        debugLog(
          'wait-for-base-url.ts:ready',
          'base URL ready',
          { attempt, status: response.status, url },
          'H1',
        );
        return;
      }
    } catch (error) {
      debugLog(
        'wait-for-base-url.ts:attempt',
        'base URL not ready',
        {
          attempt,
          url,
          error: error instanceof Error ? error.message : String(error),
          code: errorCode(error),
        },
        'H1',
      );
    }

    if (attempt < maxAttempts) {
      await sleep(delayMs);
    }
  }

  throw new Error(`Timed out waiting for ${url} after ${maxAttempts} attempts`);
}
