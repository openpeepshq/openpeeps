import { X } from 'lucide-react';
import type { PublicProfile } from '@openpeeps/common/types';
import { profileName } from '@openpeeps/common/lib';
import { useT } from '../../i18n';
import { Avatar } from './Avatar';

export type ProfileBadgeProps = {
  profile: PublicProfile;
  onRemove?: () => void;
  className?: string;
};

export const ProfileBadge = ({
  profile,
  onRemove,
  className,
}: ProfileBadgeProps) => {
  const t = useT();

  return (
    <div
      className={`border-secondary bg-surface-50 text-primary flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm ${className ?? ''}`}
    >
      <Avatar profile={profile} size={0.75} borderless />
      <span className="max-w-40 truncate font-medium">
        {profileName(profile)}
      </span>
      {onRemove ? (
        <button
          type="button"
          className="hover:bg-secondary ml-0.5 rounded-full p-0.5 transition-colors"
          title={t('profile.selector.remove', { defaultValue: 'Remove' })}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="size-3" />
        </button>
      ) : null}
    </div>
  );
};
