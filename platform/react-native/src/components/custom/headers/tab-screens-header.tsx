import React from 'react';
import {Image, View, ImageBackground, StatusBar, Platform} from 'react-native';

import {ThemedText} from '../../ui/themed-text';
import {Avatar, AvatarImage, AvatarFallback} from '../../ui/avatar';
import {Button} from '../../ui/button';
import {BellIcon} from '../../icons';
import {User} from 'lucide-react-native';
import {useDrawer} from '../../../contexts/drawer-context';
import {useOpenpeeps} from '@openpeeps/react';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAppImagesStore} from '../../../stores/useAppImagesStore';
import {SafeAreaView} from 'react-native-safe-area-context';
import {BASE_URL, isProduction} from '../../../lib/constants';
import {useWindowSize} from '../../../hooks';
import {ThemedSafeAreaView} from '../../ui/themed-safe-area-view';
import {TabStackParamList} from '../../navigation/types';
import {setAppBadgeCount} from '../../../lib/notification-helpers';

interface TabScreensHeaderProps {
  showIcons?: boolean;
  showVerification?: boolean;
  children?: React.ReactNode;
}

export const TabScreensHeader = ({
  showIcons = true,
  showVerification = false,
  children,
}: TabScreensHeaderProps) => {
  const {openDrawer} = useDrawer();

  const {isMediumScreenOrLarger} = useWindowSize();

  const {currentProfile, openpeepsApi} = useOpenpeeps();
  const {
    data: notificationsStats,
    isSuccess,
    refetch,
  } = openpeepsApi.useCurrentProfileNotificationStats();
  const navigation =
    useNavigation<NativeStackNavigationProp<TabStackParamList>>();
  const {background, logoSmall} = useAppImagesStore();
  const lastFetchRef = React.useRef<number>(0);

  const onNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  useFocusEffect(
    React.useCallback(() => {
      const MIN_REFRESH_INTERVAL_MS = 10_000;
      const now = Date.now();
      if (now - (lastFetchRef.current || 0) > MIN_REFRESH_INTERVAL_MS) {
        lastFetchRef.current = now;
        refetch();
      }
      return undefined;
    }, [refetch]),
  );

  React.useEffect(() => {
    setAppBadgeCount(notificationsStats?.unseen ?? 0);
    lastFetchRef.current = Date.now();
  }, [notificationsStats]);

  if (isMediumScreenOrLarger) {
    return (
      <ThemedSafeAreaView className="p-4 pb-6 pl-1">
        {children}
      </ThemedSafeAreaView>
    );
  }

  return (
    <>
      <ImageBackground
        resizeMode="cover"
        source={{
          uri: background!,
        }}
        style={{
          paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        }}
        className="pb-3 px-4">
        <SafeAreaView edges={['top']} className="">
          <View className="flex-row items-center justify-between  ">
            {!isProduction && (
              <View className="absolute w-full bg-white/50 z-10 top-0 p-2 rounded-lg">
                <ThemedText className="text-red-500 text-center">
                  Test Backend ({BASE_URL})
                </ThemedText>
              </View>
            )}
            <Button
              variant={'outline'}
              size={'icon'}
              onPress={() => {
                openDrawer();
              }}
              className="native:px-0 active:bg-none rounded-full bg-black">
              <Avatar
                alt={(currentProfile?.displayName as string) || 'Profile'}>
                {currentProfile?.avatar ? (
                  <AvatarImage source={{uri: currentProfile.avatar}} />
                ) : (
                  <AvatarFallback className="h-6 w-6 -bottom-2 -right-2 bg-black">
                    <User size={20} color="#a3a5aaff" />
                  </AvatarFallback>
                )}
              </Avatar>
            </Button>

            <Image
              source={{
                uri: logoSmall!,
              }}
              resizeMode="contain"
              className="w-[216px] h-[64px]"
            />
            {showIcons && (
              <Button
                variant={'outline'}
                size={'icon'}
                onPress={onNotificationPress}
                className="relative">
                <BellIcon className="text-muted-foreground" size={18} />
                {isSuccess && notificationsStats.unseen > 0 && (
                  <View className="absolute -top-3 -right-2 h-6 w-6 items-center rounded-full bg-foreground">
                    <ThemedText className="text-background text-xs">
                      {notificationsStats.unseen}
                    </ThemedText>
                  </View>
                )}
              </Button>
            )}
          </View>

          {children ? children : null}
          {showVerification && (
            <>
              <View className="mt-4">
                <Image
                  source={{
                    uri: logoSmall!,
                  }}
                  className=""
                  resizeMode="cover"
                />
              </View>
              <View className="mt-7 border border-input rounded-md p-4">
                <ThemedText className="text-xl leading-8 tracking-wider">
                  Your email is not yet verified. Tap “Get link” below to get
                  the verification link.
                </ThemedText>
                <View className="flex-row justify-end mt-5 gap-4">
                  <Button variant={'ghost'} onPress={onNotificationPress}>
                    <ThemedText> Remove</ThemedText>
                  </Button>
                  <Button onPress={onNotificationPress}>
                    <ThemedText>Get link</ThemedText>
                  </Button>
                </View>
              </View>
            </>
          )}
        </SafeAreaView>
      </ImageBackground>
    </>
  );
};
