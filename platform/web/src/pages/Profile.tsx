import { useParams } from 'react-router-dom';
import { Rss } from 'lucide-react';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import {
  ProfileHeader,
  ProfilePostsAndReplies,
  useCurrentProfile,
  AccessDeniedLoader,
} from '@openpeeps/react/components';
import { routeHandleParam } from '../lib/routeHandles';

export function Profile() {
  const t = useT();
  const { handle: handleParam = '' } = useParams<{ handle: string }>();
  const handle = routeHandleParam(handleParam);
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();

  const profileQuery = openpeepsApi.useProfileByHandle(handle);
  const profile = me?.handle === handle ? me : (profileQuery.data ?? undefined);

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
        <div>
          <ProfileHeader
            profile={profile}
            isCurrentProfile={me?.handle === profile.handle}
          />
          <ProfilePostsAndReplies profile={profile} />
        </div>
      ) : (
        notFound
      )}
    </AccessDeniedLoader>
  );
}
