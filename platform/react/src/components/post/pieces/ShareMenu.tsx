import {
  Calendar,
  Copy,
  MessageCircle,
  Repeat2,
  Send,
  Share,
  Users,
} from 'lucide-react';
import type { PublicPost } from '@openpeepshq/common/types';
import { isPubliclyShareable } from '@openpeepshq/common/lib';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogHeader,
  DialogTitle,
  PopupMenu,
  PopupMenuButton,
  PopupSection,
  PopupSeparator,
  type PopupMenuProps,
} from '@openpeepshq/react-ui';
import { useState } from 'react';
import { useT } from '../../../i18n';
import {
  postPublicPath,
  useShareMenu,
} from '../../../hooks/posts/useShareMenu';
import { useCreateNewConversation } from '../../conversations/CreateNewConversationContext';
import { useToast } from '../../layout/ToastProvider';
import { ShareIntoGroupPicker } from './ShareIntoGroupPicker';
import { SendToConversationPicker } from './SendToConversationPicker';

export interface ShareMenuProps {
  post: PublicPost;
  menuButton?: React.ReactNode;
  /** `unstyled` matches neighboring text actions, such as the post footer. */
  variant?: PopupMenuProps['variant'] | 'unstyled';
  className?: string;
  text?: string;
}

const absolutePostUrl = (post: PublicPost) => {
  const path = postPublicPath(post);
  return typeof window !== 'undefined'
    ? `${window.location.origin}${path}`
    : path;
};

