import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AUTH_ROUTES,
  AuthStackParamList,
} from '../../components/navigation/types/index';
import { Button } from '../../components/ui/button';
import { ThemedText } from '../../components/ui/themed-text';
import { TouchableWithoutFeedback } from 'react-native';
import { View } from 'react-native';
import { useOpenpeeps } from '@openpeepshq/react';
import { useTranslation } from 'react-i18next';

export const AuthWelcome = ({
  navigation: { navigate },
}: NativeStackScreenProps<AuthStackParamList, 'Welcome'>) => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const { data: server, isLoading } = openpeepsApi.useServerInfo();

  const isRegistrationOpen =
    !!server?.communityConfig?.settings?.openRegistrations;

  return (
    <View className="w-full flex-1 flex justify-center items-center">
      <View className="space-y-4 bg-transparent">
        <ThemedText className="text-xl mt-4">
          {server?.communityConfig?.info?.tagLine ?? ''}
        </ThemedText>
      </View>
      {!isLoading && (
        <View className="w-full flex mt-8  items-center">
          <Button
            onPress={() => {
              isRegistrationOpen
                ? navigate(AUTH_ROUTES.SIGNUP)
                : navigate(AUTH_ROUTES.LOGIN);
            }}
            className="w-full py-4 rounded-lg"
          >
            <ThemedText className="font-medium text-base">
              {isRegistrationOpen
                ? t('auth.register.title')
                : t('auth.login.title')}
            </ThemedText>
          </Button>
          {isRegistrationOpen && (
            <ThemedText className="text-lg mt-5 w-full text-muted-foreground tracking-wider ">
              {t('auth.register.alreadyHaveAccount')}{' '}
              <TouchableWithoutFeedback
                onPress={() => navigate(AUTH_ROUTES.LOGIN)}
                className="inline-flex items-center "
              >
                <ThemedText className=" text-lg underline">
                  {t('auth.login.title')}
                </ThemedText>
              </TouchableWithoutFeedback>{' '}
            </ThemedText>
          )}
        </View>
      )}
    </View>
  );
};
