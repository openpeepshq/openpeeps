import React, { forwardRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useOpenpeeps } from '@openpeepshq/react';
import { type GroupWithMeta, getGroupAvatar } from '@openpeepshq/common';
import { ThemedText } from '~/components/ui/themed-text';
import { BaseSheet, SheetFooter } from '../common';
import { useTranslation } from 'react-i18next';
import { bottomSheetClose, bottomSheetDismiss } from '~/lib/bottom-sheet-ref';


interface GroupSelectionSheetProps {
  onSelect: (group: GroupWithMeta) => void;
  selectedGroup?: GroupWithMeta;
}

export const GroupSelectionSheet = forwardRef<
  BottomSheetModal,
  GroupSelectionSheetProps
>(({ onSelect, selectedGroup }, ref) => {
  const { openpeepsApi } = useOpenpeeps();
  const { data: groups } = openpeepsApi.useGroups();
  const { data: server } = openpeepsApi.useServerInfo();
  const { t } = useTranslation();

  return (
    <BaseSheet ref={ref} scrollable>
      <View className="flex-1 p-4">
        <ThemedText className="text-xl font-bold text-center mb-6">
          {t('groups.selection.title')}
        </ThemedText>

        {groups?.map(group => (
          <TouchableOpacity
            key={group.id}
            className="flex-row items-center justify-between py-3"
            onPress={() => onSelect(group)}>
            <View className="flex-row items-center flex-1">
              <Image
                source={
                  (server
                    ? getGroupAvatar(group, server.communityConfig)
                    : group.avatar) as ImageSourcePropType
                }
                className="w-12 h-12 rounded-full mr-3"
              />
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">
                  {group.displayName}
                </Text>
              </View>
            </View>
            <View
              className={`w-6 h-6 rounded-full items-center justify-center border-2 ${selectedGroup?.id === group.id
                ? 'border-foreground'
                : 'border-muted-foreground'
                }`}>
              <View
                className={`w-4 h-4 rounded-full ${selectedGroup?.id === group.id && 'bg-primary'
                  }`}
              />
            </View>
          </TouchableOpacity>
        ))}

        <SheetFooter
          onCancel={() => bottomSheetClose(ref)}
          onConfirm={() => bottomSheetClose(ref)}
        />
      </View>
    </BaseSheet>
  );
});
