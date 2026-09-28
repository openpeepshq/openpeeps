import { useCallback, useMemo, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, DownloadIcon } from 'lucide-react';
import { matchesQuery } from '@openpeepshq/common/lib';
import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import { Avatar } from '../../components';
import { Button, Input } from '@openpeepshq/react-ui';
import { AdminInviteActions } from './components/AdminInviteActions';
import { ProfileRowActions } from './components/ProfileRowActions';

const downloadCsv = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export function AdminMembers() {
  const t = useT();
  const { openpeepsApi, client } = useOpenpeeps();
  const profilesQuery = openpeepsApi.admin.useProfilesList();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{
    column: 'handle' | 'createdAt';
    direction: 'asc' | 'desc';
  }>({
    column: 'createdAt',
    direction: 'desc',
  });

  const toggleSort = useCallback((column: 'handle' | 'createdAt') => {
    setSort((prev) => {
      if (prev.column === column) {
        return {
          column,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { column, direction: 'asc' };
    });
  }, []);

  const handleDownload = useCallback(async () => {
    const csv = await client.admin.profiles.exportCsv();
    downloadCsv(csv, 'members.csv');
  }, [client]);

  const headerActions = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <Button variant="outline" compact action={handleDownload}>
          <DownloadIcon size={16} />
          {t('admin.members.downloadCsv', { defaultValue: 'Download CSV' })}
        </Button>
        <AdminInviteActions />
      </div>
    ),
    [handleDownload, t],
  );

  useSetPageHeader(
    t('admin.members.title', { defaultValue: 'Members' }),
    headerActions,
  );

  const sorted = useMemo(() => {
    const profiles = profilesQuery.data ?? [];
    const searched = search
      ? profiles.filter((p) => matchesQuery(p, search))
      : profiles;
    const multiplier = sort.direction === 'asc' ? 1 : -1;
    return [...searched].sort((a, b) => {
      const aVal = sort.column === 'handle' ? (a.handle ?? '') : a.createdAt;
      const bVal = sort.column === 'handle' ? (b.handle ?? '') : b.createdAt;
      if (aVal < bVal) return -multiplier;
      if (aVal > bVal) return multiplier;
      return 0;
    });
  }, [profilesQuery.data, search, sort]);

  return (
    <div className="p-4">
      <form
        role="search"
        className="mb-4"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <Input
          placeholder={t('admin.members.searchPlaceholder', {
            defaultValue: 'Search member by name or email',
          })}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>

      {sorted.length === 0 ? (
        <div className="flex w-full items-center justify-center p-4">
          <h2 className="text-lg">
            {t('admin.members.noUsersFound', {
              defaultValue: 'No users found',
            })}
          </h2>
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="p-2 text-left">
                  {t('admin.members.profileColumn', {
                    defaultValue: 'Profile',
                  })}
                </th>
                <th
                  className="cursor-pointer select-none p-2 text-left"
                  onClick={() => toggleSort('handle')}
                >
                  {t('admin.members.handleColumn', {
                    defaultValue: 'Handle',
                  })}
                  {sort.column === 'handle' &&
                    (sort.direction === 'asc' ? (
                      <ChevronUpIcon className="ml-1 inline h-3 w-3" />
                    ) : (
                      <ChevronDownIcon className="ml-1 inline h-3 w-3" />
                    ))}
                </th>
                <th className="p-2 text-left">
                  {t('admin.members.rolesColumn', { defaultValue: 'Roles' })}
                </th>
                <th
                  className="cursor-pointer select-none p-2 text-left"
                  onClick={() => toggleSort('createdAt')}
                >
                  {t('admin.members.createdColumn', {
                    defaultValue: 'Created',
                  })}
                  {sort.column === 'createdAt' &&
                    (sort.direction === 'asc' ? (
                      <ChevronUpIcon className="ml-1 inline h-3 w-3" />
                    ) : (
                      <ChevronDownIcon className="ml-1 inline h-3 w-3" />
                    ))}
                </th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <Avatar profile={p} size={2} />
                      <span>{p.displayName || `@${p.handle}`}</span>
                    </div>
                  </td>
                  <td className="text-muted-foreground p-2">@{p.handle}</td>
                  <td className="p-2 text-xs">
                    {(p.roles ?? [])
                      .map((r) => r.displayName || r.key)
                      .join(', ') || '—'}
                  </td>
                  <td className="text-muted-foreground p-2 text-xs">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-2 text-right">
                    <ProfileRowActions profile={p} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
