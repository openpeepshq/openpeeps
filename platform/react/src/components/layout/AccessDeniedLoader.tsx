import type { ReactNode } from 'react';
import { Loader, type LoaderProps } from '@openpeeps/react-ui';

export interface AccessDeniedLoaderProps extends Omit<LoaderProps, 'error'> {
  /** Render when one or more queries fail. Mirrors the AccessDenied snippet. */
  accessDenied?: ReactNode;
  accessDeniedMessage?: string;
}

/**
 * Translation of @openpeeps/svelte/components/layout/AccessDeniedLoader.svelte.
 *
 * Like {@link Loader} but renders an `accessDenied` slot in place of the
 * default error UI.
 */
export function AccessDeniedLoader({
  accessDenied,
  accessDeniedMessage = 'You do not have access to this resource.',
  ...props
}: AccessDeniedLoaderProps) {
  return (
    <Loader
      {...props}
      error={
        accessDenied ?? (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <h3 className="text-error text-xl font-semibold">Access denied</h3>
            <p>{accessDeniedMessage}</p>
          </div>
        )
      }
    />
  );
}
