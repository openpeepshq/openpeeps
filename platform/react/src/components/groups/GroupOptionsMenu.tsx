import { useMemo, useState } from 'react';
import { Ellipsis, LogOut, Pencil, Trash, UserPlus } from 'lucide-react';
import type { GroupWithMeta } from '@openpeeps/common/types';
import { checkGroupCapabilities } from '@openpeeps/common/lib';
import { PopupMenu, PopupMenuButton } from '@openpeeps/react-ui';
import { useNavigate } from '../../contexts/router';
import { useOpenpeeps } from '../../contexts/openpeeps';
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
  const { openpeepsApi } = useOpenpeeps();
  const membersQuery = openpeepsApi.useGroupMembers(group.id);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const canEdit = checkGroupCapabilities(authData, ['core-groups-update'], group)
    .success;
  const canAddMembers = checkGroupCapabilities(
    authData,
    ['core-groups-addMember'],
    group,
  ).success;
  const canDelete = checkGroupCapabilities(authData, ['core-groups-delete'], group)
    .success;

  const isLastAdmin = useMemo(() => {
    const membership = me?.memberships?.find((m) => m.group.id === group.id);
    const isAdmin = membership?.roles?.includes('admin');
    const adminCount = (membersQuery.data ?? []).filter((m) =>
      m.roles?.includes('admin'),
    ).length;
    return !!isAdmin && adminCount <= 1;
  }, [me?.memberships, group.id, membersQuery.data]);

  const handleLeave = () => {
    if (isLastAdmin) {
      window.alert(
        t('groups.leave.lastAdminError', {
          defaultValue: 'You are the last admin. Assign another admin before leaving.',
        }),
      );
      return;
    }
    setActiveModal('leave');
  };

  return (
    <>
      <PopupMenu
        icon={Ellipsis}
        title={t('groups.actions.more', { defaultValue: 'Group options' })}
      >
        {canEdit ? (
          <PopupMenuButton
            title={t('groups.actions.editGroup', { defaultValue: 'Edit group' })}
            text={t('groups.actions.editGroup', { defaultValue: 'Edit group' })}
            icon={Pencil}
            action={() => navigate(`/groups/@${group.handle}/edit`)}
          />
        ) : null}
        {canAddMembers ? (
          <PopupMenuButton
            title={t('groups.actions.addMembers', { defaultValue: 'Add members' })}
            text={t('groups.actions.addMembers', { defaultValue: 'Add members' })}
            icon={UserPlus}
            action={() => setActiveModal('addMember')}
          />
        ) : null}
        <PopupMenuButton
          title={t('groups.actions.leaveGroup', { defaultValue: 'Leave group' })}
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
