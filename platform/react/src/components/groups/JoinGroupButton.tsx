import type { GroupWithMeta } from '@openpeeps/common/types';
import { checkGroupCapabilities } from '@openpeeps/common/lib';
import { Button } from '@openpeeps/react-ui';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useAuthData, useCurrentProfile } from '../layout/IdentityContext';

export interface JoinGroupButtonProps {
  group: GroupWithMeta;
  onJoined?: () => void;
}

export function JoinGroupButton({ group, onJoined }: JoinGroupButtonProps) {
  const t = useT();
  const authData = useAuthData();
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const joinGroup = openpeepsApi.joinGroupAction({ id: group.id });

  const isMember = me?.memberships?.some((m) => m.group.id === group.id);
  const canJoin =
    !isMember &&
    checkGroupCapabilities(authData, ['core-groups-join'], group).success;

  if (!canJoin) return null;

  return (
    <Button
      variant="variant-ringed-primary"
      title={t('groups.join.submit', { defaultValue: 'Join group' })}
      action={async () => {
        await joinGroup(undefined);
        onJoined?.();
      }}
    >
      {t('groups.join.submit', { defaultValue: 'Join group' })}
    </Button>
  );
}
