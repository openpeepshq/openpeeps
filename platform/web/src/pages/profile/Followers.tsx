import { useParams } from 'react-router-dom';
import { UserX } from 'lucide-react';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { ProfileCard } from '@openpeeps/react/components';

interface Props {
  /** When true, render the followees list (`/@:handle/following`). */
  following?: boolean;
}

export function Followers({ following = false }: Props) {
  const t = useT();
  const { handle = '' } = useParams<{ handle: string }>();
  const { openpeepsApi } = useOpenpeeps();

  const profileQuery = openpeepsApi.useProfileByHandle(handle);
  const profile = profileQuery.data;

  const listQuery = following
    ? openpeepsApi.useProfileFollowing(profile?.id ?? '')
    : openpeepsApi.useProfileFollowers(profile?.id ?? '');

  if (profileQuery.isLoading || listQuery.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  const list = listQuery.data ?? [];

  return (
    <div className="relative">
      <h1 className="border-b p-4 text-xl font-semibold">
        {following
          ? t('profile.following.pageTitle', { defaultValue: 'Following' })
          : t('profile.followers.pageTitle', { defaultValue: 'Followers' })}{' '}
        {profile?.displayName ?? `@${handle}`}
      </h1>
      {list.length === 0 ? (
        <div className="relative flex flex-col items-center pt-20">
          <UserX size={50} />
          <p className="mt-2 text-sm text-muted-foreground">
            {following
              ? t('profile.following.empty', {
                  defaultValue: "Not following anyone",
                })
              : t('profile.followers.noFollowing', {
                  defaultValue: 'No followers yet',
                })}
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {list.map((p) => (
            <ProfileCard key={p.id} profile={p} />
          ))}
        </div>
      )}
    </div>
  );
}
