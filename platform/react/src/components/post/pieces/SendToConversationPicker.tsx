import type { PublicPost } from '@openpeepshq/common/types';
import { truncateText } from '@openpeepshq/common/lib';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  LoadingSpinner,
} from '@openpeepshq/react-ui';
import { useMemo, useState } from 'react';
import { useT } from '../../../i18n';
import { conversationTitle } from '../../../hooks/conversations/conversationTitle';
import { useCurrentProfile } from '../../layout/IdentityContext';
import { useToast } from '../../layout/ToastProvider';
import { useOpenpeeps } from '../../../contexts/openpeeps';

export interface SendToConversationPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once the message is posted into the chosen conversation. */
  onSend: (conversation: PublicPost[]) => Promise<void>;
}

/**
 * Dialog that lists the current profile's direct-message conversations and
 * sends a post into the chosen one as a link note (never a repost).
 */
export const SendToConversationPicker = ({
  open,
  onOpenChange,
  onSend,
}: SendToConversationPickerProps) => {
  const t = useT();
  const me = useCurrentProfile();
  const { success, error: toastError } = useToast();
  const { openpeepsApi } = useOpenpeeps();
  const conversationsQuery = openpeepsApi.useConversations();
  const [sending, setSending] = useState<string | null>(null);

  const conversations = useMemo(
    () => (conversationsQuery.data ?? []).filter((c) => c.length > 0),
    [conversationsQuery.data],
  );

  // The last post's audience is the current view; a leaver (or a
  // note-to-self follow-up) can leave it with no other members, so fall back
  // to the root post's participants before labeling it "You" (shared helper).
  const conversationTitleFor = (conversation: PublicPost[]) =>
    conversationTitle(conversation, t, me?.id, { fallbackToRoot: true });

  const send = async (conversation: PublicPost[]) => {
    const root = conversation[0];
    if (!root || sending) return;
    setSending(root.id);
    try {
      await onSend(conversation);
      success(
        t('posts.shareMenu.sentToConversation', {
          defaultValue: 'Sent to {{name}}',
          name: truncateText(conversationTitleFor(conversation), 30),
        }),
      );
      onOpenChange(false);
    } catch {
      toastError(
        t('posts.shareMenu.shareFailed', {
          defaultValue: "Couldn't share the post",
        }),
      );
    } finally {
      setSending(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[70vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('posts.shareMenu.sendToConversationPickerTitle', {
              defaultValue: 'Send to conversation',
            })}
          </DialogTitle>
        </DialogHeader>
        {conversationsQuery.isLoading ? (
          <div className="flex justify-center p-4">
            <LoadingSpinner />
          </div>
        ) : conversations.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t('posts.shareMenu.noConversations', {
              defaultValue: "You don't have any conversations yet",
            })}
          </p>
        ) : (
          <ul className="flex flex-col gap-y-1">
            {conversations.map((conversation) => {
              const root = conversation[0];
              const last = conversation[conversation.length - 1];
              if (!root || !last) return null;
              const isMine =
                last.data?.type === 'note' && last.profile?.id === me?.id;
              return (
                <li key={root.id}>
                  <button
                    type="button"
                    disabled={sending !== null}
                    className="hover:bg-surface flex w-full items-center gap-x-2 rounded-button p-2 text-left transition-colors disabled:opacity-60"
                    onClick={() => void send(conversation)}
                  >
                    {sending === root.id ? (
                      <LoadingSpinner className="size-4" />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {truncateText(conversationTitleFor(conversation), 40)}
                      </span>
                      {last.data?.type === 'note' ? (
                        <span className="text-muted-foreground block truncate text-xs">
                          {isMine
                            ? t('common.you', { defaultValue: 'You' })
                            : `@${last.profile?.handle ?? ''}`}
                          {': '}
                          {truncateText(last.data.content, 40)}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
};
