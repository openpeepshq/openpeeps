import type { GroupWithMeta } from '@openpeepshq/common/types';
import { Button } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { useJoinGroup } from '../../hooks/groups/useJoinGroup';

export interface JoinGroupButtonProps {
  group: GroupWithMeta;
  onJoined?: () => void;
}

export function JoinGroupButton({ group, onJoined }: JoinGroupButtonProps) {
  const t = useT();
  const { canJoin, join } = useJoinGroup(group, onJoined);

  if (!canJoin) return null;

  return (
    <Button
      variant="ghost"
      compact
      className="border-border bg-background text-foreground hover:bg-surface border shadow-sm"
      title={t('groups.join.submit', { defaultValue: 'Join group' })}
      action={join}
    >
      {t('groups.join.submit', { defaultValue: 'Join group' })}
    </Button>
  );
}
