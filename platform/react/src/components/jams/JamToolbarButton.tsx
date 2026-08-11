import type { ReactNode } from 'react';
import { ChevronUp } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  cn,
} from '@openpeepshq/react-ui';

export type JamToolbarTone = 'default' | 'active' | 'danger';

const toneClasses: Record<JamToolbarTone, string> = {
  default: 'bg-surface text-foreground hover:bg-surface-2',
  active: 'bg-primary/15 text-primary hover:bg-primary/25',
  danger: 'bg-destructive text-destructive-foreground hover:opacity-90',
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
  menuWidth?: string;
}

/**
 * Circular control used across the jam toolbars, optionally paired with a
 * drop-up menu (mic / camera / speaker device pickers). Sits on the surface
 * colour so it keeps the default foreground in both light and dark themes.
 */
export const JamToolbarButton = ({
  title,
  tone = 'default',
  disabled = false,
  className,
  action,
  children,
  menuChildren,
  menuTitle,
  menuWidth,
}: JamToolbarButtonProps) => {
  const button = (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={action}
      className={cn(
        'relative flex size-10 shrink-0 items-center justify-center rounded-full p-2 transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
        toneClasses[tone],
        !menuChildren && className,
      )}
    >
      {children}
    </button>
  );

  if (!menuChildren) return button;

  return (
    <div
      className={cn(
        'bg-surface flex items-center rounded-full backdrop-blur',
        className,
      )}
    >
      {button}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title={menuTitle}
            className="text-foreground hover:bg-surface-2 -ml-1 flex h-10 items-center justify-center rounded-r-full pl-0.5 pr-1.5 transition-colors"
          >
            <ChevronUp size={20} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
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
};
