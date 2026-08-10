import type { ReactNode } from 'react';
import { EyeOff } from 'lucide-react';
import type { PartialQueryObserverResult } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';

export interface AccessDeniedProps {
  queries: PartialQueryObserverResult<unknown>[];
  message?: string;
  errorMessage?: string;
  /** Shown for non–access-denied failures (e.g. not found). */
  fallbackError?: ReactNode;
}

type QueryWithError = PartialQueryObserverResult<unknown> & {
  isError?: boolean;
  error?: unknown;
};

const isAccessDeniedError = (
  queries: PartialQueryObserverResult<unknown>[],
): boolean => {
  const failed = queries.find(
    (q) => (q as QueryWithError).isError || (!q.isPending && !q.isSuccess),
  ) as QueryWithError | undefined;
  if (!failed?.error || typeof failed.error !== 'object') return false;
  const err = failed.error as { status?: number; statusCode?: number };
  const status = err.status ?? err.statusCode;
  return status === 401 || status === 403;
};

/**
 * Mirrors Svelte `AccessDenied.svelte`: distinguish capability failures from
 * other query errors and render the appropriate UI.
 */
export function AccessDenied({
  queries,
  message,
  errorMessage = 'An error occurred.',
  fallbackError,
}: AccessDeniedProps) {
  const t = useT();
  const deniedMessage =
    message ??
    t('visibility.accessDenied', {
      defaultValue: 'You do not have access to this content.',
    });

  if (isAccessDeniedError(queries)) {
    return (
      <span className="flex flex-col items-center justify-center gap-2 p-6">
        <EyeOff className="size-12" />
        <p>{deniedMessage}</p>
      </span>
    );
  }

  if (fallbackError) return <>{fallbackError}</>;

  return <p className="p-6 text-center">{errorMessage}</p>;
}
