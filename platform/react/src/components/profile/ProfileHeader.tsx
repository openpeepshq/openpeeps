import { MapPin } from 'lucide-react';
import type { PublicProfile } from '@openpeepshq/common/types';
import { truncateText } from '@openpeepshq/common/lib';

import { useT } from '../../i18n';
import { Avatar } from './Avatar';
import { PostMarkdown } from '../post/Markdown';
import { ProfilePageAction } from './ProfilePageAction';
import { ProfileStats } from './ProfileStats';
import { profileFieldLink } from './profileFieldDisplay';

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
        <div className="relative aspect-[3/1] w-full">
          <div className="bg-surface-2 absolute inset-0 overflow-hidden">
            {profile.header && (
              <img
                src={profile.header}
                alt="banner"
                className="h-full w-full object-cover"
              />
            )}
          </div>
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

          <span className="text-muted-foreground my-1 text-sm font-normal">
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

          <ProfileStats profile={profile} />

          {(profile.fields ?? []).map((field) => {
            const link = profileFieldLink(field.value);
            return (
              <div
                key={field.name}
                className="mt-4 flex min-w-0 items-center gap-2"
              >
                <span className="text-muted-foreground shrink-0 text-sm">
                  {field.name}
                </span>
                {link ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={link.href}
                    className="text-primary min-w-0 flex-1 truncate text-sm hover:underline"
                  >
                    {link.display}
                  </a>
                ) : (
                  <PostMarkdown
                    source={field.value}
                    className="min-w-0 flex-1 pt-1 text-sm"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
