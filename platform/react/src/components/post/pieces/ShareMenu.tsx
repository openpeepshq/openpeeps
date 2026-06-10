import { Calendar, Copy, Repeat2, Send, Share } from 'lucide-react';
import type { Event, PublicPost } from '@openpeeps/common/types';
import { buildEventIcs } from '@openpeeps/common/lib';
import {
  PopupMenu,
  PopupMenuButton,
  PopupSection,
  PopupSeparator,
} from '@openpeeps/react-ui';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useT } from '../../../i18n';
import { useCurrentProfile } from '../../layout/IdentityContext';
import { useCreateNewConversation } from '../../conversations/CreateNewConversationContext';

export interface ShareMenuProps {
  post: PublicPost;
  menuButton?: React.ReactNode;
}

export function ShareMenu({ post, menuButton }: ShareMenuProps) {
  const t = useT();
  const me = useCurrentProfile();
  const { openCreateConversation } = useCreateNewConversation();
  const { openpeepsApi } = useOpenpeeps();
  const repostPost = openpeepsApi.repostPostAction({ id: post.id });

  const postUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/posts/${post.id}`
      : `/posts/${post.id}`;

  const downloadEventIcs = () => {
    const ics = buildEventIcs(post, { postUrl });
    if (!ics) return;
    const event = post.data as Event;
    const raw = event.name?.trim() || `event-${post.id}`;
    const safe = raw.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 100);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `${safe}.ics`;
    a.click();
    URL.revokeObjectURL(href);
  };

  return (
    <PopupMenu
      menuButton={menuButton ?? <Share className="size-4" />}
      title={t('posts.shareMenu.title', { defaultValue: 'Share' })}
      variant="variant-ringed-primary"
    >
      {me ? (
        <>
          <PopupSection
            title={t('posts.shareMenu.shareOnCommunity', {
              defaultValue: 'Share on community',
            })}
          />
          <PopupMenuButton
            title={t('posts.shareMenu.repostToFeed', { defaultValue: 'Repost' })}
            text={t('posts.shareMenu.repostToFeed', { defaultValue: 'Repost' })}
            icon={Repeat2}
            action={() => repostPost(undefined)}
          />
          <PopupMenuButton
            title={t('posts.shareMenu.sendInMessage', {
              defaultValue: 'Send in message',
            })}
            text={t('posts.shareMenu.sendInMessage', {
              defaultValue: 'Send in message',
            })}
            icon={Send}
            action={() =>
              openCreateConversation({ message: postUrl })
            }
          />
          <PopupSeparator />
          <PopupSection
            title={t('posts.shareMenu.otherOptions', {
              defaultValue: 'Other options',
            })}
          />
        </>
      ) : null}
      {post.type === 'event' ? (
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
