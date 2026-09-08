import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  buttonVariants,
  type ButtonSize,
  type ButtonVariant,
} from '@/lib/buttonVariants';
import type { ButtonAction } from '@/types';
import {
  AccessibleButtonLabel,
  accessibleNameFrom,
  childrenIncludeName,
} from './AccessibleButtonLabel';

export interface ButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'children' | 'disabled'
  > {
  loading?: boolean;
  /** Figma variants, or `unstyled` to keep only `className`. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  action?: ButtonAction;
  children?: React.ReactNode;
  /** Replaces `children` while loading (string convenience for `loadingContent`). */
  loadingText?: string;
  loadingContent?: React.ReactNode;
  /** While loading, render only the spinner (hide children / loading label). */
  spinnerOnlyOnLoading?: boolean;
  /** Maps to size `sm`. Prefer `size="sm"`. */
  compact?: boolean;
  /** When `action` is a string, open it in a new tab. */
  newTab?: boolean;
}

/**
 * Primary Button — Figma / AllPeep UI 2026 variants via `buttonVariants`.
 *
 * — When `action` is a string we render an `<a>`.
 * — When `action` is a function we render a `<button>` and toggle internal
 *   loading state for its duration.
 * — Icon-only controls must pass `title` or `aria-label` (the action word)
 *   so Narrator and Read Mode both get a name.
 */
export const Button = React.forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ButtonProps
>(
  (
    {
      loading: loadingProp = false,
      variant = 'default',
      size,
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
      onClick,
      'aria-label': ariaLabelProp,
      ...rest
    },
    ref,
  ) => {
    const [internalLoading, setInternalLoading] = React.useState(false);
    const loading = loadingProp || internalLoading;
    const accessibleName = accessibleNameFrom(ariaLabelProp, title);

    const resolvedSize: ButtonSize = size ?? (compact ? 'sm' : 'default');

    const buttonClasses =
      variant === 'unstyled'
        ? additionalClasses
        : cn(
            buttonVariants({
              variant,
              size: resolvedSize,
            }),
            additionalClasses,
          );

    const loadingLabel = loadingText ?? loadingContent ?? children;
    const showLabel = !loading || !spinnerOnlyOnLoading;
    const labeledContent = showLabel
      ? loading
        ? loadingLabel
        : children
      : null;
    const readModeName =
      accessibleName && !childrenIncludeName(labeledContent, accessibleName)
        ? accessibleName
        : undefined;

    const content = (
      <>
        {loading && (
          <Loader2
            className={cn('h-4 w-4 animate-spin', showLabel && 'mr-2')}
            aria-hidden="true"
          />
        )}
        {labeledContent}
        {readModeName ? (
          <AccessibleButtonLabel>{readModeName}</AccessibleButtonLabel>
        ) : null}
      </>
    );

    if (typeof action === 'string') {
      const anchorProps =
        rest as unknown as React.AnchorHTMLAttributes<HTMLAnchorElement>;
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          title={title || undefined}
          aria-label={accessibleName}
          href={action}
          target={newTab ? '_blank' : undefined}
          rel={newTab ? 'noopener noreferrer' : undefined}
          className={buttonClasses}
          onClick={(event) => {
            onClick?.(event as unknown as React.MouseEvent<HTMLButtonElement>);
            if (event.defaultPrevented) return;
            event.stopPropagation();
            if (disabled || loading) event.preventDefault();
          }}
          {...anchorProps}
        >
          {content}
        </a>
      );
    }

    const fn = action;

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={type}
        title={title || undefined}
        aria-label={accessibleName}
        disabled={disabled || loading}
        className={buttonClasses}
        onClick={async (event) => {
          onClick?.(event);
          if (event.defaultPrevented || typeof fn !== 'function') return;
          event.stopPropagation();
          event.preventDefault();
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
  },
);
Button.displayName = 'Button';
