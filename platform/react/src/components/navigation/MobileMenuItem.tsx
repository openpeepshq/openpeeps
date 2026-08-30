import { formatBadgeCount } from '@openpeepshq/common';
import { cn } from '@openpeepshq/react-ui';
import type { IconType } from '@openpeepshq/react-ui';
import { useRouter } from '../../contexts/router';

export interface MobileMenuItemProps {
  action: string | (() => unknown);
  icon: IconType;
  title?: string;
  /** Unread/unseen count shown as a badge on the icon. */
  badge?: number;
}

export function MobileMenuItem({
  action,
  icon: Icon,
  title,
  badge,
}: MobileMenuItemProps) {
  const router = useRouter();
  const active = typeof action === 'string' && router.pathname === action;
  const showBadge = (badge ?? 0) > 0;

  return (
    <button
      type="button"
      title={title}
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
        <Icon className="h-5 w-5" />
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
}
