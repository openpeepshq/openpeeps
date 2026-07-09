import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { groupName } from '@openpeeps/common/lib';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import {
  AddGroupMembersButton,
  GroupMembersList,
} from '@openpeeps/react/components';
import { routeHandleParam } from '../../lib/routeHandles';

export function GroupMembers() {
  const t = useT();
  const { handle: handleParam = '' } = useParams<{ handle: string }>();
  const handle = routeHandleParam(handleParam);
  const { openpeepsApi } = useOpenpeeps();

  const groupQuery = openpeepsApi.useGroupByHandle(handle);
  const group = groupQuery.data;

  const headerTitle = group
    ? `${groupName(group)} - ${t('groups.members.title', { defaultValue: 'Members' })}`
    : t('groups.members.title', { defaultValue: 'Members' });
  const headerActions = useMemo(
    () => (group ? <AddGroupMembersButton group={group} /> : undefined),
    [group],
  );

  useSetPageHeader(headerTitle, headerActions);

  if (groupQuery.isLoading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-2xl font-bold">
          {t('groups.notFound', { defaultValue: 'Group not found' })}
        </p>
      </div>
    );
  }

  return <GroupMembersList group={group} />;
}
