import React, { useRef } from 'react';
import { Alert, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PublicProfile } from '@openpeepshq/common/types';
import { canCreatePost } from '@openpeepshq/common/lib';
import {
  useAuthData,
  useCurrentProfile,
  useOpenpeeps,
} from '@openpeepshq/react';
import { useCreateNewConversation } from '~/components/conversations/CreateNewConversationContext';
import {
  BanIcon,
  CopyIcon,
  FlagIcon,
  MessageSquareTextIcon,
  MoreHorizontalIcon,
} from '~/components/icons';
import { MainStackParamList } from '~/components/navigation/types';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { ThemedText } from '~/components/ui/themed-text';
import { BASE_URL } from '~/lib/constants';
import { bottomSheetPresent } from '~/lib/bottom-sheet-ref';
import { FollowUnfollowButton } from './FollowUnfollowButton';
import { ReportProfileOrPostModal } from './ReportProfileOrPostModal';

export interface ProfilePageActionProps {
  profile: PublicProfile;
  isCurrentProfile?: boolean;
}

export const ProfilePageAction = ({
  profile,
  isCurrentProfile = false,
}: ProfilePageActionProps) => {
  const { t } = useTranslation();
  const me = useCurrentProfile();
  const authData = useAuthData();
  const { openpeepsApi } = useOpenpeeps();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { openCreateConversation } = useCreateNewConversation();
  const reportRef = useRef<BottomSheetModal>(null);
  const profileQuery = openpeepsApi.useProfileByHandle(profile.handle);
  const currentQuery = openpeepsApi.useCurrentProfile();
  const blockProfile = openpeepsApi.blockProfileAction({ id: profile.id });
  const unblockProfile = openpeepsApi.unblockProfileAction({ id: profile.id });

  const refresh = () => {
    void profileQuery.refetch();
    void currentQuery.refetch();
  };

  const confirmBlock = () =>
    Alert.alert(
      t('profile.block.title', { handle: profile.handle }),
      t('profile.block.description', { handle: profile.handle }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.block.confirm'),
          style: 'destructive',
          onPress: () => void blockProfile(undefined).then(refresh),
        },
      ]
    );

  if (profile.blockedByMe) {
    return (
      <View className="mt-2 flex-row items-center justify-end gap-x-2 pr-2 pt-3">
        <Button
          variant="outline"
          onPress={() => void unblockProfile(undefined).then(refresh)}
        >
          <ThemedText>{t('profile.block.unblock')}</ThemedText>
        </Button>
      </View>
    );
  }

  return (
    <>
      <View className="mt-2 flex-row items-center justify-end gap-x-2 pr-2 pt-3">
        {isCurrentProfile ? (
          <Button
            variant="outline"
            onPress={() =>
              navigation.navigate('EditProfile', { handle: profile.handle })
            }
          >
            <ThemedText>{t('profile.edit.title')}</ThemedText>
          </Button>
        ) : me ? (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  accessibilityLabel={t('profile.actions.menu')}
                >
                  <MoreHorizontalIcon size={16} className="text-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="mt-1">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    className="flex-row items-center gap-x-2"
                    onPress={() => {
                      Clipboard.setString(`${BASE_URL}/@${profile.handle}`);
                      Toast.show({
                        type: 'success',
                        text1: t('profile.actions.copyProfileLink'),
                      });
                    }}
                  >
                    <CopyIcon size={16} className="text-foreground" />
                    <ThemedText>
                      {t('profile.actions.copyProfileLink')}
                    </ThemedText>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex-row items-center gap-x-2"
                    onPress={confirmBlock}
                  >
                    <BanIcon size={16} className="text-destructive" />
                    <ThemedText className="text-destructive">
                      {t('common.actions.blockProfile', {
                        handle: profile.handle,
                      })}
                    </ThemedText>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex-row items-center gap-x-2"
                    onPress={() => bottomSheetPresent(reportRef)}
                  >
                    <FlagIcon size={16} className="text-destructive" />
                    <ThemedText className="text-destructive">
                      {t('common.actions.reportProfile', {
                        handle: profile.handle,
                      })}
                    </ThemedText>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {canCreatePost(authData, 'note', 'direct') ? (
              <Button
                size="icon"
                variant="outline"
                accessibilityLabel={t('conversations.newMessage')}
                onPress={() =>
                  openCreateConversation({
                    profiles: [profile],
                    skipProfileSelection: true,
                  })
                }
              >
                <MessageSquareTextIcon size={20} className="text-foreground" />
              </Button>
            ) : null}

            <FollowUnfollowButton
              profile={profile}
              onSuccess={() => void profileQuery.refetch()}
            />
          </>
        ) : null}
      </View>

      {me ? (
        <ReportProfileOrPostModal
          ref={reportRef}
          reportType="profile"
          profile={profile}
        />
      ) : null}
    </>
  );
};
