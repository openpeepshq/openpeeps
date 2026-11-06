import { useState } from 'react';
import { ThumbsUp } from 'lucide-react';
import type { PublicPost, ReactionData } from '@openpeepshq/common/types';
import { REACTION_TYPES } from '@openpeepshq/common';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import { postReactionStats } from '../helpers';

export interface ReactionPickerProps {
  post: PublicPost;
  compact?: boolean;
  previewMode?: boolean;
  /** Reactions the current profile already attached to this post. */
  myReactions: string[];
  canReact: boolean;
  iReacted: boolean;
  onToggleReaction: (
    reaction: ReactionData['reaction'],
  ) => void | Promise<void>;
}

/**
 * Post reaction selection: the thumbs-up button opens a row of the curated
 * reactions, and picking one toggles that reaction (mirrors the jam reaction
 * menu). Replaces the single hard-coded 👍 toggle.
 */
export function ReactionPicker({
  post,
  compact = false,
  previewMode = false,
  myReactions,
  canReact,
  iReacted,
  onToggleReaction,
}: ReactionPickerProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const reactActive = !previewMode && canReact;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="unstyled"
          className={cn(
            'rounded-button flex gap-2 p-2 text-sm',
            reactActive
              ? 'cursor-pointer hover:bg-surface'
              : 'pointer-events-none cursor-default text-muted-foreground disabled:text-muted-foreground',
            iReacted && reactActive && 'text-primary',
          )}
          title={t('posts.actions.react', { defaultValue: 'React' })}
          disabled={!reactActive}
        >
          <ThumbsUp className="h-4 w-4" />
          {compact
            ? post.reactions?.length
              ? ` · ${postReactionStats(post)}`
              : null
            : t('posts.footer.like', { defaultValue: 'Like' })}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-auto p-2"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex">
          {REACTION_TYPES.map((reaction) => (
            <button
              key={reaction}
              type="button"
              onClick={() => {
                void onToggleReaction(reaction);
                setOpen(false);
              }}
              className={cn(
                'hover:bg-surface rounded-md p-1.5 text-lg leading-none',
                myReactions.includes(reaction) && 'bg-border',
              )}
            >
              {reaction}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
