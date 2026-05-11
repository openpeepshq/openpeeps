/// <reference lib="dom" />

import { logger } from '../log';

const log = logger('pwa');

export interface RegisterServiceWorkerOptions {
  /** URL of the service worker (defaults to `/sw.js`). */
  swUrl?: string;
  /** Scope (defaults to `/`). */
  scope?: string;
  /** Called when an update is found and installation completes (waiting). */
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void;
  /** Called when a new SW takes control (after `clients.claim`). */
  onControllerChange?: () => void;
  /** Called for inbound `NAVIGATE_TO` messages. */
  onNavigate?: (url: string) => void;
  /** Called when the SW posts query keys to invalidate. */
  onInvalidateQueries?: (keys: unknown[]) => void;
}

export interface ServiceWorkerHandle {
  registration: ServiceWorkerRegistration | null;
  unregister: () => Promise<boolean>;
  update: () => Promise<void>;
  /** Tell the SW to skipWaiting and become active. */
  skipWaiting: () => void;
}

/**
 * Registers the OpenPeeps service worker, wires up the
 * INVALIDATE_QUERIES_PORT bridge, and listens for inbound NAVIGATE_TO
 * notifications from the SW.
 */
export const registerServiceWorker = async (
  options: RegisterServiceWorkerOptions = {},
): Promise<ServiceWorkerHandle> => {
  const handle: ServiceWorkerHandle = {
    registration: null,
    unregister: async () => false,
    update: async () => undefined,
    skipWaiting: () => undefined,
  };

  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return handle;
  }

  const swUrl = options.swUrl ?? '/sw.js';
  const scope = options.scope ?? '/';

  try {
    const registration = await navigator.serviceWorker.register(swUrl, {
      scope,
    });
    handle.registration = registration;
    handle.unregister = () => registration.unregister();
    handle.update = () => registration.update().then(() => undefined);
    handle.skipWaiting = () =>
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });

    if (options.onUpdateAvailable) {
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        installing?.addEventListener('statechange', () => {
          if (
            installing.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            options.onUpdateAvailable?.(registration);
          }
        });
      });
    }

    if (options.onControllerChange) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        options.onControllerChange?.();
      });
    }

    navigator.serviceWorker.addEventListener('message', (event) => {
      const data = (event?.data || {}) as { type?: string; url?: string };
      if (data?.type === 'NAVIGATE_TO' && typeof data.url === 'string') {
        options.onNavigate?.(data.url);
      }
    });

    // INVALIDATE_QUERIES_PORT bridge — equivalent to the +layout.svelte logic.
    if (navigator.serviceWorker.controller && options.onInvalidateQueries) {
      const channel = new MessageChannel();
      navigator.serviceWorker.controller.postMessage(
        { type: 'INVALIDATE_QUERIES_PORT' },
        [channel.port2],
      );
      navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
      channel.port1.onmessage = (event) => {
        log.debug('Invalidating queries for keys:', event.data);
        options.onInvalidateQueries?.(event.data as unknown[]);
      };
      navigator.serviceWorker.controller.postMessage({
        type: 'GET_PENDING_DEEPLINK',
      });
    }
  } catch (err) {
    log.error('Service worker registration failed', err);
  }

  return handle;
};
