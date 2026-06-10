import { useState } from 'react';
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
  // Optimistically reflect the join so the button hides immediately, instead of
  // waiting for the `['profiles','current']` refetch to repopulate memberships
  // (mirrors the Svelte JoinGroupButton's local `joined` flag).
  const [joined, setJoined] = useState(false);

  const isMember =
    joined || me?.memberships?.some((m) => m.group.id === group.id);
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
        setJoined(true);
        onJoined?.();
      }}
    >
      {t('groups.join.submit', { defaultValue: 'Join group' })}
    </Button>
  );
}
