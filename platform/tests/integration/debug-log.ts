export function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
  runId = 'pre-fix',
) {
  if (!process.env.CI) {
    return;
  }

  console.error(
    `[integration-debug] ${JSON.stringify({
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    })}`,
  );
}
