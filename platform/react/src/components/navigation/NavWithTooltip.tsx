import type { ReactElement } from 'react';
import {
  TooltipContent,
  TooltipRoot,
  TooltipTrigger,
} from '@openpeepshq/react-ui';

export type NavTooltipSide = 'top' | 'bottom' | 'left' | 'right';

export type NavWithTooltipProps = {
  label: string;
  side?: NavTooltipSide;
  children: ReactElement;
};

/** Hover tooltip for a single nav control; wrap the list in `TooltipProvider`. */
export const NavWithTooltip = ({
  label,
  side = 'right',
  children,
}: NavWithTooltipProps) => (
  <TooltipRoot>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent side={side}>{label}</TooltipContent>
  </TooltipRoot>
);
