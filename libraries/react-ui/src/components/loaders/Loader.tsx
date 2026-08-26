import * as React from 'react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { WaitForQueries } from './WaitForQueries';
import type { PartialQueryObserverResult } from '@/types';

export interface LoaderProps {
  fullScreen?: boolean;
  loadingMessage?: string;
  errorMessage?: string;
  className?: string;
  queries?: PartialQueryObserverResult<unknown>[];
  promises?: Promise<unknown>[];
  ignoreErrors?: boolean;
  children?: React.ReactNode;
  loading?: React.ReactNode;
  error?: React.ReactNode;
}

export function Loader({
  fullScreen = false,
  loadingMessage = '',
  errorMessage = 'An error occurred.',
  className,
  queries,
  promises,
  ignoreErrors = false,
  children,
  loading,
  error,
}: LoaderProps) {
  const overlayClass = cn(
    'z-30 flex w-full flex-col items-center justify-center bg-background/80 p-10',
    fullScreen && 'fixed left-0 top-0 h-full',
    className,
  );

  return (
    <WaitForQueries
      queries={queries}
      promises={promises}
      ignoreErrors={ignoreErrors}
      success={children}
      loading={
        <div className={overlayClass}>
          {loading ?? (
            <>
              <LoadingSpinner />
              {loadingMessage && <p className="mt-3">{loadingMessage}</p>}
            </>
          )}
        </div>
      }
      error={
        <div className={overlayClass}>{error ?? <p>{errorMessage}</p>}</div>
      }
    />
  );
}
