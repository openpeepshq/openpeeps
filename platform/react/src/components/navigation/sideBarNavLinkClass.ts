import { cn } from '@openpeepshq/react-ui';

/**
 * Sidebar nav link classes. A string so Radix Tooltip's Slot can merge
 * `className` — a NavLink callback gets stringified and the flex row is lost.
 * Active state uses `aria-current="page"`, which NavLink sets itself.
 */
export const sideBarNavLinkClass = cn(
  'flex items-center gap-2 rounded-md px-3 py-2 text-foreground/70 hover:bg-surface',
  'aria-[current=page]:font-bold aria-[current=page]:text-primary',
);
