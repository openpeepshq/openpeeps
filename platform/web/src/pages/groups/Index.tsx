import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { matchesQuery } from '@openpeeps/common/lib';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { GroupCard } from '@openpeeps/react/components';
import { Input } from '@openpeeps/react-ui';

export function GroupsIndex() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const [search, setSearch] = useState('');

  const groupsQuery = openpeepsApi.useGroups();
  const groups = groupsQuery.data ?? [];

  const filtered = useMemo(
    () =>
      groups.filter((g) => !search || matchesQuery(g, search)),
    [groups, search],
  );

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-semibold">
        {t('navigation.groups', { defaultValue: 'Groups' })}
      </h1>
      <Input
        placeholder={t('groups.searchPlaceholder', {
          defaultValue: 'Search by group name',
        })}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="space-y-2 py-4">
        {filtered.map((group) => (
          <GroupCard key={group.id} group={group} />
        ))}
        {filtered.length === 0 && (
          <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-y-6">
            <Users size={60} />
            {search === '' ? (
              <p>
                {t('groups.noGroups', { defaultValue: 'You have no groups yet' })}
              </p>
            ) : (
              <p>
                {t('groups.noResults', { defaultValue: 'No groups found' })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
