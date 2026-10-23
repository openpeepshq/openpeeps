import { Calendar, Copy, Repeat2, Send, Share } from 'lucide-react';
import type { PublicPost } from '@openpeepshq/common/types';
import {
  PopupMenu,
  PopupMenuButton,
  PopupSection,
  PopupSeparator,
  type PopupMenuProps,
} from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import {
  postPublicPath,
  useShareMenu,
} from '../../../hooks/posts/useShareMenu';
import { useCreateNewConversation } from '../../conversations/CreateNewConversationContext';
import { useToast } from '../../layout/ToastProvider';

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

export function ShareMenu({
  post,
  menuButton,
  variant = 'outline',
  className,
  text,
}: ShareMenuProps) {
  const t = useT();
  const { success, error: toastError } = useToast();
  const { openCreateConversation } = useCreateNewConversation();
  const postUrl = absolutePostUrl(post);
  const { signedIn, isEvent, repost, eventIcsFile } = useShareMenu(
    post,
    postUrl,
  );
  // Feature-detect. Desktop browsers often have no Web Share API; copy stays
  // in the menu either way.
  const canSystemShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

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
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  };

  return (
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
            text={t('posts.shareMenu.repostToFeed', { defaultValue: 'Repost' })}
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
        title={t('posts.shareMenu.copyLink', { defaultValue: 'Copy link' })}
        text={t('posts.shareMenu.copyLink', { defaultValue: 'Copy link' })}
        icon={Copy}
        action={() => void copyLink()}
      />
    </PopupMenu>
  );
}
