import type { ReactNode } from 'react';
import { Dot, User, Users } from 'lucide-react';
import type { PublicProfile } from '@openpeepshq/common/types';
import { Avatar, ProfileLink } from '../profile';

export interface NotificationWrapperProps {
  profile: PublicProfile;
  seen?: boolean;
  isGroup?: boolean;
  showProfile?: boolean;
  children: ReactNode;
}

export function NotificationWrapper({
  profile,
  seen = true,
  isGroup = false,
  showProfile = true,
  children,
}: NotificationWrapperProps) {
  return (
    <div className="hover:bg-muted w-full items-start gap-3 overflow-hidden border-b px-4 py-5">
      <div className="flex justify-end">
        {!seen ? <Dot className="h-3 w-3" /> : null}
      </div>

      {showProfile ? (
        <div className="flex items-center gap-4 px-6">
          {isGroup ? (
            <Users className="text-muted-foreground h-8 w-8" />
          ) : (
            <User className="text-muted-foreground h-8 w-8" />
          )}
          <ProfileLink profile={profile}>
            <Avatar profile={profile} size={3.5} />
          </ProfileLink>
        </div>
      ) : null}
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
