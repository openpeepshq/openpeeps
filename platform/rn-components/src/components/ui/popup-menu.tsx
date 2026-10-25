import * as React from 'react';
import { Pressable } from 'react-native';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { cn } from '../../lib/utils';
import { EllipsisIcon } from '../icons';

export type PopupPlacement = 'top' | 'bottom';

export interface PopupMenuProps {
  className?: string;
  iconSize?: number;
  compact?: boolean;
  menuButton?: React.ReactNode;
  children?: React.ReactNode;
  title?: string;
  triggerIcon?: React.ReactNode;
}

const DEFAULT_ICON_SIZE = 22;

/**
 * Popover-style menu that wraps the RN DropdownMenu to provide the same API
 * surface as @openpeepshq/react-ui's PopupMenu.
 */
export const PopupMenu = ({
  className: _className,
  iconSize = DEFAULT_ICON_SIZE,
  compact = false,
  menuButton,
  children,
  title = 'Open menu',
  triggerIcon,
}: PopupMenuProps) => {
  const actionName = title;
  const [_open, setOpen] = React.useState(false);

  const TriggerIcon = () => {
    if (triggerIcon) return <>{triggerIcon}</>;
    return <EllipsisIcon className="text-foreground" size={iconSize} />;
  };

  const triggerProps = {
    accessibilityRole: 'button' as const,
    accessibilityLabel: actionName || 'Open menu',
  };

  return (
    <DropdownMenu onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {menuButton ?? (
          <Pressable
            {...triggerProps}
            className={cn(
              'rounded-button inline-flex items-center justify-center',
              compact ? 'h-8 w-8' : 'h-10 w-10'
            )}
          >
            <TriggerIcon />
          </Pressable>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="end"
        className={cn('flex flex-col p-2', compact ? 'w-16' : 'w-52')}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
