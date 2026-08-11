import * as React from 'react';
import { ChevronUp } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { buttonVariants, type StyledButtonVariant } from '@/lib/buttonVariants';
import type { ButtonAction, IconType } from '@/types';
import type { PopupPlacement } from './PopupMenu';

export interface SplitButtonMenuProps {
  /** Variant applied to the primary (circular) button. */
  variant?: StyledButtonVariant;
  /** Click handler for the primary button (separate from opening the menu). */
  action?: ButtonAction;
  title?: string;
  /** Primary button content (typically an icon). */
  children?: React.ReactNode;
  /** Menu items (e.g. `<PopupMenuButton>`), shown when the chevron is clicked. */
  menuChildren?: React.ReactNode;
  menuTitle?: string;
  placement?: PopupPlacement;
  /** Icon for the attached menu trigger. Defaults to a chevron. */
  chevronIcon?: IconType;
  chevronSize?: number;
  /** Extra classes for the outer pill. */
  className?: string;
  /** Width of the dropdown content. */
  menuWidth?: string;
  disabled?: boolean;
}

/**
 * A circular primary button with an attached semicircular menu trigger,
 * mirroring the Svelte `DeviceSelectorAndSwitch` mic / camera controls. The
 * primary button runs `action`; the semicircle opens a popup menu of
 * `menuChildren`.
 */
export function SplitButtonMenu({
  variant,
  action,
  title = '',
  children,
  menuChildren,
  menuTitle = 'Change',
  placement = 'top-start',
  chevronIcon: ChevronIcon = ChevronUp,
  chevronSize = 20,
  className,
  menuWidth,
  disabled = false,
}: SplitButtonMenuProps) {
  const [side, align] = parsePlacement(placement);

  const runAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (disabled) return;
    if (typeof action === 'function') void action();
  };

  return (
    <div className={cn('flex items-center', className)}>
      <button
        type="button"
        title={title}
        disabled={disabled}
        onClick={runAction}
        className={cn(
          buttonVariants({ variant: variant ?? 'secondary', size: 'icon' }),
          'rounded-button size-10 transition-opacity',
        )}
      >
        {children}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title={menuTitle}
            className="hover:bg-surface rounded-r-button text-foreground -ml-1 flex h-10 items-center justify-center pl-0.5 pr-1.5 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ChevronIcon size={chevronSize} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={side}
          align={align}
          className={cn(
            'flex max-h-[60vh] flex-col items-start overflow-y-auto p-2 text-left',
            menuWidth ?? 'w-56',
          )}
        >
          {menuChildren}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
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
