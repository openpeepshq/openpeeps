import { useMemo, useState } from 'react';
import { matchesQuery } from '@openpeeps/common/lib';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { Avatar } from '@openpeeps/react/components';
import { Input } from '@openpeeps/react-ui';

export function AdminMembers() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const profilesQuery = openpeepsApi.admin.useProfilesList();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const profiles = profilesQuery.data ?? [];
    if (!search) return profiles;
    return profiles.filter((p) => matchesQuery(p, search));
  }, [profilesQuery.data, search]);

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-semibold">
        {t('admin.members.title', { defaultValue: 'Members' })}
      </h1>

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
                <td className="p-2 text-muted-foreground">@{p.handle}</td>
                <td className="p-2 text-xs">
                  {(p.roles ?? []).join(', ') || '—'}
                </td>
                <td className="p-2 text-xs text-muted-foreground">
                  {new Date(p.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
