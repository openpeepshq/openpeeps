import React from 'react';
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
import { PlusFab } from '../custom/common/plus-fab';
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
    <PlusFab accessibilityLabel={t('events.form.title')} onPress={openNewEvent}>
      <PlusIcon size={24} className="text-background" />
    </PlusFab>
  );
};
