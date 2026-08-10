import { useMemo, useState } from 'react';
import { CheckCheck, Copy, MoreVertical, Users, X } from 'lucide-react';
import { inviteLinkMatchesQuery } from '@openpeepshq/common/lib';
import type { InviteLinkWithMeta } from '@openpeepshq/common/types';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeepshq/react';
import { Avatar } from '@openpeepshq/react/components';
import { UpdatingDate } from '@openpeepshq/react-ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  PopupMenu,
  PopupMenuButton,
} from '@openpeepshq/react-ui';
import { AdminInviteActions } from './components/AdminInviteActions';
import { inviteUrl } from './components/InviteWithLinkModal';

export function AdminInvites() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const invitesQuery = openpeepsApi.admin.useInvitesList();
  const [search, setSearch] = useState('');

  const headerActions = useMemo(() => <AdminInviteActions />, []);

  useSetPageHeader(
    t('admin.invites.title', { defaultValue: 'Invites' }),
    headerActions,
  );

  const invites = (invitesQuery.data ?? []) as InviteLinkWithMeta[];
  const filtered = search
    ? invites.filter((i) => inviteLinkMatchesQuery(i, search))
    : invites;

  return (
    <div className="p-4">
      <div className="mb-4">
        <Input
          placeholder={t('admin.invites.searchPlaceholder', {
            defaultValue: 'Search by name or email',
          })}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex w-full items-center justify-center p-4">
          <h2 className="text-lg">
            {t('admin.invites.noInvitesFound', {
              defaultValue: 'No invites found',
            })}
          </h2>
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-surface-100">
              <tr>
                <th className="p-2 text-left">
                  {t('admin.invites.linkColumn', { defaultValue: 'Link' })}
                </th>
                <th className="p-2 text-left">
                  {t('admin.invites.createdByColumn', {
                    defaultValue: 'Created by',
                  })}
                </th>
                <th className="p-2 text-left">
                  {t('admin.invites.groupsColumn', { defaultValue: 'Groups' })}
                </th>
                <th className="p-2 text-left">
                  {t('admin.invites.expirationDateColumn', {
                    defaultValue: 'Expires',
                  })}
                </th>
                <th className="p-2 text-left">
                  {t('admin.invites.usesColumn', { defaultValue: 'Uses' })}
                </th>
                <th className="p-2 text-left">
                  {t('admin.invites.statusColumn', { defaultValue: 'Status' })}
                </th>
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
                      {invite.groups
                        .map((g) => g.displayName || `@${g.handle}`)
                        .join(', ') || '—'}
                    </td>
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
                        {active
                          ? t('admin.invites.statusActive', {
                              defaultValue: 'Active',
                            })
                          : t('admin.invites.statusInactive', {
                              defaultValue: 'Inactive',
                            })}
                      </span>
                    </td>
                    <td className="p-2 text-right">
                      <InvitesTablePopup invite={invite} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InvitesTablePopup({ invite }: { invite: InviteLinkWithMeta }) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const activate = openpeepsApi.admin.activateInviteAction();
  const deactivate = openpeepsApi.admin.deactivateInviteAction();
  const [showInvited, setShowInvited] = useState(false);

  const active = invite.active && new Date(invite.expiresAt) > new Date();
  const expired = new Date(invite.expiresAt) <= new Date();

  return (
    <>
      <PopupMenu placement="bottom-end" width="w-56" icon={MoreVertical}>
        <PopupMenuButton
          icon={Users}
          title={t('admin.invites.seeInvitedAccounts', {
            defaultValue: 'See invited accounts',
          })}
          text={t('admin.invites.seeInvitedAccounts', {
            defaultValue: 'See invited accounts',
          })}
          action={() => setShowInvited(true)}
        />
        {active ? (
          <>
            <PopupMenuButton
              icon={Copy}
              title={t('admin.invites.copyLink', {
                defaultValue: 'Copy link',
              })}
              text={t('admin.invites.copyLink', { defaultValue: 'Copy link' })}
              action={() =>
                void navigator.clipboard.writeText(inviteUrl(invite.slug))
              }
            />
            <PopupMenuButton
              icon={X}
              title={t('admin.invites.deactivate', {
                defaultValue: 'Deactivate',
              })}
              text={t('admin.invites.deactivate', {
                defaultValue: 'Deactivate',
              })}
              action={() => deactivate({ id: invite.id })}
            />
          </>
        ) : !expired ? (
          <PopupMenuButton
            icon={CheckCheck}
            title={t('admin.invites.activate', { defaultValue: 'Activate' })}
            text={t('admin.invites.activate', { defaultValue: 'Activate' })}
            action={() => activate({ id: invite.id })}
          />
        ) : null}
      </PopupMenu>

      {showInvited ? (
        <ListOfInvitedMembers
          invite={invite}
          onClose={() => setShowInvited(false)}
        />
      ) : null}
    </>
  );
}

function ListOfInvitedMembers({
  invite,
  onClose,
}: {
  invite: InviteLinkWithMeta;
  onClose: () => void;
}) {
  const t = useT();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('admin.invites.invitedMembers', {
              defaultValue: 'Invited members',
            })}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto px-1">
          {invite.redemptions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t('admin.invites.noJoinedAccounts', {
                defaultValue: 'No accounts have joined with this link yet.',
              })}
            </p>
          ) : (
            invite.redemptions.map((profile) => (
              <a
                key={profile.id}
                href={`/@${profile.handle}`}
                className="hover:bg-surface-100 flex items-center gap-2 rounded-md p-2"
              >
                <Avatar profile={profile} size={2} />
                <span>{profile.displayName || `@${profile.handle}`}</span>
              </a>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
