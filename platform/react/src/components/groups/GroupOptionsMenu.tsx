import { useMemo, useState } from 'react';
import {
  CheckCheck,
  Ellipsis,
  LogOut,
  Pencil,
  Trash,
  UserPlus,
} from 'lucide-react';
import type { GroupWithMeta } from '@openpeepshq/common/types';
import {
  checkGroupCapabilities,
  countGroupOwners,
  groupMembershipHasRole,
} from '@openpeepshq/common/lib';
import { PopupMenu, PopupMenuButton } from '@openpeepshq/react-ui';
import { useNavigate } from '../../contexts/router';
import { useOpenpeeps } from '../../contexts/openpeeps';
import {
  adjustUnseenCounts,
  invalidateUnseenCounts,
} from '../../lib/unseenCountsOptimistic';
import { useT } from '../../i18n';
import { useAuthData, useCurrentProfile } from '../layout/IdentityContext';
import { AddGroupMemberModal } from './AddGroupMemberModal';
import { ConfirmGroupExitModal } from './ConfirmGroupExitModal';
import { DeleteGroupModal } from './DeleteGroupModal';

export interface GroupOptionsMenuProps {
  group: GroupWithMeta;
}

type ActiveModal = 'addMember' | 'leave' | 'delete' | null;

export function GroupOptionsMenu({ group }: GroupOptionsMenuProps) {
  const t = useT();
  const navigate = useNavigate();
  const authData = useAuthData();
  const me = useCurrentProfile();
  const { openpeepsApi, queryClient, client } = useOpenpeeps();
  const membersQuery = openpeepsApi.useGroupMembers(group.id);
  const markGroupPostsSeen = openpeepsApi.markGroupPostsSeenAction();
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const isMember = me?.memberships?.some((m) => m.group.id === group.id);

  const canEdit = checkGroupCapabilities(
    authData,
    ['core-groups-update'],
    group,
  ).success;
  const canEditCapabilities = checkGroupCapabilities(
    authData,
    ['core-groups-updateCapabilities'],
    group,
  ).success;
  const canOpenEdit = canEdit || canEditCapabilities;
  const canAddMembers = checkGroupCapabilities(
    authData,
    ['core-groups-addMember'],
    group,
  ).success;
  const canDelete = checkGroupCapabilities(
    authData,
    ['core-groups-delete'],
    group,
  ).success;

  const isLastOwner = useMemo(() => {
    const membership = me?.memberships?.find((m) => m.group.id === group.id);
    return (
      groupMembershipHasRole(membership?.roles, 'owner') &&
      countGroupOwners(membersQuery.data ?? []) <= 1
    );
  }, [me?.memberships, group.id, membersQuery.data]);

  const handleLeave = () => {
    if (isLastOwner) {
      window.alert(
        t('groups.leave.lastOwnerError', {
          defaultValue:
            'You are the last owner. Assign another owner before leaving.',
        }),
      );
      return;
    }
    setActiveModal('leave');
  };

  const handleMarkAllRead = async () => {
    adjustUnseenCounts(queryClient, client, { clearGroup: group.id });
    try {
      await markGroupPostsSeen({ groupId: group.id });
    } catch {
      await invalidateUnseenCounts(queryClient, client);
      window.alert(
        t('groups.markAllRead.error', {
          defaultValue: 'Failed to mark group posts as read',
        }),
      );
    }
  };

  return (
    <>
      <PopupMenu
        icon={Ellipsis}
        title={t('groups.actions.more', { defaultValue: 'Group options' })}
      >
        {isMember ? (
          <PopupMenuButton
            title={t('groups.actions.markAllRead', {
              defaultValue: 'Mark all posts as read',
            })}
            text={t('groups.actions.markAllRead', {
              defaultValue: 'Mark all posts as read',
            })}
            icon={CheckCheck}
            action={() => void handleMarkAllRead()}
          />
        ) : null}
        {canOpenEdit ? (
          <PopupMenuButton
            title={t('groups.actions.editGroup', {
              defaultValue: 'Edit group',
            })}
            text={t('groups.actions.editGroup', {
              defaultValue: 'Edit group',
            })}
            icon={Pencil}
            action={() =>
              navigate({ type: 'group', handle: group.handle, view: 'edit' })
            }
          />
        ) : null}
        {canAddMembers ? (
          <PopupMenuButton
            title={t('groups.actions.addMembers', {
              defaultValue: 'Add members',
            })}
            text={t('groups.actions.addMembers', {
              defaultValue: 'Add members',
            })}
            icon={UserPlus}
            action={() => setActiveModal('addMember')}
          />
        ) : null}
        <PopupMenuButton
          title={t('groups.actions.leaveGroup', {
            defaultValue: 'Leave group',
          })}
          text={t('groups.actions.leaveGroup', { defaultValue: 'Leave group' })}
          icon={LogOut}
          action={handleLeave}
        />
        {canDelete ? (
          <PopupMenuButton
            title={t('groups.delete.title', { defaultValue: 'Delete group' })}
            text={t('groups.delete.title', { defaultValue: 'Delete group' })}
            icon={Trash}
            action={() => setActiveModal('delete')}
            danger
          />
        ) : null}
      </PopupMenu>

      {activeModal === 'addMember' ? (
        <AddGroupMemberModal
          group={group}
          onClose={() => setActiveModal(null)}
        />
      ) : null}
      {activeModal === 'leave' ? (
        <ConfirmGroupExitModal
          group={group}
          onClose={() => setActiveModal(null)}
        />
      ) : null}
      {activeModal === 'delete' ? (
        <DeleteGroupModal group={group} onClose={() => setActiveModal(null)} />
      ) : null}
    </>
  );
}
