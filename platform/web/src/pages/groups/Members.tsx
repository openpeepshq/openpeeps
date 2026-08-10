import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { groupName } from '@openpeepshq/common/lib';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeepshq/react';
import {
  AddGroupMembersButton,
  GroupMembersList,
} from '@openpeepshq/react/components';
import { routeHandleParam } from '../../lib/routeHandles';
import { LoadingSpinner } from '@openpeepshq/react-ui';

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
        <LoadingSpinner />
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
