import * as React from 'react';
import { Loader } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ButtonAction, IconType } from '@/types';
import { AccessibleButtonLabel } from '@/components/button/AccessibleButtonLabel';

export interface PopupMenuButtonProps {
  action: ButtonAction;
  text?: string;
  loadingText?: string;
  icon?: IconType;
  danger?: boolean;
  compact?: boolean;
  title?: string;
  textSlot?: React.ReactNode;
}

const baseClass =
  'flex w-full items-center gap-x-2 rounded-button p-2 text-left transition-colors hover:bg-surface disabled:opacity-60';

export function PopupMenuButton({
  action,
  text = '',
  loadingText = '',
  icon: Icon,
  danger = false,
  compact = false,
  title = '',
  textSlot,
}: PopupMenuButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const actionName = title || text;

  const content = isLoading ? (
    <>
      <Loader size={16} className="shrink-0" aria-hidden="true" />
      {!compact && <span>{loadingText || text}</span>}
      {compact && actionName ? (
        <AccessibleButtonLabel>{actionName}</AccessibleButtonLabel>
      ) : null}
    </>
  ) : (
    <>
      {Icon && (
        <span aria-hidden="true">
          <Icon size={16} className="shrink-0" />
        </span>
      )}
      {!compact && (textSlot ?? <span className="text-left">{text}</span>)}
      {compact && actionName ? (
        <AccessibleButtonLabel>{actionName}</AccessibleButtonLabel>
      ) : null}
    </>
  );

  if (typeof action === 'string') {
    return (
      <a
        title={title || undefined}
        aria-label={compact ? actionName || undefined : undefined}
        href={action}
        className={cn(
          baseClass,
          danger && 'text-error',
          compact && 'justify-center',
        )}
        onClick={(e) => {
          e.stopPropagation();
          setIsLoading(true);
        }}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      title={title || undefined}
      aria-label={compact ? actionName || undefined : undefined}
      disabled={isLoading}
      className={cn(
        baseClass,
        danger && 'text-error',
        compact && 'justify-center',
      )}
      onClick={async (e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsLoading(true);
        try {
          await action();
        } finally {
          setIsLoading(false);
        }
      }}
    >
      {content}
    </button>
  );
}
