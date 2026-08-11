import { cn } from '@openpeepshq/react-ui';

/** Active/inactive classes for sidebar nav links (parity with Svelte `MenuItem.svelte`). */
export const sideBarNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2 rounded-md px-3 py-2 hover:bg-surface',
    isActive ? 'text-primary font-bold' : 'text-foreground/70',
  );
