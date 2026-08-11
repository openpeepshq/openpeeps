import type { ReactNode } from 'react';
import { Button } from '@openpeepshq/react-ui';
import {
  useServiceWorker,
  type UseServiceWorkerOptions,
} from './useServiceWorker';

export interface UpdatePromptProps {
  className?: string;
  message?: ReactNode;
  reloadLabel?: string;
  /** Optionally pass-through SW options if you don't already mount PwaProvider. */
  swOptions?: UseServiceWorkerOptions;
}

/**
 * Inline banner shown when a new service worker version is waiting. Calling
 * "Reload" triggers SKIP_WAITING; a controllerchange will then reload the page.
 */
export function UpdatePrompt({
  className,
  message = 'A new version is available.',
  reloadLabel = 'Reload',
  swOptions,
}: UpdatePromptProps = {}) {
  const { isUpdateAvailable, applyUpdate } = useServiceWorker(swOptions);
  if (!isUpdateAvailable) return null;

  return (
    <div
      className={
        className ??
        'border-warning bg-surface-warning flex w-full items-center justify-between gap-3 rounded border p-3 text-sm shadow-sm'
      }
    >
      <div>{message}</div>
      <Button
        variant="default"
        className="bg-warning text-warning-foreground"
        action={applyUpdate}
      >
        {reloadLabel}
      </Button>
    </div>
  );
}
