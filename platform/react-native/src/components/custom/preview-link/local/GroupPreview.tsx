import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useOpenpeeps } from '@openpeeps/react';
import type { QueryObserverResult } from '@tanstack/react-query';
import type { GroupWithMeta } from '@openpeeps/common';
import { GroupCard } from '../../groups/group-card';
import { AccessDenied } from '../AccessDenied';

interface GroupPreviewProps {
  path: string;
}

export const GroupPreview = ({ path }: GroupPreviewProps) => {
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const handle = path.substring(9);

  const {
    data: group,
    isLoading,
    isError,
  } = openpeepsApi.useGroupByHandle(handle);

  const isMember = React.useMemo(
    () =>
      !!group &&
      !!currentProfile?.memberships?.some(m => m.group.id === group.id),
    [currentProfile, group],
  );

  if (isLoading) {
    return (
      <View>
        <ActivityIndicator />
      </View>
    );
  }

  if (isError) {
    const errorQuery = { isError: true } as QueryObserverResult<unknown, unknown>;
    return <AccessDenied queries={[errorQuery]} />;
  }

  if (!group) {
    return null;
  }

  return (
    <GroupCard
      group={group as GroupWithMeta}
      isGroupMember={isMember}
      handleViewGroup={() => {}}
    />
  );
};

