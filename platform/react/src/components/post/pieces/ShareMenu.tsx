import { Calendar, Copy, Repeat2, Send, Share } from 'lucide-react';
import type { PublicPost } from '@openpeepshq/common/types';
import {
  PopupMenu,
  PopupMenuButton,
  PopupSection,
  PopupSeparator,
} from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import { useShareMenu } from '../../../hooks/posts/useShareMenu';
import { useCreateNewConversation } from '../../conversations/CreateNewConversationContext';

export interface ShareMenuProps {
  post: PublicPost;
  menuButton?: React.ReactNode;
}

export function ShareMenu({ post, menuButton }: ShareMenuProps) {
  const t = useT();
  const { openCreateConversation } = useCreateNewConversation();

  const postUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/posts/${post.id}`
      : `/posts/${post.id}`;
  const { signedIn, isEvent, repost, eventIcsFile } = useShareMenu(
    post,
    postUrl,
  );

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

  return (
    <PopupMenu
      menuButton={menuButton ?? <Share className="size-4" />}
      title={t('posts.shareMenu.title', { defaultValue: 'Share' })}
      variant="outline"
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
      <PopupMenuButton
        title={t('posts.shareMenu.copyLink', { defaultValue: 'Copy link' })}
        text={t('posts.shareMenu.copyLink', { defaultValue: 'Copy link' })}
        icon={Copy}
        action={() => void navigator.clipboard.writeText(postUrl)}
      />
    </PopupMenu>
  );
}
