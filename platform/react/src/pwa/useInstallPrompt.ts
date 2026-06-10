/// <reference lib="dom" />

import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface UseInstallPromptResult {
  /** True when the browser has fired beforeinstallprompt. */
  canInstall: boolean;
  /** Trigger the native install prompt. Returns the user's choice. */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  /** True when the app is already running in standalone (installed) mode. */
  isStandalone: boolean;
}

const detectStandalone = () => {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  // iOS Safari
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window.navigator as any).standalone) return true;
  return false;
};

/** React hook for the PWA "Add to Home Screen" install prompt. */
export function useInstallPrompt(): UseInstallPromptResult {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(detectStandalone());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setEvent(null);
      setIsStandalone(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!event) return 'unavailable' as const;
    await event.prompt();
    const choice = await event.userChoice;
    setEvent(null);
    return choice.outcome;
  }, [event]);

  return { canInstall: !!event, promptInstall, isStandalone };
}
