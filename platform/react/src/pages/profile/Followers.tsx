import { useParams } from 'react-router-dom';
import { UserX } from 'lucide-react';
import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import { ProfileCard, AccessDeniedLoader } from '../../components';
import { routeHandleParam } from '../../lib/routeHandles';

interface Props {
  /** When true, render the followees list (`/@:handle/following`). */
  following?: boolean;
}

export function Followers({ following = false }: Props) {
  const t = useT();
  const { handle: handleParam = '' } = useParams<{ handle: string }>();
  const handle = routeHandleParam(handleParam);
  const { openpeepsApi } = useOpenpeeps();

  const profileQuery = openpeepsApi.useProfileByHandle(handle);
  const profile = profileQuery.data;

  const listQuery = following
    ? openpeepsApi.useProfileFollowing(profile?.id ?? '')
    : openpeepsApi.useProfileFollowers(profile?.id ?? '');

  const pageTitle = following
    ? t('profile.following.pageTitle', { defaultValue: 'Following' })
    : t('profile.followers.pageTitle', { defaultValue: 'Followers' });
  useSetPageHeader(
    `${pageTitle} ${profile?.displayName ?? `@${handle}`}`,
    undefined,
    following ? 'profile-following-heading' : 'profile-followers-heading',
  );

  return (
    <AccessDeniedLoader queries={[profileQuery]}>
      <AccessDeniedLoader queries={[listQuery]}>
        {(listQuery.data ?? []).length === 0 ? (
          <div className="relative flex flex-col items-center pt-20">
            <UserX size={50} />
            <p className="text-muted-foreground mt-2 text-sm">
              {following
                ? t('profile.following.noFollowers', {
                    defaultValue: 'Not following anyone yet',
                  })
                : t('profile.followers.noFollowing', {
                    defaultValue: 'No followers yet',
                  })}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {(listQuery.data ?? []).map((p) => (
              <ProfileCard key={p.id} profile={p} />
            ))}
          </div>
        )}
      </AccessDeniedLoader>
    </AccessDeniedLoader>
  );
}
