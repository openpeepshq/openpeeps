import type { ReactNode } from 'react';
import { Dot, User, Users } from 'lucide-react';
import type { Group, PublicProfile } from '@openpeepshq/common/types';
import { Avatar, ProfileLink } from '../profile';
import { GroupAvatar } from '../groups/GroupAvatar';

export interface NotificationWrapperProps {
  profile: PublicProfile;
  seen?: boolean;
  group?: Group | null;
  showProfile?: boolean;
  children: ReactNode;
}

export function NotificationWrapper({
  profile,
  group,
  seen = true,
  showProfile = true,
  children,
}: NotificationWrapperProps) {
  return (
    <article className="hover:bg-surface w-full items-start gap-3 overflow-hidden border-b px-4 py-5">
      <div className="flex justify-end">
        {!seen ? <Dot className="h-3 w-3" /> : null}
      </div>

      {showProfile ? (
        <div className="flex items-center gap-4 px-6">
          {group ? (
            <>
              <Users className="text-muted-foreground h-8 w-8" />
              <GroupAvatar group={group} size={3.5} borderless />
            </>
          ) : (
            <>
              <User className="text-muted-foreground h-8 w-8" />
              <ProfileLink profile={profile}>
                <Avatar profile={profile} size={3.5} />
              </ProfileLink>
            </>
          )}
        </div>
      ) : null}
      <div className="flex flex-1 flex-col">{children}</div>
    </article>
  );
}
