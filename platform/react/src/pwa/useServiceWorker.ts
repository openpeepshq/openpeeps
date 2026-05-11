/// <reference lib="dom" />

import { useEffect, useRef, useState } from 'react';
import {
  registerServiceWorker,
  type RegisterServiceWorkerOptions,
  type ServiceWorkerHandle,
} from './registration';

export interface UseServiceWorkerResult {
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
  /** Skip the waiting SW and reload the page. */
  applyUpdate: () => void;
}

export interface UseServiceWorkerOptions extends RegisterServiceWorkerOptions {
  /** Disable registration (e.g. dev mode). */
  enabled?: boolean;
  /** Reload the page automatically when a new SW takes control. Defaults to true. */
  autoReload?: boolean;
}

/**
 * React hook wrapper around {@link registerServiceWorker}. Tracks
 * `isUpdateAvailable` so apps can render an "update available" banner.
 */
export function useServiceWorker({
  enabled = true,
  autoReload = true,
  onUpdateAvailable,
  onControllerChange,
  ...options
}: UseServiceWorkerOptions = {}): UseServiceWorkerResult {
  const handleRef = useRef<ServiceWorkerHandle | null>(null);
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let cancelled = false;
    void registerServiceWorker({
      ...options,
      onUpdateAvailable: (reg) => {
        if (cancelled) return;
        setIsUpdateAvailable(true);
        onUpdateAvailable?.(reg);
      },
      onControllerChange: () => {
        onControllerChange?.();
        if (autoReload && typeof window !== 'undefined') {
          window.location.reload();
        }
      },
    }).then((handle) => {
      handleRef.current = handle;
      if (!cancelled) setRegistration(handle.registration);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const applyUpdate = () => {
    handleRef.current?.skipWaiting();
  };

  return {
    isRegistered: !!registration,
    isUpdateAvailable,
    registration,
    applyUpdate,
  };
}
