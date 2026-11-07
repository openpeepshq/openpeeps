import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AUTH_ROUTES,
  AuthStackParamList,
  MAIN_ROUTES,
  ROOT_ROUTES,
  RootStackParamList,
} from '../../components/navigation/types/index';
import { Button } from '../../components/ui/button';
import { ThemedText } from '../../components/ui/themed-text';
import { Image } from 'react-native';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CompositeScreenProps } from '@react-navigation/native';

type SuccessScreenProps = CompositeScreenProps<
  NativeStackScreenProps<AuthStackParamList, 'Success'>,
  NativeStackScreenProps<RootStackParamList>
>;

export const Success: React.FC<SuccessScreenProps> = ({
  navigation: { replace, navigate },
  route,
}) => {
  const { type } = route.params;
  const { t } = useTranslation();

  const renderContent = () => {
    switch (type) {
      case 'signup':
        return (
          <View className="w-full bg-background p-2 flex-1 items-center">
            <View className="mb-4 p-5 w-full flex-1 bg-alpha justify-center items-center rounded-md">
              <View className="space-y-4 items-center bg-transparent">
                <Image
                  source={require('../../assets/images/success.webp')}
                  className="rounded-md object-bottom"
                  resizeMode="cover"
                />
                <ThemedText className="text-xl text-center text-muted-foreground my-10">
                  {t('auth.register.success')}{' '}
                  {t('auth.register.verificationReminder')}
                </ThemedText>
              </View>
              <View className="w-full gap-7 flex items-center">
                <Button
                  variant={'secondary'}
                  onPress={() => {
                    replace(ROOT_ROUTES.MAIN, {
                      screen: MAIN_ROUTES.TABS,
                      params: {
                        screen: 'Onboarding',
                      },
                    });
                  }}
                  className="w-full py-4 rounded-lg"
                >
                  <ThemedText className="font-medium text-base">
                    {t('auth.register.welcome')}
                  </ThemedText>
                </Button>
              </View>
            </View>
          </View>
        );

      case 'password-reset':
        return (
          <>
            <View className="space-y-4 items-center bg-transparent">
              <Image
                source={require('../../assets/images/success.webp')}
                className="rounded-md object-bottom"
                resizeMode="cover"
              />
              <ThemedText className="text-xl text-center  my-10">
                {t('auth.resetPassword.done')}
              </ThemedText>
            </View>
            <View className="w-full gap-7 flex items-center">
              <Button
                onPress={() => navigate(AUTH_ROUTES.LOGIN)}
                className="w-full py-4 rounded-lg"
              >
                <ThemedText className="font-medium text-base">
                  {t('auth.resetPassword.goToLogin')}
                </ThemedText>
              </Button>
            </View>
          </>
        );
      default:
        return null;
    }
  };
  return renderContent();
};
