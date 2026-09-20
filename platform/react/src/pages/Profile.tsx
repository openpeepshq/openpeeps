import { useParams } from 'react-router-dom';
import { Rss } from 'lucide-react';
import { useT, useOpenpeeps, useSetPageHeader } from '../index';
import {
  ProfileHeader,
  ProfilePostsAndReplies,
  useCurrentProfile,
  AccessDeniedLoader,
} from '../components';
import { routeHandleParam } from '../lib/routeHandles';

export function Profile() {
  const t = useT();
  const { handle: handleParam = '' } = useParams<{ handle: string }>();
  const handle = routeHandleParam(handleParam);
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();

  const profileQuery = openpeepsApi.useProfileByHandle(handle);
  const isOwnProfile = me?.handle === handle;
  const profile = isOwnProfile ? me : (profileQuery.data ?? undefined);
  const blockedByMe = !isOwnProfile && !!profileQuery.data?.blockedByMe;

  useSetPageHeader(profile?.displayName || `@${handle}`);

  const notFound = (
    <div className="relative flex flex-col items-center pt-20">
      <Rss size={60} />
      <p
        className="mt-2 text-lg font-medium"
        data-testid="profile-not-found-title"
      >
        {t('profile.notFound.title', { defaultValue: 'Profile not found' })}
      </p>
      <p className="text-muted-foreground mt-2 text-sm">
        {t('profile.notFound.description', {
          defaultValue: "We couldn't find a profile with that handle.",
        })}
      </p>
    </div>
  );

  return (
    <AccessDeniedLoader queries={[profileQuery]} fallbackError={notFound}>
      {profile ? (
        blockedByMe ? (
          <div>
            <ProfileHeader profile={profile} isCurrentProfile={false} />
            <div className="flex flex-col items-center px-4 pb-8">
              <p className="text-lg font-medium">
                {t('profile.block.blockedTitle', {
                  defaultValue: 'You have blocked this profile',
                })}
              </p>
              <p className="text-muted-foreground mt-2 text-center text-sm">
                {t('profile.block.blockedDescription', {
                  defaultValue:
                    'Unblock @{{handle}} to see their profile and posts again.',
                  handle: profile.handle,
                })}
              </p>
            </div>
          </div>
        ) : (
          <div>
            <ProfileHeader profile={profile} isCurrentProfile={isOwnProfile} />
            <ProfilePostsAndReplies
              profile={profile}
              isCurrentProfile={isOwnProfile}
            />
          </div>
        )
      ) : (
        notFound
      )}
    </AccessDeniedLoader>
  );
}
