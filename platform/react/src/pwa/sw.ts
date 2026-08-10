/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/**
 * @openpeepshq/react PWA service worker.
 *
 * Framework-agnostic worker referenced from vite-plugin-pwa via
 * `injectManifest`:
 *
 *   VitePWA({
 *     strategies: 'injectManifest',
 *     srcDir: 'node_modules/@openpeepshq/react/dist/pwa',
 *     filename: 'sw.js',
 *     ...
 *   })
 *
 * It supports:
 *   - SKIP_WAITING from the page
 *   - INVALIDATE_QUERIES_PORT bridge so the page can refetch after a push
 *   - GET_PENDING_DEEPLINK fallback for iOS notification clicks
 *   - push event → showNotification + setAppBadge + invalidate queries
 *   - notificationclick `goto:` action → focus matching client / open window
 */

import type { NotificationOptionsType, PushMessage } from '@openpeepshq/common';
import { resolveGotoTarget } from './navigationUrl';

const PUSH_BASE_INVALIDATE_KEYS = [
  ['profiles', 'current', 'notifications', 'stats'],
  ['profiles', 'current', 'notifications'],
] as const;

const dedupeQueryKeys = (
  keys: readonly (readonly string[])[],
): (readonly string[])[] => {
  const seen = new Set<string>();
  return keys.filter((key) => {
    const serialized = JSON.stringify(key);
    if (seen.has(serialized)) return false;
    seen.add(serialized);
    return true;
  });
};

declare const self: ServiceWorkerGlobalScope;

const log = (level: string, ...args: unknown[]) =>
  console.log(`serviceWorker - ${level}`, ...args);

// `BASE_URL` is replaced at build time by vite-plugin-pwa or rolldown injection.
// We fall back to `self.registration.scope` at runtime when not present.
const base = (() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fromEnv = (self as any).__OPENPEEPS_BASE__ as string | undefined;
  if (fromEnv) return fromEnv;
  try {
    return new URL(self.registration.scope).pathname;
  } catch {
    return '/';
  }
})();

let refreshPort: MessagePort | undefined;
let pendingDeepLink: string | undefined;

self.addEventListener('message', (event) => {
  const data = event.data as { type?: string } | undefined;
  if (data?.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
  if (data?.type === 'INVALIDATE_QUERIES_PORT') {
    refreshPort = event.ports[0];
  }
  if (data?.type === 'GET_PENDING_DEEPLINK') {
    if (pendingDeepLink) {
      try {
        (event.source as Client | null)?.postMessage({
          type: 'NAVIGATE_TO',
          url: pendingDeepLink,
        });
      } finally {
        pendingDeepLink = undefined;
      }
    }
  }
});

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      const message: PushMessage =
        ((await event?.data?.json()) as PushMessage) ?? ({} as PushMessage);

      const { notification, notificationStats } = message;

      if (refreshPort) {
        refreshPort.postMessage({
          keys: dedupeQueryKeys([
            ...PUSH_BASE_INVALIDATE_KEYS,
            ...(notification?.invalidateQueries ?? []),
          ]),
          notificationStats,
        });
      }

      if (
        notificationStats?.unseen !== undefined &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        typeof (self.navigator as any).setAppBadge === 'function'
      ) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (self.navigator as any).setAppBadge(notificationStats.unseen);
        } catch (err) {
          log('warn', 'setAppBadge failed', err);
        }
      }

      if (notification) {
        await self.registration.showNotification(
          notification.title ?? '',
          notification.options,
        );
      }
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  const action =
    event.action ||
    (event.notification as unknown as NotificationOptionsType)?.actions?.[0]
      ?.action ||
    '';

  event.notification.close();
  event.preventDefault();

  if (!action.startsWith('goto:')) return;

  const origin = self.location.origin;
  // Absolute URL for openWindow / Client.navigate; path-only for in-page
  // NAVIGATE_TO — React Router treats scheme URLs as relative pathnames.
  const { absoluteUrl, routerPath } = resolveGotoTarget(
    action,
    origin,
    base ?? '/',
  );

  pendingDeepLink = routerPath;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (clientList) => {
        for (const client of clientList) {
          if (
            client.url &&
            client.url.startsWith(origin) &&
            'focus' in client
          ) {
            try {
              try {
                (client as WindowClient).postMessage({
                  type: 'NAVIGATE_TO',
                  url: routerPath,
                });
              } catch {
                // ignore
              }
              if (client.url !== absoluteUrl && 'navigate' in client) {
                const c = await (client as WindowClient)
                  .navigate(absoluteUrl)
                  .catch(() => undefined);
                return (c ?? client).focus();
              }
              return client.focus();
            } catch {
              // try next candidate
            }
          }
        }

        if (self.clients.openWindow) {
          await self.clients.openWindow(absoluteUrl).catch(() => undefined);
        }

        const start = Date.now();
        const timeoutMs = 3000;
        const intervalMs = 300;

        async function tryNotifyClient(): Promise<void> {
          const list = await self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true,
          });
          for (const c of list) {
            if (c.url && c.url.startsWith(origin)) {
              try {
                (c as WindowClient).postMessage({
                  type: 'NAVIGATE_TO',
                  url: routerPath,
                });
              } catch {
                // ignore
              }
              try {
                await c.focus();
              } catch {
                // ignore
              }
              return;
            }
          }
          if (Date.now() - start < timeoutMs) {
            await new Promise((r) => setTimeout(r, intervalMs));
            return tryNotifyClient();
          }
        }

        return tryNotifyClient();
      })
      .catch(() => undefined),
  );
});

export {};
