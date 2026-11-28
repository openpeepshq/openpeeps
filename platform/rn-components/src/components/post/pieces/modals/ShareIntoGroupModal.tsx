import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import type { GroupWithMeta } from '@openpeepshq/common/types';
import { checkGroupCapabilities, truncateText } from '@openpeepshq/common/lib';
import {
  apiErrorMessage,
  useAuthData,
  useCurrentProfile,
} from '@openpeepshq/react';
import { useControlledSheet } from '../../../../hooks/use-controlled-sheet';
import { BaseSheet } from '../../../custom/modals/common';
import { ThemedText } from '../../../ui/themed-text';
import { LoadingSpinner } from '../../../ui/loading-spinner';
import { Button } from '../../../ui/button';

export interface ShareIntoGroupModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * Called with the chosen group's id; the caller posts the post's link
   * into it as a new note (never a repost).
   */
  onShare: (groupId: string) => Promise<void>;
}

export const ShareIntoGroupModal = ({
  open,
  onClose,
  onShare,
}: ShareIntoGroupModalProps) => {
  const { t } = useTranslation();
  const me = useCurrentProfile();
  const authData = useAuthData();
  const ref = useControlledSheet(open);
  const [sharing, setSharing] = useState<string | null>(null);

  const groups = useMemo(
    () =>
      (me?.memberships ?? [])
        .map((m) => m.group as GroupWithMeta)
        .filter(
          (g) =>
            checkGroupCapabilities(authData, ['core-posts-create-note'], g)
              .success
        ),
    [me?.memberships, authData]
  );

  const share = async (group: GroupWithMeta) => {
    if (sharing) return;
    setSharing(group.id);
    try {
      await onShare(group.id);
      Toast.show({
        type: 'success',
        text1: t('posts.shareMenu.sharedIntoGroup', {
          defaultValue: 'Shared into {{name}}',
          name: truncateText(group.displayName || `@${group.handle}`, 30),
        }),
      });
      onClose();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(
          err,
          t,
          t('posts.shareMenu.shareFailed', {
            defaultValue: "Couldn't share the post",
          })
        ),
      });
    } finally {
      setSharing(null);
    }
  };

  return (
    <BaseSheet
      ref={ref}
      snapPoints={['85%']}
      scrollable
      onDismiss={() => {
        if (!sharing) onClose();
      }}
    >
      <View className="p-6 pb-2">
        <ThemedText className="text-lg font-semibold">
          {t('posts.shareMenu.shareIntoGroupPickerTitle', {
            defaultValue: 'Share into group',
          })}
        </ThemedText>
      </View>
      {groups.length === 0 ? (
        <ThemedText className="p-5 text-center text-sm text-muted-foreground">
          {t('posts.shareMenu.noShareableGroups', {
            defaultValue: "You can't post to any group",
          })}
        </ThemedText>
      ) : (
        groups.map((group) => (
          <Button
            key={group.id}
            variant="ghost"
            className="min-h-[70px] flex-row items-center justify-between px-4 py-3"
            disabled={sharing !== null}
            onPress={() => share(group)}
          >
            <View className="flex-1 flex-row items-center">
              {sharing === group.id ? (
                <LoadingSpinner className="mr-2" />
              ) : null}
              <View className="flex-1">
                <ThemedText className="text-foreground">
                  {truncateText(group.displayName || `@${group.handle}`, 40)}
                </ThemedText>
                <ThemedText className="text-sm text-muted-foreground">
                  @{group.handle}
                </ThemedText>
              </View>
            </View>
          </Button>
        ))
      )}
    </BaseSheet>
  );
};
