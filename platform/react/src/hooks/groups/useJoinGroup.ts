import { useState } from 'react';
import type { GroupWithMeta } from '@openpeepshq/common/types';
import { checkGroupCapabilities } from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import {
  useAuthData,
  useCurrentProfile,
} from '../../components/layout/IdentityContext';

/**
 * Non-DOM join-group controller — reusable from web and (later) RN screens.
 */
export const useJoinGroup = (group: GroupWithMeta, onJoined?: () => void) => {
  const authData = useAuthData();
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const joinGroup = openpeepsApi.joinGroupAction({ id: group.id } as never);
  const [joined, setJoined] = useState(false);

  const isMember =
    joined || me?.memberships?.some((m) => m.group.id === group.id);
  const canJoin =
    !isMember &&
    checkGroupCapabilities(authData, ['core-groups-join'], group).success;

  const join = async () => {
    await joinGroup(undefined);
    setJoined(true);
    onJoined?.();
  };

  return { canJoin, join };
};
