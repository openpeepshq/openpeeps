import { useMemo, useState, type ReactNode } from 'react';
import { Plus, Users } from 'lucide-react';
import { checkRoleCapabilities } from '@openpeepshq/common';
import { matchesQuery } from '@openpeepshq/common/lib';
import {
  useT,
  useOpenpeeps,
  useSetPageHeader,
  useSetPlusButtonActions,
} from '@openpeepshq/react';
import { GroupCard, useCurrentProfile } from '@openpeepshq/react/components';
import { Input } from '@openpeepshq/react-ui';

type GroupsTab = 'mine' | 'all';

export function GroupsIndex() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const currentProfile = useCurrentProfile();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<GroupsTab>('mine');

  const groupsQuery = openpeepsApi.useGroups();
  const unseenCountsQuery = openpeepsApi.useUnseenPostCounts();
  const groups = groupsQuery.data ?? [];
  const unseenByGroup = unseenCountsQuery.data?.groups ?? {};

  const myGroupIds = useMemo(
    () =>
      new Set(
        (currentProfile?.memberships ?? []).map(
          (membership) => membership.group.id,
        ),
      ),
    [currentProfile?.memberships],
  );

  const tabGroups = useMemo(
    () =>
      tab === 'mine'
        ? groups.filter((group) => myGroupIds.has(group.id))
        : groups,
    [groups, myGroupIds, tab],
  );

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
    () => tabGroups.filter((g) => !search || matchesQuery(g, search)),
    [tabGroups, search],
  );

  return (
    <div className="p-4">
      <nav className="border-border mb-4 flex border-b">
        <TabButton active={tab === 'mine'} onClick={() => setTab('mine')}>
          {t('groups.tabs.myGroups', { defaultValue: 'My groups' })}
        </TabButton>
        <TabButton active={tab === 'all'} onClick={() => setTab('all')}>
          {t('groups.tabs.allGroups', { defaultValue: 'All groups' })}
        </TabButton>
      </nav>
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
          <GroupCard
            key={group.id}
            group={group}
            unreadCount={
              tab === 'mine' ? (unseenByGroup[group.id] ?? 0) : undefined
            }
          />
        ))}
        {filtered.length === 0 && (
          <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-y-6">
            <Users size={60} />
            {search === '' ? (
              <p>
                {tab === 'mine'
                  ? t('groups.noGroupsYet', {
                      defaultValue: 'You have no groups yet',
                    })
                  : t('groups.noGroupsFound', {
                      defaultValue: 'No groups found',
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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm ${active ? 'border-primary border-b-2 font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {children}
    </button>
  );
}
