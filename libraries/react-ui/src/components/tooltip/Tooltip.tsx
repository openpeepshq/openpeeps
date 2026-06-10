import * as React from 'react';
import {
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  position?: TooltipPosition;
  /** The visible content of the tooltip. */
  children: React.ReactNode;
  /** The trigger this tooltip is anchored to. If omitted, you must wrap this
   *  component yourself with a TooltipProvider/Trigger. */
  trigger?: React.ReactNode;
  delayDuration?: number;
}

/**
 * Replacement for the original Skeleton-style `Tooltip`. Uses Radix internally
 * for a robust accessible implementation while keeping the same `position`
 * surface as the Svelte original.
 *
 * Two usage modes:
 *   <Tooltip trigger={<Button />}>Help text</Tooltip>
 *   // or compose manually with the lower-level primitives in `ui/tooltip`.
 */
export function Tooltip({
  position = 'top',
  children,
  trigger,
  delayDuration = 200,
}: TooltipProps) {
  if (!trigger) {
    return (
      <span className="absolute z-50 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background">
        {children}
      </span>
    );
  }
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <TooltipRoot>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side={position}>{children}</TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  );
}
