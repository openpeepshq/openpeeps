import { cn } from '@openpeepshq/react-ui';

export interface ReactionButtonProps {
  reaction: string;
  title?: string;
  /** Highlight the emoji the profile has already attached. */
  active?: boolean;
  /** An emoji no longer in the allowed set but still attached — dim it. */
  orphan?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

/**
 * A single emoji reaction control, shared by the post reaction picker and the
 * jam reaction menu so hover/focus/active styling lives in one place instead
 * of drifting across copies.
 */
export function ReactionButton({
  reaction,
  title,
  active = false,
  orphan = false,
  disabled = false,
  onClick,
}: ReactionButtonProps) {
  return (
    <button
      type="button"
      title={title ?? reaction}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'shrink-0 rounded-md p-2 text-lg leading-none hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
        active && 'bg-border',
        orphan && 'opacity-60',
      )}
    >
      {reaction}
    </button>
  );
}
