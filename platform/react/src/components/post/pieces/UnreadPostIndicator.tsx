import { cn } from '@openpeepshq/react-ui';

export interface UnreadPostIndicatorProps {
  show: boolean;
  className?: string;
  /** `corner` is a top-left fold on feed cards; `dot` is the in-flow / margin mark. */
  variant?: 'dot' | 'corner';
}

/**
 * Unread marker. `dot` is a small circle (conversations, thread rows).
 * `corner` is a surface-colored triangle in the host's top-left corner.
 */
export const UnreadPostIndicator = ({
  show,
  className,
  variant = 'dot',
}: UnreadPostIndicatorProps) =>
  variant === 'corner' ? (
    <span
      aria-hidden={!show}
      className={cn(
        'pointer-events-none absolute left-0 top-0 h-0 w-0 border-r-[12px] border-t-[12px] border-solid border-r-transparent',
        show ? 'border-t-surface' : 'opacity-0',
        className,
      )}
    />
  ) : (
    <span
      aria-hidden={!show}
      className={cn(
        'pointer-events-none absolute size-1.5 rounded-full',
        show ? 'bg-muted-foreground/45' : 'opacity-0',
        className ?? 'left-1.5 top-6',
      )}
    />
  );
