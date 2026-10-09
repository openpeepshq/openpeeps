import React from 'react';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  canCreatePost,
  type GroupWithMeta,
  type ProfileWithMeta,
  type VisibilityType,
} from '@openpeepshq/common';
import { getNewPostStores, useAuthData } from '@openpeepshq/react';
import { PlusIcon } from '../icons/index';
import { MainStackParamList } from '../navigation/types/index';

export interface NewEventButtonProps {
  visibility: VisibilityType;
  currentProfile?: ProfileWithMeta;
  group?: GroupWithMeta;
}

/** Floating action button — the native stand-in for the web layout plus button. */
export const NewEventButton = ({
  visibility,
  currentProfile,
  group,
}: NewEventButtonProps) => {
  const { t } = useTranslation();
  const authData = useAuthData();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const profile = currentProfile ?? authData.profile;
  const canPost =
    !!profile && canCreatePost(authData, 'event', visibility, group);

  if (!canPost) return null;

  const openNewEvent = () => {
    const stores = getNewPostStores();
    stores.event = { ...stores.event, visibility, groupId: group?.id };
    navigation.navigate('NewEvent');
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('events.form.title')}
      onPress={openNewEvent}
      className="absolute bottom-10 right-6 z-20 size-16 items-center justify-center rounded-full bg-foreground"
    >
      <PlusIcon size={24} className="text-background" />
    </Pressable>
  );
};
