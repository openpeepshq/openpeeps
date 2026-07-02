export interface UnreadPostIndicatorProps {
  show: boolean;
  className?: string;
}

/**
 * Subtle unread marker positioned in the host's left margin.
 * Absolutely positioned so visibility changes never shift layout.
 */
export const UnreadPostIndicator = ({
  show,
  className = 'left-1.5 top-6',
}: UnreadPostIndicatorProps) => (
  <span
    aria-hidden={!show}
    className={`pointer-events-none absolute size-1.5 rounded-full ${className} ${
      show ? 'bg-muted-foreground/45' : 'opacity-0'
    }`}
  />
);
