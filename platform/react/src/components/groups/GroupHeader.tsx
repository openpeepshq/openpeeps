import type { GroupWithMeta } from '@openpeeps/common/types';
import { groupName } from '@openpeeps/common/lib';

import { useT } from '../../i18n';
import { useCurrentProfile } from '../layout/IdentityContext';
import { JoinGroupButton } from './JoinGroupButton';
import { GroupOptionsMenu } from './GroupOptionsMenu';
import { GroupShareMenu } from './GroupShareMenu';
import { GroupAvatar } from './GroupAvatar';

export interface GroupHeaderProps {
  group: GroupWithMeta;
}

export function GroupHeader({ group }: GroupHeaderProps) {
  const t = useT();
  const me = useCurrentProfile();
  const isMember = me?.memberships?.some((m) => m.group.id === group.id);

  return (
    <div className="relative">
      <div className="relative aspect-[3/1] w-full">
        <div className="bg-surface-200 absolute inset-0 overflow-hidden">
          {group.header && (
            <img
              src={group.header}
              alt="banner"
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <GroupAvatar
          group={group}
          size={6}
          borderless
          containerClassName="absolute -bottom-12 left-4"
        />
      </div>
      <div className="flex justify-end space-x-2 p-2">
        {!isMember ? (
          <JoinGroupButton group={group} />
        ) : (
          <>
            <GroupShareMenu group={group} />
            <GroupOptionsMenu group={group} />
          </>
        )}
      </div>
      <div className="mb-8 p-2 pt-6">
        <h1 className="text-xl font-semibold" data-testid="groups-header-title">
          {groupName(group)}
        </h1>
        <p className="text-surface-500 text-sm">@{group.handle}</p>
        <a
          href={`/groups/@${group.handle}/members`}
          title={t('groups.viewMembers', { defaultValue: 'View members' })}
          className="text-muted-foreground text-sm hover:underline"
        >
          {group.membersCount} member{group.membersCount === 1 ? '' : 's'}
        </a>
      </div>
    </div>
  );
}
