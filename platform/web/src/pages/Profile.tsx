import { useParams } from 'react-router-dom';
import { Rss } from 'lucide-react';
import { useT, useOpenpeeps } from '@openpeeps/react';
import {
  ProfileHeader,
  ProfilePostsAndReplies,
  useCurrentProfile,
} from '@openpeeps/react/components';
import { routeHandleParam } from '../lib/routeHandles';

export function Profile() {
  const t = useT();
  const { handle: handleParam = '' } = useParams<{ handle: string }>();
  const handle = routeHandleParam(handleParam);
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();

  const profileQuery = openpeepsApi.useProfileByHandle(handle);
  const profile =
    me?.handle === handle ? me : profileQuery.data ?? undefined;

  if (profileQuery.isLoading && !profile) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="relative flex flex-col items-center pt-20">
        <Rss size={60} />
        <p className="mt-2 text-lg font-medium">
          {t('profile.notFound.title', { defaultValue: 'Profile not found' })}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('profile.notFound.description', {
            defaultValue: "We couldn't find a profile with that handle.",
          })}
        </p>
      </div>
    );
  }

  return (
    <div>
      <ProfileHeader
        profile={profile}
        isCurrentProfile={me?.handle === profile.handle}
      />
      <ProfilePostsAndReplies profile={profile} />
    </div>
  );
}
