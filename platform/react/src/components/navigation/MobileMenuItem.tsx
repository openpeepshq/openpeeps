import { cn } from '@openpeepshq/react-ui';
import type { IconType } from '@openpeepshq/react-ui';
import { useRouter } from '../../contexts/router';

export interface MobileMenuItemProps {
  action: string | (() => unknown);
  icon: IconType;
  title?: string;
}

export function MobileMenuItem({
  action,
  icon: Icon,
  title,
}: MobileMenuItemProps) {
  const router = useRouter();
  const active = typeof action === 'string' && router.pathname === action;

  return (
    <button
      type="button"
      title={title}
      onClick={() => {
        if (typeof action === 'function') action();
        else router.navigate(action);
      }}
    >
      <span
        className={cn(
          'flex items-center gap-x-2',
          active ? 'text-primary font-bold' : 'text-foreground/70',
        )}
      >
        <Icon className="mr-1 h-5 w-5" />
      </span>
    </button>
  );
}
