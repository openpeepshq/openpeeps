import { View, Share as ShareApi } from 'react-native';
import React, { useCallback, useRef } from 'react';
import { PublicProfile } from '@openpeeps/common';
import { Button } from '~/components/ui/button';
import {
  ShareIcon,
  MoreHorizontalIcon,
  MessageSquareIcon,
  LinkIcon,
  FlagIcon,
  BellIcon,
  BanIcon,
  MailIcon,
} from '~/components/icons';
import { ThemedText } from '~/components/ui/themed-text';
import { MainScreenProps } from '~/components/navigation/types';
import { FollowUnfollowButton } from './follow-unfollow-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import Clipboard from '@react-native-clipboard/clipboard';
import { BASE_URL } from '~/lib/constants';
import { useNewConversationStore } from '~/stores/useNewConversationStore';
import { useTranslation } from 'react-i18next';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ReportProfileOrPostSheet } from '../common/report-profile-or-post-sheet';

interface ProfileActionsProps extends MainScreenProps<'Profile'> {
  profile: PublicProfile;
  isCurrentProfile: boolean;
}

export const ProfileActions = ({
  navigation,
  profile,
  isCurrentProfile,
}: ProfileActionsProps) => {
  // const {openpeepsApi} = useOpenpeeps();
  // const {data:serverInfo} = openpeepsApi.useServerInfo;
  const { clearMembers, setContt, setMember } = useNewConversationStore();
  const reportProfileModalRef = useRef<BottomSheetModal>(null);
  const { t } = useTranslation();

  const shareContent = async () => {
    try {
      const result = await ShareApi.share({
        message: `${BASE_URL}@${profile.handle}`,
        title: t('common.actions.shareProfile', { handle: profile.handle }),
      });
      if (result.action === ShareApi.sharedAction) {
      } else if (result.action === ShareApi.dismissedAction) {
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleReportProfileModalPress = useCallback(() => {
    reportProfileModalRef.current?.present();
  }, []);
  return (
    <View className="flex flex-row justify-end gap-x-3 mt-2 pr-2">
      {!isCurrentProfile && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size={'icon'} variant={'outline'}>
                <MoreHorizontalIcon size={16} className="text-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className=" mt-1">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onPress={() => {
                    Clipboard.setString(`${BASE_URL}@${profile.handle}`);
                  }}
                  className=" flex-row gap-x-2 items-center">
                  <LinkIcon className="text-foreground" />
                  <ThemedText>
                    {t('profile.actions.copyProfileLink')}
                  </ThemedText>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className=" flex-row gap-x-2 items-center"
                  onPress={shareContent}>
                  <ShareIcon className="text-foreground" />
                  <ThemedText>{t('common.actions.shareProfile')}</ThemedText>
                </DropdownMenuItem>
                <DropdownMenuItem className=" flex-row gap-x-2 items-center">
                  <BanIcon className="text-foreground" />
                  <ThemedText>
                    {t('common.actions.blockProfile', { handle: profile.handle })}
                  </ThemedText>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onPress={handleReportProfileModalPress}
                  className=" flex-row gap-x-2 items-center text-destructive">
                  <FlagIcon className="text-destructive" />
                  <ThemedText className="text-destructive">
                    {t('common.actions.reportProfile', {
                      handle: profile.handle,
                    })}
                  </ThemedText>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size={'icon'} variant={'outline'}>
            <BellIcon size={16} className="text-foreground" />
          </Button>
          <Button
            onPress={() => {
              clearMembers();
              setContt('');
              setMember(profile);
              navigation.navigate('DraftMessage');
            }}
            size={'icon'}
            variant={'outline'}>
            <MessageSquareIcon size={16} className="text-foreground" />
          </Button>
          <FollowUnfollowButton profile={profile} />
        </>
      )}
      {isCurrentProfile && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size={'icon'} variant={'outline'}>
                <MoreHorizontalIcon size={16} className="text-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className=" mt-1">
              <DropdownMenuGroup>
                <DropdownMenuItem className=" flex-row gap-x-2 items-center">
                  <LinkIcon className="text-foreground" />
                  <ThemedText>{t('profile.actions.inviteViaLink')}</ThemedText>
                </DropdownMenuItem>
                <DropdownMenuItem className=" flex-row gap-x-2 items-center">
                  <MailIcon className="text-foreground" />
                  <ThemedText>{t('profile.actions.inviteViaEmail')}</ThemedText>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant={'outline'}
            onPress={() => {
              navigation.navigate('EditProfile', {
                handle: profile.handle,
              });
            }}>
            <ThemedText>{t('profile.actions.edit')}</ThemedText>
          </Button>
        </>
      )}
      <ReportProfileOrPostSheet
        ref={reportProfileModalRef}
        profile={profile}
        reportType="profile"
      />
    </View>
  );
};
