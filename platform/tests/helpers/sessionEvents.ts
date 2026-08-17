import { waitUntil } from './wait';

export type SessionSseEvent = {
  type: string;
  notification?: {
    title?: string;
    invalidateQueries?: string[][];
  };
  notificationStats?: { unread: number; unseen: number };
};

export type SessionSseListener = {
  events: SessionSseEvent[];
  close: () => Promise<void>;
};

const sessionEventsUrl = (
  baseURL: string,
  platform: string,
  connectionId: string,
) =>
  `${baseURL.replace(/\/$/, '')}/api/openpeeps/core/v1/profiles/current/session/events?platform=${encodeURIComponent(platform)}&connectionId=${encodeURIComponent(connectionId)}`;

const parseSseBlock = (block: string): SessionSseEvent | undefined => {
  const eventName = block.match(/^event: (.+)$/m)?.[1]?.trim();
  if (eventName !== 'message') return undefined;
  const data = block
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => decodeURIComponent(line.slice(6)))
    .join('\n');
  if (!data) return undefined;
  return JSON.parse(data) as SessionSseEvent;
};

/** Open the authenticated session SSE channel and collect invalidate events. */
export const listenSessionEvents = async (
  baseURL: string,
  token: string,
  {
    platform = 'web',
    connectionId = `test-${Date.now()}`,
  }: { platform?: string; connectionId?: string } = {},
): Promise<SessionSseListener> => {
  const events: SessionSseEvent[] = [];
  const controller = new AbortController();
  const response = await fetch(
    sessionEventsUrl(baseURL, platform, connectionId),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
      signal: controller.signal,
    },
  );
  if (!response.ok || !response.body) {
    throw new Error(
      `session SSE failed: ${response.status} ${await response.text()}`,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const pump = (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() ?? '';
        for (const block of blocks) {
          const event = parseSseBlock(block);
          if (event) events.push(event);
        }
      }
    } catch {
      // aborted
    }
  })();

  return {
    events,
    close: async () => {
      controller.abort();
      await reader.cancel().catch(() => undefined);
      await pump;
    },
  };
};

export const waitForSessionEvent = (
  listener: SessionSseListener,
  match: (event: SessionSseEvent) => boolean,
  timeoutMs = 60_000,
) =>
  waitUntil(() => listener.events.some(match), {
    timeoutMs,
    pollMs: 250,
    message: 'Timed out waiting for session SSE event',
  });
