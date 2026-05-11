import { useMemo, useState } from 'react';
import { matchesQuery, sortProfiles } from '@openpeeps/common/lib';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { ProfileCard } from '@openpeeps/react/components';
import { Input } from '@openpeeps/react-ui';

export function Members() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const [search, setSearch] = useState('');

  const profilesQuery = openpeepsApi.useProfiles();
  const profiles = profilesQuery.data ?? [];

  const filtered = useMemo(
    () =>
      sortProfiles(profiles).filter(
        (p) => !search || matchesQuery(p, search),
      ),
    [profiles, search],
  );

  return (
    <div className="p-4">
      <Input
        placeholder={t('members.searchPlaceholder', {
          defaultValue: 'Search member by name or handle',
        })}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="my-4 pb-10">
        {filtered.map((profile) => (
          <ProfileCard key={profile.id} profile={profile} />
        ))}
        {filtered.length === 0 && (
          <div className="flex w-full items-center justify-center p-4">
            <h2 className="text-lg">
              {t('members.empty', { defaultValue: 'No profiles found' })}
            </h2>
          </div>
        )}
      </div>

      {profilesQuery.error && (
        <div className="w-full text-center text-sm text-error">
          {t('members.fetchError', {
            defaultValue:
              'Failed to fetch accounts. Please try again later.',
          })}
        </div>
      )}
    </div>
  );
}
