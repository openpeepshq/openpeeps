import type { TFunction } from 'i18next';
import {
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  type Permission,
} from 'react-native';

export type MediaPermissionType = 'photo' | 'video' | 'audio' | 'file';

const showPermissionAlert = (t: TFunction) => {
  Alert.alert(t('media.permissions.title'), t('media.permissions.message'), [
    { text: t('common.cancel'), style: 'cancel' },
    {
      text: t('media.permissions.openSettings'),
      onPress: () => Linking.openSettings(),
    },
  ]);
};

const scopedPermissions = (type: MediaPermissionType): Permission[] => {
  switch (type) {
    case 'photo':
      return [PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES];
    case 'video':
      return [PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO];
    case 'audio':
      return [PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO];
    default:
      return [];
  }
};

// Android only: API 33+ uses scoped media permissions, older versions need
// READ_EXTERNAL_STORAGE. iOS pickers request access themselves.
export const checkMediaPermissions = async (
  t: TFunction,
  type: MediaPermissionType
): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    if (Number(Platform.Version) >= 33) {
      const permissions = scopedPermissions(type);
      if (permissions.length === 0) {
        return true;
      }

      const statuses = await Promise.all(
        permissions.map((p) => PermissionsAndroid.check(p))
      );
      if (statuses.every(Boolean)) {
        return true;
      }

      const requestResults =
        await PermissionsAndroid.requestMultiple(permissions);
      const isGranted = Object.values(requestResults).every(
        (status) => status === PermissionsAndroid.RESULTS.GRANTED
      );
      if (!isGranted) {
        showPermissionAlert(t);
      }
      return isGranted;
    }

    const hasStorage = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
    );
    if (hasStorage) {
      return true;
    }

    const status = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
    );
    if (status === PermissionsAndroid.RESULTS.GRANTED) {
      return true;
    }

    showPermissionAlert(t);
    return false;
  } catch (err) {
    console.warn('Permission check error:', err);
    return false;
  }
};
