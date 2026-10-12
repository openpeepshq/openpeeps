import { Link, Pencil, Share } from 'lucide-react';
import { groupSectionPath, type GroupSection } from '@openpeepshq/common/lib';
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

  const sectionUrl = (section: GroupSection = 'posts') => {
    const path = groupSectionPath(group.handle, section);
    return typeof window !== 'undefined'
      ? `${window.location.origin}${path}`
      : path;
  };
  const groupUrl = sectionUrl();
  const inviteBlurb = t('groups.share.inviteBlurb', { url: groupUrl });
  const copySectionLink = (
    section: GroupSection,
    copiedKey: string,
    copiedDefault: string,
  ) => {
    void navigator.clipboard.writeText(sectionUrl(section));
    success(t(copiedKey, { defaultValue: copiedDefault }));
  };

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
        title={t('groups.actions.shareToFeed', {
          defaultValue: 'Share to feed',
        })}
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
        title={t('groups.actions.otherOptions', {
          defaultValue: 'Other options',
        })}
      />
      <PopupMenuButton
        title={t('groups.share.copyLink', { defaultValue: 'Copy link' })}
        text={t('groups.share.copyLink', { defaultValue: 'Copy link' })}
        icon={Link}
        action={() =>
          copySectionLink(
            'posts',
            'groups.share.linkCopied',
            'Group link copied',
          )
        }
      />
      <PopupMenuButton
        title={t('groups.share.copyEventsLink', {
          defaultValue: 'Copy events link',
        })}
        text={t('groups.share.copyEventsLink', {
          defaultValue: 'Copy events link',
        })}
        icon={Link}
        action={() =>
          copySectionLink(
            'events',
            'groups.share.eventsLinkCopied',
            'Events link copied',
          )
        }
      />
      <PopupMenuButton
        title={t('groups.share.copyResourcesLink', {
          defaultValue: 'Copy resources link',
        })}
        text={t('groups.share.copyResourcesLink', {
          defaultValue: 'Copy resources link',
        })}
        icon={Link}
        action={() =>
          copySectionLink(
            'resources',
            'groups.share.resourcesLinkCopied',
            'Resources link copied',
          )
        }
      />
      <PopupMenuButton
        title={t('groups.share.copyDescriptionLink', {
          defaultValue: 'Copy description link',
        })}
        text={t('groups.share.copyDescriptionLink', {
          defaultValue: 'Copy description link',
        })}
        icon={Link}
        action={() =>
          copySectionLink(
            'description',
            'groups.share.descriptionLinkCopied',
            'Description link copied',
          )
        }
      />
    </PopupMenu>
  );
}
