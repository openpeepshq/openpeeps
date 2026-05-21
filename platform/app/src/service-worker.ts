/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import * as ssw from '$service-worker';
import { logger } from '@openpeeps/svelte/log';
import type {
  NotificationOptions as PushNotificationOptions,
  PushMessage,
} from '@openpeeps/common/types';

declare let self: ServiceWorkerGlobalScope;

const base = ssw.base ?? 'http://localhost:5173';

const log = logger('serviceWorker');

let refreshPort: MessagePort;
let pendingDeepLink: string | undefined; // store the intended URL from notificationclick for iOS fallback

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'INVALIDATE_QUERIES_PORT') {
    refreshPort = event.ports[0];
  }

  if (event.data && event.data.type === 'GET_PENDING_DEEPLINK') {
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
//precacheAndRoute(self.__WB_MANIFEST);
self.addEventListener('push', async (event) => {
  const { notification, notificationStats }: PushMessage =
    (await event?.data?.json()) ?? {};

  if (refreshPort && notification.invalidateQueries) {
    refreshPort.postMessage([
      ...(notification.invalidateQueries || []),
      ['profiles', 'current', 'notifications'],
    ]);
  }
  if (notificationStats.unseen && self.navigator.setAppBadge) {
    await self.navigator.setAppBadge(notificationStats.unseen);
  }
  const notificationOptions = notification.options
    ? {
      ...notification.options,
      badge:
        typeof notification.options.badge === 'number'
          ? String(notification.options.badge)
          : notification.options.badge,
    }
    : undefined;
  event.waitUntil(
    self.registration.showNotification(
      notification.title || '',
      notificationOptions,
    ),
  );
});

self.addEventListener('notificationclick', async (event) => {
  let action =
    event.action ||
    ((event.notification.data ?? {}) as PushNotificationOptions).actions?.[0]
      ?.action ||
    '';

  const dataUrl = (event.notification.data as { url?: string } | undefined)
    ?.url;
  if (!action && dataUrl) {
    action = `goto:${dataUrl.startsWith('/') ? dataUrl : `/${dataUrl}`}`;
  }

  event.notification.close();
  event.preventDefault();

  if (action.startsWith('goto:')) {
    const origin = self.location.origin;
    const basePath = base ?? '/';
    const relativePath = action.slice('goto:'.length) || '/';

    const normalizedBase =
      basePath === '/'
        ? ''
        : basePath.endsWith('/')
          ? basePath.slice(0, -1)
          : basePath;
    const normalizedRel = relativePath.startsWith('/')
      ? relativePath
      : `/${relativePath}`;
    const target = new URL(
      `${normalizedBase}${normalizedRel}`,
      origin,
    ).toString();

    pendingDeepLink = target;

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
                    url: target,
                  });
                } catch { }

                if (client.url !== target && 'navigate' in client) {
                  const c = await client
                    .navigate(target)
                    .catch(() => undefined);
                  return (c ?? client).focus();
                }
                return client.focus();
              } catch {
              }
            }
          }

          if (self.clients.openWindow) {
            await self.clients.openWindow(target).catch(() => undefined);
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
                    url: target,
                  });
                } catch { }
                try {
                  await c.focus();
                } catch { }
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
        .catch(() => { }),
    );
  }
});
