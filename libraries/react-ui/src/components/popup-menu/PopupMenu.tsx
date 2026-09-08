import * as React from 'react';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { buttonVariants, type StyledButtonVariant } from '@/lib/buttonVariants';
import type { IconType } from '@/types';
import { AccessibleButtonLabel } from '@/components/button/AccessibleButtonLabel';

export type PopupPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'right'
  | 'right-start'
  | 'right-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end';

export interface PopupMenuProps {
  variant?: StyledButtonVariant;
  className?: string;
  icon?: IconType;
  iconSize?: number;
  placement?: PopupPlacement;
  compact?: boolean;
  menuButton?: React.ReactNode;
  children?: React.ReactNode;
  title?: string;
  text?: string;
  width?: string;
}

/**
 * Translation of @openpeepshq/ui PopupMenu.
 *
 * Pieces it apart so consumers can put `<PopupMenuButton>` / `<PopupSection>` /
 * `<PopupSeparator>` children inside, just like the Svelte original.
 */
export function PopupMenu({
  variant,
  className,
  icon: Icon = MoreHorizontal,
  iconSize = 16,
  placement = 'bottom',
  compact = false,
  menuButton,
  children,
  title = 'Open menu',
  width,
  text,
}: PopupMenuProps) {
  const [side, align] = parsePlacement(placement);
  const actionName = title || text;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={title}
          aria-label={actionName || undefined}
          className={cn(
            'rounded-button inline-flex items-center justify-center gap-1',
            variant && buttonVariants({ variant }),
            className,
          )}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          {menuButton ?? (
            <span aria-hidden="true">
              <Icon size={iconSize} />
            </span>
          )}
          {text && <span className="text-sm">{text}</span>}
          {actionName && !text ? (
            <AccessibleButtonLabel>{actionName}</AccessibleButtonLabel>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={side}
        align={align}
        className={cn(
          'flex flex-col items-start p-2 text-left',
          compact ? 'w-16' : (width ?? 'w-52'),
        )}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function parsePlacement(
  placement: PopupPlacement,
): [
  side: 'top' | 'right' | 'bottom' | 'left',
  align: 'start' | 'center' | 'end',
] {
  const [side, anchor] = placement.split('-') as [
    'top' | 'right' | 'bottom' | 'left',
    'start' | 'end' | undefined,
  ];
  return [side, anchor ?? 'center'];
}
