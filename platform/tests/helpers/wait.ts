export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const waitUntil = async (
  predicate: () => Promise<boolean> | boolean,
  {
    timeoutMs = 30_000,
    pollMs = 500,
    message = 'Timed out waiting for condition',
  }: { timeoutMs?: number; pollMs?: number; message?: string } = {},
) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await wait(pollMs);
  }
  throw new Error(message);
};
