import * as React from 'react';
import { Loader } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ButtonAction, IconType } from '@/types';

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
  'flex w-full items-center gap-x-2 rounded p-2 text-left transition-colors hover:bg-muted disabled:opacity-60';

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

  const content = isLoading ? (
    <>
      <Loader size={16} className="shrink-0" />
      {!compact && <span>{loadingText || text}</span>}
    </>
  ) : (
    <>
      {Icon && <Icon size={16} className="shrink-0" />}
      {!compact && (textSlot ?? <span className="text-left">{text}</span>)}
    </>
  );

  if (typeof action === 'string') {
    return (
      <a
        title={title}
        href={action}
        className={cn(baseClass, danger && 'text-error', compact && 'justify-center')}
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
      title={title}
      disabled={isLoading}
      className={cn(baseClass, danger && 'text-error', compact && 'justify-center')}
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
