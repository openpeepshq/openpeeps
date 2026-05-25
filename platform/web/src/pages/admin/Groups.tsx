import { useState } from 'react';
import { groupName } from '@openpeeps/common/lib';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import { Input } from '@openpeeps/react-ui';

export function AdminGroups() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const groupsQuery = openpeepsApi.admin.useAllGroupsList();
  const [search, setSearch] = useState('');

  useSetPageHeader(t('admin.groups.title', { defaultValue: 'Groups' }));

  const groups = groupsQuery.data ?? [];
  const filtered = search
    ? groups.filter((g) => {
        const q = search.toLowerCase();
        return (
          g.handle.toLowerCase().includes(q) ||
          (g.displayName ?? '').toLowerCase().includes(q)
        );
      })
    : groups;

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
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Handle</th>
              <th className="p-2 text-left">Members</th>
              <th className="p-2 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((g) => (
              <tr key={g.id} className="border-t">
                <td className="p-2">
                  <a
                    className="hover:underline"
                    href={`/groups/@${g.handle}`}
                  >
                    {groupName(g)}
                  </a>
                </td>
                <td className="p-2 text-muted-foreground">@{g.handle}</td>
                <td className="p-2">{g.membersCount}</td>
                <td className="p-2 text-xs text-muted-foreground">
                  {new Date(g.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
