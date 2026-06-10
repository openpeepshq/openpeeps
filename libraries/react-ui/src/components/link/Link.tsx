import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ButtonAction } from '@/types';

export interface LinkProps {
  loading?: boolean;
  className?: string;
  disabled?: boolean;
  action?: ButtonAction;
  title?: string;
  mutations?: { isPending: boolean }[];
  newTab?: boolean;
  children?: React.ReactNode;
}

export function Link({
  loading: loadingProp = false,
  className: additionalClasses = '',
  disabled = false,
  action,
  mutations = [],
  title = '',
  newTab = false,
  children,
}: LinkProps) {
  const [internalLoading, setInternalLoading] = React.useState(false);
  const loading =
    loadingProp || internalLoading || mutations.some((m) => m.isPending);

  const baseClass = cn('op-anchor', additionalClasses);
  const inner = (
    <>
      {loading && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
      {children}
    </>
  );

  if (typeof action === 'string') {
    return (
      <a
        title={title}
        href={action}
        target={newTab ? '_blank' : undefined}
        rel={newTab ? 'noopener noreferrer' : undefined}
        className={baseClass}
        onClick={(e) => {
          if (loading || disabled) e.preventDefault();
        }}
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      type="button"
      title={title}
      disabled={loading || disabled}
      className={baseClass}
      onClick={async (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!action) return;
        setInternalLoading(true);
        try {
          await action();
        } finally {
          setInternalLoading(false);
        }
      }}
    >
      {inner}
    </button>
  );
}
