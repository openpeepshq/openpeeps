import React, { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronUpIcon } from '~/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { cn } from '~/lib/utils';

export type JamToolbarTone = 'default' | 'active' | 'danger';

const toneClasses: Record<JamToolbarTone, string> = {
  default: 'bg-card',
  active: 'bg-primary/15',
  danger: 'bg-destructive',
};

export const toneIconClass: Record<JamToolbarTone, string> = {
  default: 'text-foreground',
  active: 'text-primary',
  danger: 'text-destructive-foreground',
};

export interface JamToolbarButtonProps {
  title: string;
  /** `active` tints the control, `danger` marks a muted / destructive state. */
  tone?: JamToolbarTone;
  disabled?: boolean;
  className?: string;
  action: () => void;
  children?: ReactNode;
  /** When set, a chevron attached to the button opens these items as a drop-up. */
  menuChildren?: ReactNode;
  menuTitle?: string;
}

/** Circular control used across the jam toolbars, optionally with a drop-up menu. */
export const JamToolbarButton = ({
  title,
  tone = 'default',
  disabled = false,
  className,
  action,
  children,
  menuChildren,
  menuTitle,
}: JamToolbarButtonProps) => {
  const button = (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      disabled={disabled}
      onPress={action}
      className={cn(
        'relative size-10 shrink-0 items-center justify-center rounded-full p-2',
        toneClasses[tone],
        disabled && 'opacity-50',
        !menuChildren && className
      )}
    >
      {children}
    </Pressable>
  );

  if (!menuChildren) return button;

  return (
    <View
      className={cn('flex-row items-center rounded-full bg-card', className)}
    >
      {button}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Pressable
            accessibilityLabel={menuTitle}
            accessibilityRole="button"
            className="-ml-1 h-10 items-center justify-center rounded-r-full pl-0.5 pr-1.5"
          >
            <ChevronUpIcon size={20} className="text-foreground" />
          </Pressable>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-56 p-2">
          {menuChildren}
        </DropdownMenuContent>
      </DropdownMenu>
    </View>
  );
};
