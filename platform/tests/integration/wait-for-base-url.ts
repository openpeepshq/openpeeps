const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Polls the app base URL until it responds or times out. CI service containers
 * (web, arangodb, redis) can take a few seconds to join the job network; Playwright
 * globalSetup used to fail immediately with getaddrinfo EAI_AGAIN on `web`.
 */
export async function waitForBaseUrl(
  baseURL: string,
  options?: { path?: string; maxAttempts?: number; delayMs?: number },
) {
  const path = options?.path ?? '/health';
  const maxAttempts = options?.maxAttempts ?? 60;
  const delayMs = options?.delayMs ?? 2000;
  const url = `${baseURL.replace(/\/$/, '')}${path}`;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5_000),
      });

      if (response.status < 500) {
        return;
      }
    } catch {
      // keep polling until maxAttempts
    }

    if (attempt < maxAttempts) {
      await sleep(delayMs);
    }
  }

  throw new Error(`Timed out waiting for ${url} after ${maxAttempts} attempts`);
}
