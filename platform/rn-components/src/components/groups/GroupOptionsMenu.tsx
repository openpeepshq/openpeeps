import React, { useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import type { GroupWithMeta } from '@openpeepshq/common/types';
import {
  checkGroupCapabilities,
  countGroupOwners,
  groupMembershipHasRole,
} from '@openpeepshq/common/lib';
import {
  adjustUnseenCounts,
  invalidateUnseenCounts,
  useAuthData,
  useCurrentProfile,
  useNavigate,
  useOpenpeeps,
} from '@openpeepshq/react';
import {
  CheckIcon,
  LogOutIcon,
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
  UsersPlusIcon,
} from '../icons/index';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ThemedText } from '../ui/themed-text';
import { AddGroupMemberModal } from './AddGroupMemberModal';
import { ConfirmGroupExitModal } from './ConfirmGroupExitModal';
import { DeleteGroupModal } from './DeleteGroupModal';

export interface GroupOptionsMenuProps {
  group: GroupWithMeta;
}

type ActiveModal = 'addMember' | 'leave' | 'delete' | null;

export const GroupOptionsMenu = ({ group }: GroupOptionsMenuProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authData = useAuthData();
  const me = useCurrentProfile();
  const { openpeepsApi, queryClient, client } = useOpenpeeps();
  const membersQuery = openpeepsApi.useGroupMembers(group.id);
  const markGroupPostsSeen = openpeepsApi.markGroupPostsSeenAction();
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const isMember = me?.memberships?.some((m) => m.group.id === group.id);

  const can = (
    capability: Parameters<typeof checkGroupCapabilities>[1][number]
  ) => checkGroupCapabilities(authData, [capability], group).success;
  const canOpenEdit =
    can('core-groups-update') || can('core-groups-updateCapabilities');
  const canAddMembers = can('core-groups-addMember');
  const canDelete = can('core-groups-delete');

  const isLastOwner = useMemo(() => {
    const membership = me?.memberships?.find((m) => m.group.id === group.id);
    return (
      groupMembershipHasRole(membership?.roles, 'owner') &&
      countGroupOwners(membersQuery.data ?? []) <= 1
    );
  }, [me?.memberships, group.id, membersQuery.data]);

  const handleLeave = () => {
    if (isLastOwner) {
      Toast.show({ type: 'error', text1: t('groups.leave.lastOwnerError') });
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
      Toast.show({ type: 'error', text1: t('groups.markAllRead.error') });
    }
  };

  const itemClass = 'flex-row items-center gap-x-2';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Pressable
            className="p-2"
            accessibilityLabel={t('groups.actions.more')}
          >
            <MoreHorizontalIcon size={20} className="text-foreground" />
          </Pressable>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="mt-1">
          <DropdownMenuGroup>
            {isMember ? (
              <DropdownMenuItem
                className={itemClass}
                onPress={() => void handleMarkAllRead()}
              >
                <CheckIcon size={16} className="text-foreground" />
                <ThemedText>{t('groups.actions.markAllRead')}</ThemedText>
              </DropdownMenuItem>
            ) : null}
            {canOpenEdit ? (
              <DropdownMenuItem
                className={itemClass}
                onPress={() =>
                  navigate({
                    type: 'group',
                    handle: group.handle,
                    view: 'edit',
                  })
                }
              >
                <PencilIcon size={16} className="text-foreground" />
                <ThemedText>{t('groups.actions.editGroup')}</ThemedText>
              </DropdownMenuItem>
            ) : null}
            {canAddMembers ? (
              <DropdownMenuItem
                className={itemClass}
                onPress={() => setActiveModal('addMember')}
              >
                <UsersPlusIcon size={16} className="text-foreground" />
                <ThemedText>{t('groups.actions.addMembers')}</ThemedText>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem className={itemClass} onPress={handleLeave}>
              <LogOutIcon size={16} className="text-foreground" />
              <ThemedText>{t('groups.actions.leaveGroup')}</ThemedText>
            </DropdownMenuItem>
            {canDelete ? (
              <DropdownMenuItem
                className={itemClass}
                onPress={() => setActiveModal('delete')}
              >
                <TrashIcon size={16} className="text-destructive" />
                <ThemedText className="text-destructive">
                  {t('groups.delete.title')}
                </ThemedText>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

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
};
