import type { ReactNode } from 'react';
import { Button } from '@openpeeps/react-ui';
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
        'border-warning-500 bg-warning-50 dark:bg-warning-900/30 flex w-full items-center justify-between gap-3 rounded border p-3 text-sm shadow-sm'
      }
    >
      <div>{message}</div>
      <Button variant="variant-filled-warning" action={applyUpdate}>
        {reloadLabel}
      </Button>
    </div>
  );
}
