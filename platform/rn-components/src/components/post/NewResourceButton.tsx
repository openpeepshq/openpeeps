import { useMemo } from 'react';
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
import { useSetPlusButtonActions } from '../layout';
import { MainStackParamList } from '../navigation/types';

export interface NewResourceButtonProps {
  visibility: VisibilityType;
  currentProfile?: ProfileWithMeta;
  group?: GroupWithMeta;
}

/** Registers the RootLayout plus button for creating a resource. */
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

  const plusActions = useMemo(
    () =>
      canPost
        ? {
            title: t('resources.new', { defaultValue: 'New resource' }),
            action: () => {
              const stores = getNewPostStores();
              stores.resource = {
                ...stores.resource,
                visibility,
                groupId: group?.id,
              };
              navigation.navigate('NewResource');
            },
          }
        : undefined,
    [canPost, group?.id, navigation, t, visibility]
  );

  useSetPlusButtonActions(plusActions);
  return null;
};
