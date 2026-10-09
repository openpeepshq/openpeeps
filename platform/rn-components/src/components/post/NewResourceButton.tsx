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
import { PlusIcon } from '~/components/icons';
import { MainStackParamList } from '~/components/navigation/types';

export interface NewResourceButtonProps {
  visibility: VisibilityType;
  currentProfile?: ProfileWithMeta;
  group?: GroupWithMeta;
}

export const NewResourceButton = ({
  visibility,
  currentProfile,
  group,
}: NewResourceButtonProps) => {
  const { t } = useTranslation();
  const authData = useAuthData();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const profile = currentProfile ?? authData.profile;
  const canPost =
    !!profile && canCreatePost(authData, 'resource', visibility, group);

  if (!canPost) return null;

  const openNew = () => {
    const stores = getNewPostStores();
    stores.resource = { ...stores.resource, visibility, groupId: group?.id };
    navigation.navigate('NewResource');
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('resources.new')}
      onPress={openNew}
      className="absolute bottom-10 right-6 z-20 size-16 items-center justify-center rounded-full bg-foreground"
    >
      <PlusIcon className="text-background" size={28} />
    </Pressable>
  );
};