export const ShareMenu = ({
  post,
  menuButton,
  variant = 'outline',
  className,
  text,
}: ShareMenuProps) => {
  const t = useT();
  const { success, error: toastError } = useToast();
  const { openCreateConversation } = useCreateNewConversation();
  const postUrl = absolutePostUrl(post);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [conversationPickerOpen, setConversationPickerOpen] = useState(false);
  const {
    signedIn,
    isEvent,
    repost,
    shareIntoGroup,
    sendToConversation,
    eventIcsFile,
  } = useShareMenu(post, postUrl);
  // Feature-detect. Desktop browsers often have no Web Share API; copy stays
  // in the menu either way.
  const canSystemShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  // Repost/DM are valid for any post the viewer can see; handing the link to
  // the outside world only makes sense for publicly readable posts.
  const externallyShareable = isPubliclyShareable(post);
  // A signed-out viewer of a non-public, non-event post would get an empty
  // menu — hide the whole affordance instead (review round 5, S1).
  const menuAvailable = isEvent || externallyShareable || signedIn;

  const downloadEventIcs = () => {
    const file = eventIcsFile();
    if (!file) return;
    const blob = new Blob([file.content], {
      type: 'text/calendar;charset=utf-8',
    });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = file.filename;
    a.click();
    URL.revokeObjectURL(href);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      success(t('posts.shareMenu.linkCopied', { defaultValue: 'Link copied' }));
    } catch {
      toastError(
        t('posts.shareMenu.copyFailed', {
          defaultValue: "Couldn't copy the link",
        }),
      );
    }
  };

  const systemShare = async () => {
    try {
      await navigator.share({ url: postUrl });
    } catch (err) {
      // A user-dismissed sheet is not an error; anything else (e.g. a
      // permission denial in embeds) must not vanish silently.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      toastError(
        t('posts.shareMenu.shareFailed', {
          defaultValue: "Couldn't share the post",
        }),
      );
    }
  };

  if (!menuAvailable) return null;

  return (
    <>
      <PopupMenu
        menuButton={menuButton ?? <Share className="size-4" />}
        title={t('posts.shareMenu.title', { defaultValue: 'Share' })}
        variant={variant === 'unstyled' ? undefined : variant}
        className={className}
        text={text}
      >
        {signedIn ? (
          <>
            <PopupSection
              title={t('posts.shareMenu.shareOnCommunity', {
                defaultValue: 'Share on community',
              })}
            />
            <PopupMenuButton
              title={t('posts.shareMenu.repostToFeed', {
                defaultValue: 'Repost',
              })}
              text={t('posts.shareMenu.repostToFeed', {
                defaultValue: 'Repost',
              })}
              icon={Repeat2}
              action={repost}
            />
            <PopupMenuButton
              title={t('posts.shareMenu.sendInMessage', {
                defaultValue: 'Send in message',
              })}
              text={t('posts.shareMenu.sendInMessage', {
                defaultValue: 'Send in message',
              })}
              icon={Send}
              action={() => openCreateConversation({ message: postUrl })}
            />
            {/* Link-only share: available for any post the viewer can see,
                including private sources (the link is never a repost). */}
            <PopupMenuButton
              title={t('posts.shareMenu.shareIntoGroup', {
                defaultValue: 'Share into group…',
              })}
              text={t('posts.shareMenu.shareIntoGroup', {
                defaultValue: 'Share into group…',
              })}
              icon={Users}
              action={() => setGroupPickerOpen(true)}
            />
            <PopupMenuButton
              title={t('posts.shareMenu.sendToConversation', {
                defaultValue: 'Send to conversation…',
              })}
              text={t('posts.shareMenu.sendToConversation', {
                defaultValue: 'Send to conversation…',
              })}
              icon={MessageCircle}
              action={() => setConversationPickerOpen(true)}
            />
          </>
        ) : null}
        {signedIn && (isEvent || externallyShareable) ? (
          <>
            <PopupSeparator />
            <PopupSection
              title={t('posts.shareMenu.otherOptions', {
                defaultValue: 'Other options',
              })}
            />
          </>
        ) : null}
        {isEvent ? (
          <PopupMenuButton
            title={t('posts.shareMenu.downloadCalendarIcsTitle', {
              defaultValue: 'Download calendar file',
            })}
            text={t('posts.shareMenu.downloadCalendarIcs', {
              defaultValue: 'Add to calendar (.ics)',
            })}
            icon={Calendar}
            action={downloadEventIcs}
          />
        ) : null}
        {externallyShareable ? (
          <>
            {canSystemShare ? (
              <PopupMenuButton
                title={t('posts.shareMenu.systemShare', {
                  defaultValue: 'Share via…',
                })}
                text={t('posts.shareMenu.systemShare', {
                  defaultValue: 'Share via…',
                })}
                icon={Share}
                action={() => void systemShare()}
              />
            ) : null}
            <PopupMenuButton
              title={t('posts.shareMenu.copyLink', {
                defaultValue: 'Copy link',
              })}
              text={t('posts.shareMenu.copyLink', {
                defaultValue: 'Copy link',
              })}
              icon={Copy}
              action={
                canSystemShare
                  ? () => void copyLink()
                  : () => setCopyModalOpen(true)
              }
            />
          </>
        ) : null}
      </PopupMenu>
      <Dialog open={copyModalOpen} onOpenChange={setCopyModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('posts.shareMenu.copyLinkModalTitle', {
                defaultValue: 'Share post link',
              })}
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground break-all text-sm">{postUrl}</p>
          <DialogActions
            cancelLabel={t('common.actions.cancel', {
              defaultValue: 'Cancel',
            })}
            onCancel={() => setCopyModalOpen(false)}
            actionLabel={t('posts.shareMenu.copyLink', {
              defaultValue: 'Copy link',
            })}
            onAction={() => {
              void copyLink();
              setCopyModalOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
      {groupPickerOpen ? (
        <ShareIntoGroupPicker
          open
          onOpenChange={setGroupPickerOpen}
          onShare={shareIntoGroup}
        />
      ) : null}
      {conversationPickerOpen ? (
        <SendToConversationPicker
          open
          onOpenChange={setConversationPickerOpen}
          onSend={sendToConversation}
        />
      ) : null}
    </>
  );
};
