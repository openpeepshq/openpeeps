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
import { MainStackParamList } from '../navigation/types/index';

export interface NewEventButtonProps {
  visibility: VisibilityType;
  currentProfile?: ProfileWithMeta;
  group?: GroupWithMeta;
  /** When false, only registers the floating plus button (no inline button). */
  showButton?: boolean;
  /** Optional custom navigation callback (replaces default screen navigation). */
  onNavigate?: () => void;
}

/** Registers the RootLayout plus button for creating an event. */
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

  const plusActions = useMemo(
    () =>
      canPost
        ? {
            title: t('events.form.title'),
            action: () => {
              const stores = getNewPostStores();
              stores.event = {
                ...stores.event,
                visibility,
                groupId: group?.id,
              };
              navigation.navigate('NewEvent');
            },
          }
        : undefined,
    [canPost, group?.id, navigation, t, visibility]
  );

  useSetPlusButtonActions(plusActions);
  return null;
};
