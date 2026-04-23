import React from 'react';
import { AudienceSetting } from '@openpeeps/common';
import { ThemedText } from '~/components/ui/themed-text';
import { View } from 'react-native';
import { GroupNameFromId } from '../../groups/group-name-from-id';
import { ProfileAvatar } from '../../profile/profile-avatar';
import { useAudienceChoices } from '../../modals/post/constants';

export const VisibilityDisplay = ({
  audienceSetting,
  type,
  hideGroupName = false,
}: {
  audienceSetting: AudienceSetting;
  type: 'post' | 'event';
  hideGroupName?: boolean;
}) => {
  const visibilityOptions = useAudienceChoices(type);

  return (
    <ThemedText className="text-lg font-semibold">
      {audienceSetting.visibility === 'group' && audienceSetting.groupId ? (
        hideGroupName ? (
          ''
        ) : (
          <GroupNameFromId groupId={audienceSetting.groupId} />
        )
      ) : audienceSetting.visibility === 'direct' &&
        !!audienceSetting.audience ? (
        <>
          <View className="pl-2 flex flex-row items-center">
            {audienceSetting.audience.map(p => (
              <ProfileAvatar key={p.id} profile={p} className="size-6" />
            ))}
          </View>
        </>
      ) : (
        visibilityOptions.find(v => v.value === audienceSetting.visibility)
          ?.title
      )}
    </ThemedText>
  );
};
