import type { ReactNode } from 'react';
import type { PublicProfile } from '@openpeeps/common/types';
import { isDeletedProfile } from '@openpeeps/common';

export interface ProfileLinkProps {
  profile?: PublicProfile;
  className?: string;
  children: ReactNode;
}

/** Links to /@handle unless the profile is soft-deleted. */
export const ProfileLink = ({
  profile,
  className,
  children,
}: ProfileLinkProps) => {
  if (!profile || isDeletedProfile(profile)) {
    return <span className={className}>{children}</span>;
  }
  return (
    <a href={`/@${profile.handle}`} className={className}>
      {children}
    </a>
  );
};
