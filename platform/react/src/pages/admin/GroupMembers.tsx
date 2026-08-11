import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  MessageSquareText,
  MoreVertical,
  PencilIcon,
  Trash2,
} from 'lucide-react';
import { groupName, truncateText } from '@openpeepshq/common/lib';
import { defaultGroupRoles } from '@openpeepshq/common/types';
import type {
  GroupMember,
  GroupRelationship,
  GroupWithMeta,
} from '@openpeepshq/common/types';
import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import {
  Avatar,
  useCreateNewConversation,
  useCurrentProfile,
} from '../../components';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  LoadingSpinner,
  PopupMenu,
  PopupMenuButton,
} from '@openpeepshq/react-ui';
import { routeHandleParam } from '../../lib/routeHandles';

export function AdminGroupMembers() {
  const t = useT();
  const { handle: handleParam = '' } = useParams<{ handle: string }>();
  const handle = routeHandleParam(handleParam);
  const { openpeepsApi } = useOpenpeeps();
  const groupQuery = openpeepsApi.useGroupByHandle(handle);
  const membersQuery = openpeepsApi.useGroupMembers(groupQuery.data?.id ?? '');

  const group = groupQuery.data;
  const headerTitle = group
    ? `${groupName(group)} - ${t('admin.members.title', { defaultValue: 'Members' })}`
    : t('admin.members.title', { defaultValue: 'Members' });
  useSetPageHeader(headerTitle);

  if (groupQuery.isLoading || membersQuery.isLoading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        <LoadingSpinner />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-8 text-center text-2xl">
        {t('groups.notFound', { defaultValue: 'Group not found' })}
      </div>
    );
  }

  const members = membersQuery.data ?? [];

  return (
    <div className="p-4">
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-surface">
            <tr>
              <th className="p-2 text-left">
                {t('admin.members.profileColumn', { defaultValue: 'Profile' })}
              </th>
              <th className="p-2 text-left">
                {t('admin.members.handleColumn', { defaultValue: 'Handle' })}
              </th>
              <th className="p-2 text-left">
                {t('admin.members.rolesColumn', { defaultValue: 'Roles' })}
              </th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.profile.id} className="border-t">
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <Avatar profile={m.profile} size={2} />
                    <span>
                      {m.profile.displayName || `@${m.profile.handle}`}
                    </span>
                  </div>
                </td>
                <td className="text-muted-foreground p-2">
                  @{m.profile.handle}
                </td>
                <td className="p-2 text-xs">
                  {(m.roles ?? [])
                    .map((r) =>
                      t(`groups.roles.${r}`, { defaultValue: r as string }),
                    )
                    .join(', ') || '—'}
                </td>
                <td className="p-2 text-right">
                  <MemberRowActions group={group} member={m} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type ActiveModal = 'roles' | 'remove' | null;

function MemberRowActions({
  group,
  member,
}: {
  group: GroupWithMeta;
  member: GroupMember;
}) {
  const t = useT();
  const me = useCurrentProfile();
  const { openCreateConversation } = useCreateNewConversation();
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  return (
    <>
      <PopupMenu placement="bottom-end" width="w-56" icon={MoreVertical}>
        {me?.id !== member.profile.id ? (
          <PopupMenuButton
            icon={MessageSquareText}
            title={`Message @${member.profile.handle}`}
            text={t('conversations.newMessage', {
              defaultValue: `Message @${truncateText(member.profile.handle, 10)}`,
              handle: truncateText(member.profile.handle, 10),
            })}
            action={() =>
              openCreateConversation({
                profiles: [member.profile],
                skipProfileSelection: true,
              })
            }
          />
        ) : null}
        <PopupMenuButton
          icon={PencilIcon}
          title={t('groups.changeRoles.title', {
            defaultValue: 'Change Roles',
          })}
          text={t('groups.changeRoles.title', { defaultValue: 'Change Roles' })}
          action={() => setActiveModal('roles')}
        />
        <PopupMenuButton
          icon={Trash2}
          title={t('groups.removeMember.title', {
            defaultValue: 'Remove Member',
          })}
          text={t('groups.removeMember.confirm', { defaultValue: 'Remove' })}
          action={() => setActiveModal('remove')}
          danger
        />
      </PopupMenu>

      {activeModal === 'roles' ? (
        <ChangeRolesModal
          group={group}
          member={member}
          onClose={() => setActiveModal(null)}
        />
      ) : null}
      {activeModal === 'remove' ? (
        <RemoveMemberModal
          group={group}
          member={member}
          onClose={() => setActiveModal(null)}
        />
      ) : null}
    </>
  );
}

function ChangeRolesModal({
  group,
  member,
  onClose,
}: {
  group: GroupWithMeta;
  member: GroupMember;
  onClose: () => void;
}) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const setMemberRoles = openpeepsApi.setGroupMemberRolesAction();

  const [selected, setSelected] = useState<Set<GroupRelationship>>(
    () => new Set((member.roles ?? []) as GroupRelationship[]),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (role: GroupRelationship, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(role);
      else next.delete(role);
      return next;
    });

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await setMemberRoles(
        { roles: Array.from(selected) },
        { id: group.id, memberId: member.profile.id },
      );
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t('groups.changeRoles.title', { defaultValue: 'Change Roles' })}
          </DialogTitle>
        </DialogHeader>
        <p className="px-1 text-sm">
          {t('groups.changeRoles.description', {
            defaultValue: 'Change roles for this group',
            handle: member.profile.handle,
          })}
        </p>
        <div className="space-y-3 px-1">
          {defaultGroupRoles.map((role) => (
            <div key={role} className="flex items-center justify-between gap-4">
              <Label htmlFor={`group-role-${role}`} classes="text-base">
                {t(`groups.roles.${role}`, { defaultValue: role })}
              </Label>
              <input
                id={`group-role-${role}`}
                type="checkbox"
                className="size-4"
                checked={selected.has(role)}
                onChange={(e) => toggle(role, e.target.checked)}
              />
            </div>
          ))}
        </div>
        {error ? (
          <p className="border-error/40 text-error rounded-md border p-2 text-sm">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" action={onClose}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button variant="default" action={submit} disabled={submitting}>
            {t('groups.changeRoles.confirm', { defaultValue: 'Update Roles' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveMemberModal({
  group,
  member,
  onClose,
}: {
  group: GroupWithMeta;
  member: GroupMember;
  onClose: () => void;
}) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const removeMember = openpeepsApi.removeGroupMemberAction();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await removeMember({ id: group.id, memberId: member.profile.id });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t('groups.removeMember.title', { defaultValue: 'Remove Member' })}
          </DialogTitle>
        </DialogHeader>
        <p className="px-1 text-sm">
          {t('groups.removeMember.description', {
            defaultValue:
              'Are you sure you want to remove @{{handle}} from group?',
            handle: member.profile.handle,
          })}
        </p>
        {error ? (
          <p className="border-error/40 text-error rounded-md border p-2 text-sm">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" action={onClose}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button variant="destructive" action={submit} disabled={submitting}>
            {t('groups.removeMember.confirm', { defaultValue: 'Remove' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
