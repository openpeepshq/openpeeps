import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { variantClasses } from '@/lib/variants';
import type { ButtonAction, Variant } from '@/types';

export interface ButtonProps {
  loading?: boolean;
  variant?: Variant;
  className?: string;
  disabled?: boolean;
  action?: ButtonAction;
  title?: string;
  children?: React.ReactNode;
  /** Replaces `children` while loading (string convenience for `loadingContent`). */
  loadingText?: string;
  loadingContent?: React.ReactNode;
  /** While loading, render only the spinner (hide children / loading label). */
  spinnerOnlyOnLoading?: boolean;
  compact?: boolean;
  type?: 'button' | 'submit' | 'reset';
  /** When `action` is a string, open it in a new tab. */
  newTab?: boolean;
  /** Forward extra anchor / button props if needed. */
  id?: string;
  'aria-label'?: string;
  'data-testid'?: string;
}

/**
 * Translation of `@openpeeps/ui` Button.
 *
 * — When `action` is a string we render an `<a>`.
 * — When `action` is a function we render a `<button>` and toggle internal
 *   loading state for its duration (mirroring the Svelte version's bindable
 *   `loading` prop).
 */
export function Button({
  loading: loadingProp = false,
  variant,
  className: additionalClasses = '',
  disabled = false,
  action,
  title = '',
  children,
  loadingText,
  loadingContent,
  spinnerOnlyOnLoading = false,
  compact = false,
  type = 'button',
  newTab = false,
  ...rest
}: ButtonProps) {
  const [internalLoading, setInternalLoading] = React.useState(false);
  const loading = loadingProp || internalLoading;

  const buttonClasses = cn(
    variant && cn('op-btn', compact && 'op-btn-sm', variantClasses(variant)),
    additionalClasses,
  );

  const loadingLabel = loadingText ?? loadingContent ?? children;
  const showLabel = !loading || !spinnerOnlyOnLoading;

  const content = (
    <>
      {loading && (
        <Loader2 className={cn('h-4 w-4 animate-spin', showLabel && 'mr-2')} />
      )}
      {showLabel && (loading ? loadingLabel : children)}
    </>
  );

  if (typeof action === 'string') {
    return (
      <a
        title={title}
        href={action}
        target={newTab ? '_blank' : undefined}
        rel={newTab ? 'noopener noreferrer' : undefined}
        className={buttonClasses}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled || loading) {
            e.preventDefault();
          }
        }}
        {...rest}
      >
        {content}
      </a>
    );
  }

  const fn = action;

  return (
    <button
      type={type}
      title={title}
      disabled={disabled || loading}
      className={buttonClasses}
      onClick={async (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (typeof fn !== 'function') return;
        setInternalLoading(true);
        try {
          await fn();
        } finally {
          setInternalLoading(false);
        }
      }}
      {...rest}
    >
      {content}
    </button>
  );
}
