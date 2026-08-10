import { useCallback, useMemo, useState } from 'react';
import { DownloadIcon } from 'lucide-react';
import { matchesQuery } from '@openpeepshq/common/lib';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeepshq/react';
import { Avatar } from '@openpeepshq/react/components';
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

  const filtered = useMemo(() => {
    const profiles = profilesQuery.data ?? [];
    if (!search) return profiles;
    return profiles.filter((p) => matchesQuery(p, search));
  }, [profilesQuery.data, search]);

  return (
    <div className="p-4">
      <div className="mb-4">
        <Input
          placeholder={t('admin.members.searchPlaceholder', {
            defaultValue: 'Search member by name or email',
          })}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
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
            <thead className="bg-surface-100">
              <tr>
                <th className="p-2 text-left">
                  {t('admin.members.profileColumn', {
                    defaultValue: 'Profile',
                  })}
                </th>
                <th className="p-2 text-left">
                  {t('admin.members.handleColumn', { defaultValue: 'Handle' })}
                </th>
                <th className="p-2 text-left">
                  {t('admin.members.rolesColumn', { defaultValue: 'Roles' })}
                </th>
                <th className="p-2 text-left">
                  {t('admin.members.createdColumn', {
                    defaultValue: 'Created',
                  })}
                </th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
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
