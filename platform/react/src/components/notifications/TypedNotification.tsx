import {
  AtSign,
  Megaphone,
  MessageSquare,
  Repeat,
  Reply,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { profileName, groupName } from '@openpeeps/common';
import type {
  GroupWithMeta,
  PublicNotification,
  PublicPost,
} from '@openpeeps/common/types';
import { useT } from '../../i18n';
import { UpdatingDate } from '@openpeeps/react-ui';
import { NotificationWrapper } from './NotificationWrapper';
import { ConversationMessageBubble } from '../conversations/ConversationMessageBubble';
import { FeedPost } from '../post/FeedPost';
import { CardEvent } from '../post/types/event/CardEvent';
import { GroupAvatar } from '../groups/GroupAvatar';

const JAM_TYPES = new Set(['jamStarted', 'jamSpeaker', 'jamModerator']);

function MentionNotification({
  notification,
}: {
  notification: PublicNotification;
}) {
  const t = useT();
  const profile = notification.senderProfile!;
  return (
    <NotificationWrapper
      profile={profile}
      seen={notification.seen}
      showProfile={false}
    >
      <a
        href={`/posts/${notification.post?.id}`}
        className="block w-full px-4 py-2"
      >
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <AtSign className="size-4" />
          {t('notification.mention.text', {
            defaultValue: '{{profileName}} mentioned you',
            profileName: profileName(profile),
          })}
        </p>
        {notification.post ? <FeedPost post={notification.post} /> : null}
      </a>
    </NotificationWrapper>
  );
}

function ReplyNotification({
  notification,
}: {
  notification: PublicNotification;
}) {
  const t = useT();
  const profile = notification.senderProfile!;
  const replyPost = (notification.data as { replyPost?: PublicPost })
    ?.replyPost;
  const target = replyPost ?? notification.post;
  return (
    <NotificationWrapper
      profile={profile}
      seen={notification.seen}
      showProfile={false}
    >
      <a href={`/posts/${target?.id}`} className="block w-full px-4 py-2">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Reply className="size-4" />
          {t('notification.reply.text', {
            defaultValue: '{{profileName}} replied to you',
            profileName: profileName(profile),
          })}
        </p>
        {target ? <FeedPost post={target} /> : null}
      </a>
    </NotificationWrapper>
  );
}

function ReactionNotification({
  notification,
}: {
  notification: PublicNotification;
}) {
  const t = useT();
  const profile = notification.senderProfile!;
  const reaction = (notification.data as { reaction?: string })?.reaction;
  return (
    <NotificationWrapper
      profile={profile}
      seen={notification.seen}
      showProfile={false}
    >
      <a
        href={`/posts/${notification.post?.id}`}
        className="block w-full px-4 py-2"
      >
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <span>{reaction}</span>
          {t('notification.reaction.text', {
            defaultValue: '{{profileName}} reacted to your post',
            profileName: profileName(profile),
          })}
        </p>
        {notification.post ? <FeedPost post={notification.post} /> : null}
      </a>
    </NotificationWrapper>
  );
}

function RepostNotification({
  notification,
}: {
  notification: PublicNotification;
}) {
  const t = useT();
  const profile = notification.senderProfile!;
  return (
    <NotificationWrapper
      profile={profile}
      seen={notification.seen}
      showProfile={false}
    >
      <a
        href={`/posts/${notification.post?.id}`}
        className="block w-full px-4 py-2"
      >
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Repeat className="size-4" />
          {t('notification.repost.text', {
            defaultValue: '{{profileName}} reposted your post',
            profileName: profileName(profile),
          })}
        </p>
        {notification.post ? <FeedPost post={notification.post} /> : null}
      </a>
    </NotificationWrapper>
  );
}

function FollowNotification({
  notification,
}: {
  notification: PublicNotification;
}) {
  const t = useT();
  const profile = notification.senderProfile;
  // A follow notification can arrive without a resolved sender profile (e.g.
  // the profile was deleted or hasn't been hydrated). Reading `profile.handle`
  // then threw and blanked the whole notifications page, so fall back to the
  // generic renderer which handles a missing sender gracefully.
  if (!profile) {
    return <GenericNotification notification={notification} />;
  }
  return (
    <NotificationWrapper profile={profile} seen={notification.seen}>
      <a href={`/@${profile.handle}`} className="block w-full px-4">
        <div className="flex items-center gap-1">
          <p className="text-base">
            {t('notification.follow.text', {
              defaultValue: '{{profileName}} followed you',
              profileName: profileName(profile),
            })}
          </p>
          <span className="text-muted-foreground ml-1 text-sm">
            <UpdatingDate date={notification.createdAt} />
          </span>
        </div>
      </a>
    </NotificationWrapper>
  );
}

function DirectMessageNotification({
  notification,
}: {
  notification: PublicNotification;
}) {
  const t = useT();
  const profile = notification.senderProfile!;
  const conversationStart = (
    notification.data as { conversationStart?: PublicPost }
  )?.conversationStart;
  return (
    <NotificationWrapper profile={profile} seen={notification.seen}>
      <a
        href={`/conversations/${conversationStart?.id ?? notification.post?.id}`}
        className="block w-full px-4"
      >
        <p className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquare className="size-4" />
          {t('notification.directMessage.text', {
            defaultValue: '{{profileName}} sent you a message',
            profileName: profileName(profile),
          })}
        </p>
        {notification.post ? (
          <>
            <ConversationMessageBubble message={notification.post} />
            <div className="text-muted-foreground mt-2 text-xs">
              <UpdatingDate date={notification.post.createdAt} />
            </div>
          </>
        ) : null}
      </a>
    </NotificationWrapper>
  );
}

function AnnouncementNotification({
  notification,
}: {
  notification: PublicNotification;
}) {
  const t = useT();
  const profile = notification.senderProfile!;
  return (
    <NotificationWrapper
      profile={profile}
      seen={notification.seen}
      showProfile={false}
    >
      <a
        href={`/posts/${notification.post?.id}`}
        className="block w-full px-4 py-2"
      >
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Megaphone className="size-4" />
          {t('notification.announcement.text', {
            defaultValue: '{{profileName}} made an announcement',
            profileName: profileName(profile),
          })}
        </p>
        {notification.post ? <FeedPost post={notification.post} /> : null}
      </a>
    </NotificationWrapper>
  );
}

function PollVoteNotification({
  notification,
}: {
  notification: PublicNotification;
}) {
  const t = useT();
  const profile = notification.senderProfile!;
  return (
    <NotificationWrapper
      profile={profile}
      seen={notification.seen}
      showProfile={false}
    >
      <a
        href={`/posts/${notification.post?.id}`}
        className="block w-full px-4 py-2"
      >
        <p className="mb-2 text-sm font-semibold">
          {t('notification.pollVote.text', {
            defaultValue: '{{profileName}} voted on your poll',
            profileName: profileName(profile),
          })}
        </p>
        {notification.post ? <FeedPost post={notification.post} /> : null}
      </a>
    </NotificationWrapper>
  );
}

function RsvpNotification({
  notification,
}: {
  notification: PublicNotification;
}) {
  const t = useT();
  const profile = notification.senderProfile!;
  return (
    <NotificationWrapper
      profile={profile}
      seen={notification.seen}
      showProfile={false}
    >
      <a
        href={`/posts/${notification.post?.id}`}
        className="block w-full px-4 py-2"
      >
        <p className="mb-2 text-sm font-semibold">
          {t('notification.rsvp.text', {
            defaultValue: '{{profileName}} responded to your event',
            profileName: profileName(profile),
          })}
        </p>
        {notification.post ? <FeedPost post={notification.post} /> : null}
      </a>
    </NotificationWrapper>
  );
}

function GroupAvatarThumb({ group }: { group: GroupWithMeta }) {
  return <GroupAvatar group={group} size={2.5} borderless />;
}

function NewGroupInvitationNotification({
  notification,
}: {
  notification: PublicNotification;
}) {
  const t = useT();
  const profile = notification.senderProfile!;
  const group = notification.group as GroupWithMeta;
  return (
    <NotificationWrapper
      profile={profile}
      seen={notification.seen}
      showProfile={false}
    >
      <div className="w-full px-4 py-2">
        <div className="mb-2 flex items-center gap-4">
          <Users className="text-surface-500 size-8" />
          <GroupAvatarThumb group={group} />
        </div>
        <p className="text-sm">
          {t('notification.newGroupInvitation.text', {
            defaultValue: 'You were invited to',
          })}{' '}
          <a href={`/groups/@${group.handle}`} className="font-semibold">
            {groupName(group)}
          </a>
          <span className="text-muted-foreground ml-2 text-xs">
            <UpdatingDate date={notification.createdAt} />
          </span>
        </p>
      </div>
    </NotificationWrapper>
  );
}

function NewGroupMemberNotification({
  notification,
}: {
  notification: PublicNotification;
}) {
  const t = useT();
  const profile = notification.senderProfile!;
  const group = notification.group as GroupWithMeta;
  return (
    <NotificationWrapper
      profile={profile}
      seen={notification.seen}
      showProfile={false}
    >
      <div className="w-full px-4 py-2">
        <div className="mb-2 flex items-center gap-4">
          <Users className="text-surface-500 size-8" />
          <GroupAvatarThumb group={group} />
        </div>
        <p className="text-sm">
          {t('notification.newGroupMember.text', {
            defaultValue: '{{profileName}} joined',
            profileName: profileName(profile),
          })}{' '}
          <a href={`/groups/@${group.handle}`} className="font-semibold">
            {groupName(group)}
          </a>
          <span className="text-muted-foreground ml-2 text-xs">
            <UpdatingDate date={notification.createdAt} />
          </span>
        </p>
      </div>
    </NotificationWrapper>
  );
}

function GroupMemberExitNotification({
  notification,
}: {
  notification: PublicNotification;
}) {
  const t = useT();
  const profile = notification.senderProfile!;
  const group = notification.group as GroupWithMeta;
  return (
    <NotificationWrapper
      profile={profile}
      seen={notification.seen}
      showProfile={false}
    >
      <div className="w-full px-4 py-2">
        <div className="mb-2 flex items-center gap-4">
          <Users className="text-surface-500 size-8" />
          <GroupAvatarThumb group={group} />
        </div>
        <p className="text-sm">
          {t('notification.groupMemberExit.text', {
            defaultValue: '{{profileName}} left {{groupName}}',
            profileName: profileName(profile),
            groupName: groupName(group),
          })}
          <span className="text-muted-foreground ml-2 text-xs">
            <UpdatingDate date={notification.createdAt} />
          </span>
        </p>
      </div>
    </NotificationWrapper>
  );
}

function NewProfileNotification({
  notification,
}: {
  notification: PublicNotification;
}) {
  const t = useT();
  const profile = notification.senderProfile;
  if (!profile) {
    return <GenericNotification notification={notification} />;
  }
  return (
    <NotificationWrapper profile={profile} seen={notification.seen}>
      <a href={`/@${profile.handle}`} className="block w-full px-4">
        <div className="flex items-center gap-1">
          <p className="text-base">
            {t('notification.newProfile.text', {
              defaultValue: '{{profileName}} joined the community',
              profileName: profileName(profile),
            })}
          </p>
          <span className="text-muted-foreground ml-1 text-sm">
            <UpdatingDate date={notification.createdAt} />
          </span>
        </div>
      </a>
    </NotificationWrapper>
  );
}

function NewGroupPostNotification({
  notification,
}: {
  notification: PublicNotification;
}) {
  const t = useT();
  const profile = notification.senderProfile!;
  const post = notification.post;
  const group = (notification.group ?? post?.group) as
    | GroupWithMeta
    | undefined;
  if (!post || !group) {
    return <GenericNotification notification={notification} />;
  }
  return (
    <NotificationWrapper
      profile={profile}
      seen={notification.seen}
      showProfile={false}
    >
      <a href={`/posts/${post.id}`} className="block w-full px-4 py-2">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Users className="size-4" />
          {t('notification.newGroupPost.text', {
            defaultValue: 'New post in {{groupName}}',
            groupName: groupName(group),
          })}
        </p>
        <FeedPost post={post} inGroup />
      </a>
    </NotificationWrapper>
  );
}

function JamNotification({
  notification,
}: {
  notification: PublicNotification;
}) {
  const t = useT();
  const profile = notification.senderProfile!;
  const name = profileName(profile);
  const message = t(`notification.${notification.type}.text`, {
    defaultValue: `${name} — ${notification.type}`,
    profileName: name,
    groupName: notification.group?.displayName,
  });
  return (
    <NotificationWrapper
      profile={profile}
      seen={notification.seen}
      isGroup={!!notification.group}
    >
      <a
        href={`/posts/${notification.post?.id}`}
        className="block w-full px-4 py-2"
      >
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
          {message}
          <span className="text-muted-foreground text-xs font-normal">
            <UpdatingDate date={notification.createdAt} />
          </span>
        </p>
        {notification.post ? <CardEvent post={notification.post} /> : null}
      </a>
    </NotificationWrapper>
  );
}

function GenericNotification({
  notification,
}: {
  notification: PublicNotification;
}) {
  const t = useT();
  const sender = notification.senderProfile;
  if (!sender) {
    return (
      <div className="text-muted-foreground border-b px-4 py-5 text-sm">
        {t(`notification.${notification.type}.text`, {
          defaultValue: notification.type,
        })}
      </div>
    );
  }
  const name = profileName(sender);
  const message = t(`notification.${notification.type}.text`, {
    defaultValue: `${name} — ${notification.type}`,
    profileName: name,
    groupName: notification.group?.displayName,
  });
  return (
    <NotificationWrapper
      profile={sender}
      seen={notification.seen}
      isGroup={!!notification.group}
    >
      {notification.post ? (
        <a
          href={`/posts/${notification.post.id}`}
          className="block w-full px-4"
        >
          <p className="text-base">{message}</p>
        </a>
      ) : (
        <a href={`/@${sender.handle}`} className="block w-full px-4">
          <p className="text-base">{message}</p>
        </a>
      )}
    </NotificationWrapper>
  );
}

const TYPED: Partial<
  Record<string, (props: { notification: PublicNotification }) => ReactNode>
> = {
  mention: MentionNotification,
  reply: ReplyNotification,
  reaction: ReactionNotification,
  repost: RepostNotification,
  follow: FollowNotification,
  directMessage: DirectMessageNotification,
  announcement: AnnouncementNotification,
  pollVote: PollVoteNotification,
  rsvp: RsvpNotification,
  groupAdded: NewGroupInvitationNotification,
  groupMemberJoined: NewGroupMemberNotification,
  groupMemberLeft: GroupMemberExitNotification,
  newProfile: NewProfileNotification,
  newGroupPost: NewGroupPostNotification,
};

export function TypedNotification({
  notification,
}: {
  notification: PublicNotification;
}) {
  if (JAM_TYPES.has(notification.type) && notification.post) {
    return <JamNotification notification={notification} />;
  }
  const Component = TYPED[notification.type];
  if (Component) return <Component notification={notification} />;
  return <GenericNotification notification={notification} />;
}
