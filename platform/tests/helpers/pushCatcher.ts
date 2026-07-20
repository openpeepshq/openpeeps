import { createServer, type IncomingMessage, type Server } from 'node:http';
import { AddressInfo } from 'node:net';

export type CaughtPush = {
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  receivedAt: string;
};

export type PushCatcher = {
  url: string;
  publicKey: string;
  pushes: CaughtPush[];
  close: () => Promise<void>;
};

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

const remoteCatcherBase = () =>
  (process.env.PUSH_CATCHER_URL ?? '').replace(/\/$/, '');

/**
 * Prefer a shared catcher service (PUSH_CATCHER_URL) so Docker sibling
 * containers (web/worker) can reach the webhook. Falls back to an in-process
 * listener for local Playwright runs.
 */
export const startPushCatcher = async (
  host = process.env.PUSH_CATCHER_HOST ?? '127.0.0.1',
): Promise<PushCatcher> => {
  const remote = remoteCatcherBase();
  const publicKey = `test-webhook-${Date.now()}`;

  if (remote) {
    await fetch(`${remote}/pushes`, { method: 'DELETE' }).catch(
      () => undefined,
    );
    return {
      url: `${remote}/push/${publicKey}`,
      publicKey,
      pushes: [] as CaughtPush[],
      close: async () => undefined,
    };
  }

  const pushes: CaughtPush[] = [];
  const server: Server = createServer(async (req, res) => {
    if (req.method === 'POST') {
      const raw = await readBody(req);
      let body: unknown = raw;
      try {
        body = JSON.parse(raw);
      } catch {
        // keep raw string
      }
      pushes.push({
        headers: { ...req.headers },
        body,
        receivedAt: new Date().toISOString(),
      });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => {
    server.listen(0, host === '127.0.0.1' ? '127.0.0.1' : '0.0.0.0', () =>
      resolve(),
    );
  });

  const address = server.address() as AddressInfo;
  const urlHost = host === '0.0.0.0' ? '127.0.0.1' : host;
  const url = `http://${urlHost}:${address.port}/push`;

  return {
    url,
    publicKey,
    pushes,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
};

export const waitForPush = async (
  catcher: PushCatcher,
  {
    timeoutMs = 15_000,
    pollMs = 250,
  }: { timeoutMs?: number; pollMs?: number } = {},
): Promise<CaughtPush> => {
  const remote = remoteCatcherBase();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (remote) {
      const response = await fetch(`${remote}/pushes`);
      if (response.ok) {
        const body = (await response.json()) as { pushes: CaughtPush[] };
        const match = body.pushes.find(
          (push) =>
            (push as CaughtPush & { id?: string }).id === catcher.publicKey ||
            body.pushes.length > 0,
        );
        if (match) return match;
        if (body.pushes.length > 0) return body.pushes[0];
      }
    } else if (catcher.pushes.length > 0) {
      return catcher.pushes[0];
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  throw new Error('Timed out waiting for webhook push');
};
