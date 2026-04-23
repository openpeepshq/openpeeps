import React from 'react';
import { useOpenpeeps } from '@openpeeps/react';
import { ImageBackground, View } from 'react-native';
import { SideMenu } from '../custom/navigation/side-menu';
import { useNavigation } from '@react-navigation/native';
import { MainStackParamList } from './types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { buildGoto } from './helpers';
import { registerMessageHandler } from '../../lib/push-notifications';
import type { GotoHandlerParams } from '../../types/goto';

export const MenuWrapper = ({ children }: { children: React.ReactNode }) => {
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const { data: serverInfo, isLoading } = openpeepsApi.useServerInfo();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const goto = buildGoto(navigation);

  React.useEffect(() => {
    registerMessageHandler(navigation);
  }, [navigation]);


  const handleNavigation = ({
    target,
    params,
  }: {
    target: string;
    params?: GotoHandlerParams;
  }) => {
    goto({ target, params });
  };

  const handleNewPost = () => {
    goto({ target: 'newPost' });
  };

  const onNotificationPress = () => {
    goto({ target: 'notifications' });
  };

  const onProfilePress = () => {
    goto({
      target: 'profile',
      params: { handle: currentProfile?.handle as string },
    });
  };

  return (
    <ImageBackground
      source={
        serverInfo?.communityConfig.theme.background && !isLoading
          ? {
            uri: serverInfo?.communityConfig.theme.background,
          }
          : require('../../assets/images/black-ambition-2025-hero.png')
      }
      className="w-screen h-screen flex justify-center items-center">
      <View className="max-w-[892px] bg-background flex flex-row h-full px-2">
        <View>
          <SideMenu
            handleNavigation={handleNavigation}
            onNotificationPress={onNotificationPress}
            onProfilePress={onProfilePress}
            handleNewPost={handleNewPost}
          />
        </View>
        <View className="flex-grow flex-1">{children}</View>
      </View>
    </ImageBackground>
  );
};
