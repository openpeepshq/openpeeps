import { useMemo, useState } from 'react';
import { ThumbsUp } from 'lucide-react';
import type { PublicPost, ReactionData } from '@openpeepshq/common/types';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import { useAllowedReactions } from '../../../hooks/posts/useAllowedReactions';
import { postReactionStats } from '../helpers';
import { ReactionButton } from './ReactionButton';

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
 * Post reaction picker. Contract (shared with the RN `ReactionPicker`):
 *
 * - The emoji row is the community's allowed set from `useAllowedReactions`
 *   (the server-delivered `content.allowedReactions`, falling back to the
 *   curated `REACTION_TYPES` defaults). The component never hard-codes the set.
 * - Orphans — `myReactions` no longer in the allowed set — render after a
 *   divider, dimmed, and stay retractable: tapping an orphan retracts it. No
 *   divider/row renders when every `myReactions` is still allowed.
 * - `compact` mode shows one emoji (own first, else the community's first
 *   allowed) plus the count; the full row only opens on tap.
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
  const allowedReactions = useAllowedReactions();
  const [open, setOpen] = useState(false);
  const reactActive = !previewMode && canReact;

  // Reactions attached before being removed from the allowed set: not in the
  // rendered set, so the profile could not retract them without this row.
  const orphanedReactions = useMemo(
    () =>
      myReactions.filter((reaction) => !allowedReactions.includes(reaction)),
    [myReactions, allowedReactions],
  );

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
              ? // First of my own reactions, else the community's first
                // allowed emoji — a bare count reads as ambiguous.
                `${myReactions[0] ?? allowedReactions[0]} · ${postReactionStats(post)}`
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
        <div className="flex flex-wrap items-center gap-x-1">
          {allowedReactions.map((reaction) => (
            <ReactionButton
              key={reaction}
              reaction={reaction}
              active={myReactions.includes(reaction)}
              onClick={() => {
                void onToggleReaction(reaction);
                setOpen(false);
              }}
            />
          ))}
          {/* Orphans: attached before being removed from the set. Still
              retractable from here (design: orphans stay visible and
              retractable), dimmed to mark that they are no longer allowed. */}
          {orphanedReactions.length > 0 ? (
            <>
              <div
                className="bg-border mx-1 h-8 w-px shrink-0 self-center"
                aria-hidden="true"
              />
              {orphanedReactions.map((reaction) => (
                <ReactionButton
                  key={reaction}
                  reaction={reaction}
                  orphan
                  active
                  title={t('posts.actions.orphanedReaction', {
                    defaultValue: 'No longer allowed — tap to remove',
                  })}
                  onClick={() => {
                    void onToggleReaction(reaction);
                    setOpen(false);
                  }}
                />
              ))}
            </>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
