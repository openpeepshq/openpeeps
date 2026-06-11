import { useMemo, useState } from 'react';
import { matchesQuery } from '@openpeeps/common/lib';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import { Avatar } from '@openpeeps/react/components';
import { Input } from '@openpeeps/react-ui';
import { ProfileRowActions } from './components/ProfileRowActions';

export function AdminMembers() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const profilesQuery = openpeepsApi.admin.useProfilesList();
  const [search, setSearch] = useState('');

  useSetPageHeader(t('admin.members.title', { defaultValue: 'Members' }));

  const filtered = useMemo(() => {
    const profiles = profilesQuery.data ?? [];
    if (!search) return profiles;
    return profiles.filter((p) => matchesQuery(p, search));
  }, [profilesQuery.data, search]);

  return (
    <div className="p-4">
      <div className="mb-4">
        <Input
          placeholder={t('common.search', { defaultValue: 'Search…' })}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-surface-100">
            <tr>
              <th className="p-2 text-left">Profile</th>
              <th className="p-2 text-left">Handle</th>
              <th className="p-2 text-left">Roles</th>
              <th className="p-2 text-left">Created</th>
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
    </div>
  );
}
