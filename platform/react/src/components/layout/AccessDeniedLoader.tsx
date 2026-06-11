import type { ReactNode } from 'react';
import { Loader, type LoaderProps } from '@openpeeps/react-ui';
import { AccessDenied } from './AccessDenied';

export interface AccessDeniedLoaderProps extends Omit<LoaderProps, 'error'> {
  /** @deprecated Use `fallbackError` — custom UI for non–access-denied errors. */
  accessDenied?: ReactNode;
  accessDeniedMessage?: string;
  /** Shown for non–access-denied failures (e.g. profile not found). */
  fallbackError?: ReactNode;
}

/**
 * Translation of @openpeeps/svelte/components/layout/AccessDeniedLoader.svelte.
 *
 * Like {@link Loader} but renders {@link AccessDenied} in place of the default
 * error UI, distinguishing capability failures from other query errors.
 */
export function AccessDeniedLoader({
  accessDenied,
  accessDeniedMessage,
  fallbackError,
  queries = [],
  ...props
}: AccessDeniedLoaderProps) {
  return (
    <Loader
      {...props}
      queries={queries}
      error={
        accessDenied ?? (
          <AccessDenied
            queries={queries}
            message={accessDeniedMessage}
            fallbackError={fallbackError}
          />
        )
      }
    />
  );
}
