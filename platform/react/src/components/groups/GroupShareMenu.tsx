import { Link, Pencil, Share } from 'lucide-react';
import type { GroupWithMeta } from '@openpeepshq/common/types';
import {
  PopupMenu,
  PopupMenuButton,
  PopupSection,
} from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { useToast } from '../layout/ToastProvider';
import { useNewPostModal } from '../post/post-form/NewPostModalContext';
import { useCreateNewConversation } from '../conversations/CreateNewConversationContext';

export interface GroupShareMenuProps {
  group: GroupWithMeta;
}

export function GroupShareMenu({ group }: GroupShareMenuProps) {
  const t = useT();
  const { success } = useToast();
  const { openNewPost } = useNewPostModal();
  const { openCreateConversation } = useCreateNewConversation();

  const groupUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/groups/@${group.handle}`
      : `/groups/@${group.handle}`;
  const inviteBlurb = t('groups.share.inviteBlurb', { url: groupUrl });

  return (
    <PopupMenu
      icon={Share}
      title={t('groups.actions.shareOnCommunity', {
        defaultValue: 'Share on community',
      })}
    >
      <PopupSection
        title={t('groups.actions.shareOnCommunity', {
          defaultValue: 'Share on community',
        })}
      />
      <PopupMenuButton
        title={t('groups.actions.shareToFeed', { defaultValue: 'Share to feed' })}
        text={t('groups.share.postToFeed', { defaultValue: 'Post to feed' })}
        icon={Pencil}
        action={() =>
          openNewPost({ visibility: 'public', initialContent: inviteBlurb })
        }
      />
      <PopupMenuButton
        title={t('groups.actions.shareInMessage', {
          defaultValue: 'Share in a message',
        })}
        text={t('groups.share.sendInMessage', {
          defaultValue: 'Send in a message',
        })}
        icon={Pencil}
        action={() => openCreateConversation({ message: inviteBlurb })}
      />
      <PopupSection
        title={t('groups.actions.otherOptions', { defaultValue: 'Other options' })}
      />
      <PopupMenuButton
        title={t('groups.share.copyLink', { defaultValue: 'Copy link' })}
        text={t('groups.share.copyLink', { defaultValue: 'Copy link' })}
        icon={Link}
        action={() => {
          void navigator.clipboard.writeText(groupUrl);
          success(
            t('groups.share.linkCopied', { defaultValue: 'Group link copied' }),
          );
        }}
      />
    </PopupMenu>
  );
}
