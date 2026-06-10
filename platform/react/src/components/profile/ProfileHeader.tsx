import { MapPin } from 'lucide-react';
import type { PublicProfile } from '@openpeeps/common/types';
import { truncateText } from '@openpeeps/common/lib';

import { useT } from '../../i18n';
import { Avatar } from './Avatar';
import { PostMarkdown } from '../post/Markdown';
import { ProfilePageAction } from './ProfilePageAction';
import { ProfileStats } from './ProfileStats';

export interface ProfileHeaderProps {
  profile: PublicProfile;
  isCurrentProfile?: boolean;
}

/**
 * Translation of `profilePage/ProfileHeader.svelte`. Renders the cover image
 * + avatar + display name + handle + bio + location + custom fields.
 */
export function ProfileHeader({
  profile,
  isCurrentProfile = false,
}: ProfileHeaderProps) {
  const t = useT();
  return (
    <div className="relative">
      <div className="mb-8">
        <div className="bg-surface-200 relative h-44 bg-cover bg-center">
          {profile.header && (
            <img
              src={profile.header}
              alt="banner"
              className="absolute left-0 top-0 h-full w-full object-cover"
            />
          )}
          <Avatar
            profile={profile}
            size={6}
            containerClassName="absolute -bottom-12 left-4"
            borderless
          />
        </div>
        {/* Sits below the banner (mirrors the Svelte layout): its height
            reserves space so the overhanging avatar doesn't cover the name. */}
        <ProfilePageAction
          profile={profile}
          isCurrentProfile={isCurrentProfile}
        />
        <div className="p-2">
          <h1
            className="mt-4 text-base font-semibold"
            data-testid="profile-header-title"
          >
            {truncateText(profile.displayName || profile.handle, 50)}
          </h1>

          <span className="text-surface-500 my-1 text-sm font-normal">
            @{profile.handle}
          </span>

          <PostMarkdown
            source={profile.bio || t('profile.noBio', { defaultValue: '' })}
          />

          {profile.location?.text && (
            <div className="flex items-center gap-1">
              <span className="input-group-shim">
                <MapPin className="size-3" />
              </span>
              <p>{profile.location.text}</p>
            </div>
          )}

          {(profile.fields ?? []).map((field) => (
            <div key={field.name} className="mt-4 flex items-center gap-2">
              <span className="text-surface-500 text-sm">{field.name}</span>
              <PostMarkdown source={field.value} className="pt-1 text-sm" />
            </div>
          ))}

          <ProfileStats profile={profile} />
        </div>
      </div>
    </div>
  );
}
