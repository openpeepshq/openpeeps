import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOpenpeeps } from '@openpeepshq/react';
import {
  AUTH_ROUTES,
  AuthStackParamList,
} from '../../components/navigation/types/index';
import { ThemedText } from '../../components/ui/themed-text';

/**
 * Handles the `validate-email?token=...` email link. Calls the backend
 * validation endpoint and, on success, sends the user on with a toast.
 */
export const ValidateEmail = ({
  navigation,
  route,
}: NativeStackScreenProps<AuthStackParamList, 'ValidateEmail'>) => {
  const { t } = useTranslation();
  const { client, queryClient } = useOpenpeeps();
  const [failed, setFailed] = useState(false);
  const ranRef = useRef(false);
  const token = route.params?.token;

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const fail = () => {
      setFailed(true);
      Toast.show({ type: 'error', text1: t('auth.emails.validation.error') });
    };

    if (!token) {
      fail();
      return;
    }

    void (async () => {
      try {
        const result = await client.auth.validateEmail({
          queryParameters: { token },
        });
        if ('error' in result) throw new Error('validation failed');
        await queryClient.invalidateQueries({ queryKey: ['accounts'] });
        await queryClient.invalidateQueries({
          queryKey: ['profiles', 'current'],
        });
        Toast.show({
          type: 'success',
          text1: t('auth.emails.validation.success'),
        });
        navigation.replace(AUTH_ROUTES.LOGIN);
      } catch {
        fail();
      }
    })();
  }, [token, navigation, t, client, queryClient]);

  return (
    <View className="items-center justify-center gap-y-4 p-4">
      {failed ? (
        <>
          <ThemedText className="text-lg font-bold">
            {t('auth.emails.validation.errorHeading')}
          </ThemedText>
          <ThemedText className="text-center">
            {t('auth.emails.validation.error')}
          </ThemedText>
        </>
      ) : (
        <ThemedText className="text-center">
          {t('auth.emails.validation.loading')}
        </ThemedText>
      )}
    </View>
  );
};
