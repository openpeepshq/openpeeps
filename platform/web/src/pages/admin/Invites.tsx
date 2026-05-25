import { useState } from 'react';
import { inviteLinkMatchesQuery } from '@openpeeps/common/lib';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { UpdatingDate } from '@openpeeps/react/components';
import { Button, Input } from '@openpeeps/react-ui';

export function AdminInvites() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const invitesQuery = openpeepsApi.admin.useInvitesList();
  const activate = openpeepsApi.admin.activateInviteAction();
  const deactivate = openpeepsApi.admin.deactivateInviteAction();
  const [search, setSearch] = useState('');

  const invites = invitesQuery.data ?? [];
  const filtered = search
    ? invites.filter((i) => inviteLinkMatchesQuery(i, search))
    : invites;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          {t('admin.invites.title', { defaultValue: 'Invites' })}
        </h1>
        <Button
          title={t('admin.invites.newInvite', { defaultValue: 'New Invite' })}
          variant="variant-filled-primary"
          action={() => undefined}
          data-testid="admin-new-invite-button"
        >
          {t('admin.invites.newInvite', { defaultValue: 'New Invite' })}
        </Button>
      </div>

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
              <th className="p-2 text-left">Link</th>
              <th className="p-2 text-left">Created by</th>
              <th className="p-2 text-left">Expires</th>
              <th className="p-2 text-left">Uses</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((invite) => {
              const active =
                invite.active && new Date(invite.expiresAt) > new Date();
              return (
                <tr key={invite.id} className="border-t">
                  <td className="p-2 font-mono text-xs">{invite.slug}</td>
                  <td className="p-2">@{invite.profile.handle}</td>
                  <td className="p-2 text-xs">
                    <UpdatingDate date={invite.expiresAt} />
                  </td>
                  <td className="p-2 text-xs">
                    {invite.redemptions.length}/{invite.maxUses}
                  </td>
                  <td className="p-2 text-xs">
                    <span
                      className={`rounded px-2 py-0.5 ${active ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}
                    >
                      {active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-2">
                    <Button
                      title={active ? 'Deactivate' : 'Activate'}
                      variant="variant-ghost-primary"
                      action={() =>
                        (active ? deactivate : activate)({
                          id: invite.id,
                        })
                      }
                    >
                      {active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
