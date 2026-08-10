import React from 'react';
import { Drawer } from 'react-native-drawer-layout';
import { useDrawer } from '~/contexts/drawer-context';
import { useOpenpeeps } from '@openpeepshq/react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from './types';
import { SideMenu } from '../custom/navigation/side-menu';
import { buildGoto } from './helpers';
import { registerMessageHandler } from '~/lib/push-notifications';
import type { GotoHandlerParams } from '~/types/goto';

interface SideMenuDrawerProps {
  children: React.ReactNode;
}

export const SideMenuDrawer = ({ children }: SideMenuDrawerProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { isOpen, openDrawer, closeDrawer } = useDrawer();
  const { currentProfile } = useOpenpeeps();

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
    closeDrawer();
    goto({ target, params });
  };

  const handleNewPost = () => {
    closeDrawer();
    goto({ target: 'newPost' });
  };

  const onNotificationPress = () => {
    closeDrawer();
    goto({ target: 'notifications' });
  };

  const onProfilePress = () => {
    closeDrawer();
    goto({
      target: 'profile',
      params: { handle: currentProfile?.handle as string },
    });
  };

  return (
    <Drawer
      open={isOpen}
      onOpen={openDrawer}
      onClose={closeDrawer}
      renderDrawerContent={() => {
        return (
          <SideMenu
            handleNavigation={handleNavigation}
            onNotificationPress={onNotificationPress}
            close={closeDrawer}
            handleNewPost={handleNewPost}
            onProfilePress={onProfilePress}
          />
        );
      }}>
      {children}
    </Drawer>
  );
};
