import type { ReactNode } from 'react';
import { Button } from '@openpeeps/react-ui';
import { useInstallPrompt } from './useInstallPrompt';

export interface InstallPromptProps {
  className?: string;
  /** Override the default copy. */
  message?: ReactNode;
  installLabel?: string;
}

/**
 * Renders an inline "Install app" CTA when the browser supports it. Hidden
 * automatically once the app is installed or the user dismisses the native
 * prompt.
 */
export function InstallPrompt({
  className,
  message = 'Install this app for a faster, offline-friendly experience.',
  installLabel = 'Install',
}: InstallPromptProps = {}) {
  const { canInstall, promptInstall, isStandalone } = useInstallPrompt();
  if (!canInstall || isStandalone) return null;

  return (
    <div
      className={
        className ??
        'border-border bg-card flex w-full items-center justify-between gap-3 rounded border p-3 text-sm shadow-sm'
      }
    >
      <div>{message}</div>
      <Button
        variant="variant-filled-primary"
        action={async () => {
          await promptInstall();
        }}
      >
        {installLabel}
      </Button>
    </div>
  );
}
