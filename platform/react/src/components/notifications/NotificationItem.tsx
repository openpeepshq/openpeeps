import type { ReactNode } from 'react';
import { Dot, User, Users } from 'lucide-react';
import { profileName } from '@openpeeps/common';
import type {
  PublicNotification,
  PublicProfile,
} from '@openpeeps/common/types';

import { useT } from '../../i18n';
import { Avatar } from '../profile';
import { UpdatingDate } from '../post/pieces/UpdatingDate';

export interface NotificationItemProps {
  notification: PublicNotification;
}

interface WrapperProps {
  profile: PublicProfile;
  seen?: boolean;
  isGroup?: boolean;
  children: ReactNode;
}

function NotificationWrapper({
  profile,
  seen = true,
  isGroup,
  children,
}: WrapperProps) {
  return (
    <div className="w-full items-start gap-3 overflow-hidden border-b px-4 py-5 hover:bg-surface-300">
      <div className="flex justify-end">
        {!seen && <Dot className="h-3 w-3" />}
      </div>
      <div className="flex items-center gap-4 px-6">
        {isGroup ? (
          <Users className="text-surface-500 h-8 w-8" />
        ) : (
          <User className="text-surface-500 h-8 w-8" />
        )}
        <a href={`/@${profile.handle}`}>
          <Avatar profile={profile} size={3.5} />
        </a>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex w-full items-start justify-between">
          <div className="flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Translation of `@openpeeps/svelte/components/core/notification/Notification.svelte`
 * + every type-specific component (`Follow`, `Reply`, `Reaction`, …).
 *
 * The Svelte tree has 14 separate notification renderers. We collapse them
 * into a single switch here; the message is i18n-keyed by type so localised
 * strings line up with the Svelte version's `notification.<type>.text` keys.
 */
export function NotificationItem({ notification }: NotificationItemProps) {
  const t = useT();
  const sender = notification.senderProfile;

  if (!sender) {
    return (
      <div className="border-b px-4 py-5 text-sm text-muted-foreground">
        {t(`notification.${notification.type}.text`, {
          defaultValue: notification.type,
        })}
      </div>
    );
  }

  const profile = sender as PublicProfile;
  const isGroup = !!notification.group;
  const name = profileName(profile);

  const message = t(`notification.${notification.type}.text`, {
    defaultValue: `${name} ${notification.type}`,
    profileName: name,
    groupName: notification.group?.displayName,
  });

  // Posts/replies/reactions: link to the post.
  const post = notification.post;
  const inner = (
    <div className="w-full px-4">
      <div className="flex items-center gap-1">
        <p className="flex items-center gap-2 text-base">{message}</p>
        <span className="ml-1 text-sm">
          <UpdatingDate date={notification.createdAt} />
        </span>
      </div>
    </div>
  );

  return (
    <NotificationWrapper
      profile={profile}
      seen={notification.seen}
      isGroup={isGroup}
    >
      {post ? (
        <a href={`/posts/${post.id}`} className="block">
          {inner}
        </a>
      ) : (
        <a href={`/@${profile.handle}`} className="block">
          {inner}
        </a>
      )}
    </NotificationWrapper>
  );
}
