import { useMemo, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { checkRoleCapabilities } from '@openpeeps/common';
import { matchesQuery } from '@openpeeps/common/lib';
import {
  useT,
  useOpenpeeps,
  useSetPageHeader,
  useSetPlusButtonActions,
} from '@openpeeps/react';
import { GroupCard, useCurrentProfile } from '@openpeeps/react/components';
import { Input } from '@openpeeps/react-ui';

export function GroupsIndex() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const currentProfile = useCurrentProfile();
  const [search, setSearch] = useState('');

  const groupsQuery = openpeepsApi.useGroups();
  const groups = groupsQuery.data ?? [];

  const plusButton = useMemo(
    () =>
      checkRoleCapabilities(currentProfile?.roles ?? [], ['core-groups-create'])
        .success
        ? {
            title: t('groups.new', { defaultValue: 'New Group' }),
            icon: Plus,
            action: '/groups/new',
          }
        : undefined,
    [currentProfile?.roles, t],
  );
  useSetPlusButtonActions(plusButton);

  useSetPageHeader(t('navigation.groups', { defaultValue: 'Groups' }));

  const filtered = useMemo(
    () => groups.filter((g) => !search || matchesQuery(g, search)),
    [groups, search],
  );

  return (
    <div className="p-4">
      <Input
        placeholder={t('groups.searchPlaceholder', {
          defaultValue: 'Search by group name',
        })}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        data-testid="groups-search-input"
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
                {t('groups.noGroupsYet', {
                  defaultValue: 'You have no groups yet',
                })}
              </p>
            ) : (
              <p>
                {t('groups.noGroupsFound', { defaultValue: 'No groups found' })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
