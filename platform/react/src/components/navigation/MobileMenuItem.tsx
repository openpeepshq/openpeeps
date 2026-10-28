import { formatBadgeCount } from '@openpeepshq/common';
import { cn } from '@openpeepshq/react-ui';
import type { IconType } from '@openpeepshq/react-ui';
import { useRouter } from '../../contexts/router';
import { NavWithTooltip } from './NavWithTooltip';

export interface MobileMenuItemProps {
  action: string | (() => unknown);
  icon: IconType;
  title?: string;
  /** Describes the action on hover (icon-only mobile footer). */
  tooltip?: string;
  /** Unread/unseen count shown as a badge on the icon. */
  badge?: number;
}

export function MobileMenuItem({
  action,
  icon: Icon,
  title,
  tooltip,
  badge,
}: MobileMenuItemProps) {
  const router = useRouter();
  const active = typeof action === 'string' && router.pathname === action;
  const showBadge = (badge ?? 0) > 0;
  const hint = tooltip ?? title;

  const button = (
    <button
      type="button"
      title={hint}
      aria-label={title}
      className="relative"
      onClick={() => {
        if (typeof action === 'function') action();
        else router.navigate(action);
      }}
    >
      <span
        className={cn(
          'relative flex items-center gap-x-2',
          active ? 'text-primary font-bold' : 'text-foreground/70',
        )}
      >
        <span aria-hidden="true">
          <Icon className="h-5 w-5" />
        </span>
        {title ? <span className="sr-only">{title}</span> : null}
        {showBadge ? (
          <span
            className="bg-destructive text-destructive-foreground absolute -right-2.5 -top-2 flex size-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold leading-none"
            aria-label={`${badge} unread`}
          >
            {formatBadgeCount(badge ?? 0)}
          </span>
        ) : null}
      </span>
    </button>
  );

  if (!hint) return button;

  return (
    <NavWithTooltip label={hint} side="top">
      {button}
    </NavWithTooltip>
  );
}
