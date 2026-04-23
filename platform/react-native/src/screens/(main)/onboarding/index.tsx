import React, { useCallback, useMemo } from 'react';
import { ThemedView } from '../../../components/ui/themed-view';
import { ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useOpenpeeps } from '@openpeeps/react';
import { OpenPeepsMarkdown, TabScreensHeader } from '../../../components/custom';
import {
  UserCheckIcon,
  MailCheckIcon,
  SquareUserRoundIcon,
  PencilIcon,
  ChevronRightIcon,
  CheckIcon,
  LucideIcon,
} from 'lucide-react-native';
import { ThemedText } from '../../../components/ui/themed-text';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  MainStackParamList,
  TabStackParamList,
} from '../../../components/navigation/types';
import { useNavigation, type NavigatorScreenParams } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

type AccountSetupChecklistItem = {
  Icon: LucideIcon;
  key: string;
  label: string;
  completed?: boolean;
  action?: () => void;
  route?: string;
  loading?: boolean;
  params?: {
    screen: string;
  };
};

export const Onboarding = () => {
  const { openpeepsApi, currentProfile, currentAccount } = useOpenpeeps();
  const { t } = useTranslation();
  const { data: serverInfo, isLoading } = openpeepsApi.useServerInfo();
  const {
    data: posts,
    isLoading: isPostLoading,
  } = openpeepsApi.usePostsByProfile(currentProfile?.id || '', { limit: 1 });
  const verifyEmail = openpeepsApi.validationEmailAction();

  const handleRequestVerificationEmail = useCallback(() => {
    verifyEmail()
      .then(res =>
        Toast.show({
          type: res.success ? 'success' : 'error',
          text2: res.success
            ? 'Verification email sent'
            : 'Failed to send verification email',
        }),
      );
  }, [verifyEmail]);

  const isEmailVerified = useMemo(() => currentAccount?.emailValidated || false, [currentAccount]);
  const isProfileDetailsCompleted = useMemo(() => !!currentProfile?.avatar && !!currentProfile?.bio && !!currentProfile?.header, [currentProfile]);
  const isFirstPostCompleted = useMemo(() => (posts?.pages.flat().length ?? 0) > 0, [posts]);
  const isConnectedWithOthers = useMemo(() => (currentProfile?.following?.length ?? 0) > 0, [currentProfile]);


  const accountSetupChecklist = useMemo<
    AccountSetupChecklistItem[]
  >(() => [
    {
      Icon: MailCheckIcon,
      label: 'Verify your email address',
      key: 'verify-email',
      action: handleRequestVerificationEmail,
      completed: isEmailVerified,
    },
    {
      Icon: SquareUserRoundIcon,
      label: 'Add profile details',
      key: 'profile-details',
      route: 'EditProfile',
      completed: isProfileDetailsCompleted,
    },
    {
      Icon: PencilIcon,
      label: 'Make first post',
      key: 'make-post',
      route: 'TabNavigator',
      params: { screen: 'NewPost' },
      completed: isFirstPostCompleted,
      loading: isPostLoading,
    },
    {
      Icon: UserCheckIcon,
      label: 'Connect with others',
      key: 'connect-with-others',
      route: 'TabNavigator',
      params: { screen: 'Directory' },
      completed: isConnectedWithOthers,
    },
  ], [isEmailVerified, isProfileDetailsCompleted, isFirstPostCompleted, isConnectedWithOthers, handleRequestVerificationEmail, isPostLoading]);

  return (
    <ThemedView className="flex-1">
      <TabScreensHeader
        children={
          <ThemedText className="text-2xl font-semibold">
            {t('navigation.welcome')}
          </ThemedText>
          }
      />
      <ScrollView className="p-4 w-full">
        {isLoading && <ActivityIndicator size={'small'} />}
        <ThemedView className="w-full mt-2">
          <ThemedText className="text-3xl font-bold mb-2">
            Welcome to {serverInfo?.communityConfig.info.name}
          </ThemedText>
          <OpenPeepsMarkdown
            source={serverInfo?.communityConfig.content.welcomePage || ''}
          />
        </ThemedView>
        <ThemedText className="text-3xl font-bold my-4">
          Complete account setup
        </ThemedText>
        {accountSetupChecklist.map(item => (
          <ChecklistItem {...item} />
        ))}
      </ScrollView>
    </ThemedView>
  );
};

export const ChecklistItem = ({
  Icon,
  label,
  completed,
  route,
  params,
  action,
  loading,
}: AccountSetupChecklistItem) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  /* eslint-disable @typescript-eslint/no-shadow */
  const { currentProfile } = useOpenpeeps();

  const handleNavigation = ({
    route,
    params,
  }: Pick<AccountSetupChecklistItem, 'route' | 'params'>) => {
    if (route === 'TabNavigator' && params && 'screen' in params) {
      const screen = params.screen as keyof TabStackParamList;
      navigation.navigate(
        'TabNavigator',
        { screen } as NavigatorScreenParams<TabStackParamList>,
      );
    } else if (route === 'EditProfile' && currentProfile?.handle) {
      navigation.navigate('EditProfile', { handle: currentProfile.handle });
    }
  };
  return (
    <TouchableOpacity
      disabled={loading}
      onPress={() => {
        if (action) {
          action();
        } else {
          handleNavigation({
            route: route,
            params: params,
          });
        }
      }}
      className="flex px-1 bg-secondary/10 flex-row justify-between items-center w-full py-4 rounded-md mb-2">
      <ThemedView className=" flex p-4 items-center justify-center rounded-full bg-background">
        <Icon size={20} className="text-foreground p-3" />
      </ThemedView>
      <ThemedText className="flex-1 ml-4 text-lg">{label}</ThemedText>
      {!loading ? (
        <>
          {completed ? (
            <ThemedView className="flex items-center justify-center bg-secondary-foreground rounded-full  p-2">
              <CheckIcon className="text-background" />
            </ThemedView>
          ) : (
            <ThemedView className="flex items-center justify-center  p-2">
              <ChevronRightIcon className="text-foreground" />
            </ThemedView>
          )}
        </>
      ) : (
        <ActivityIndicator />
      )}
    </TouchableOpacity>
  );
};
