import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AuthStackParamList,
  AUTH_ROUTES,
} from '../../components/navigation/types/index';
import { Button } from '../../components/ui/button';
import { ThemedText } from '../../components/ui/themed-text';
import { Form, FormField, FormInput } from '../../components/ui/form';
import { loginRequestSchema, type LoginRequest } from '@openpeepshq/common';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ActivityIndicator,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  useOpenpeeps,
  usePasswordLogin,
  useServerInfo,
} from '@openpeepshq/react';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { LOGIN_EMAIL, LOGIN_PASSWORD } from '../../lib/constants';

export const Login = ({
  navigation: { navigate },
}: NativeStackScreenProps<AuthStackParamList, 'Login'>) => {
  const { t } = useTranslation();
  const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);
  const { login, submitting } = usePasswordLogin();
  const { openpeepsApi } = useOpenpeeps();
  const logout = openpeepsApi.logoutAction();
  const isRegistrationOpen =
    !!useServerInfo().communityConfig?.settings?.openRegistrations;

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: {
      email: LOGIN_EMAIL ?? '',
      password: LOGIN_PASSWORD ?? '',
    },
  });

  const onSubmit = async (values: LoginRequest) => {
    try {
      // Drop any stale session cache before switching accounts.
      await logout();
      await login(values);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('auth.login.error', { defaultValue: 'Error' }),
        text2: (err as Error).message,
      });
    }
  };
  return (
    <Form {...form}>
      <View className="gap-7">
        <View className="relative w-full">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormInput
                label={t('auth.login.email')}
                placeholder=""
                {...field}
                className="rounded-md"
                autoCapitalize="none"
                textContentType="username"
              />
            )}
          />
        </View>
        <View className="relative w-full">
          <Button
            variant="link"
            className="absolute -top-3 -right-2 z-10"
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            <ThemedText className="text-sm text-muted-foreground">
              {isPasswordVisible
                ? t('auth.login.hidePassword')
                : t('auth.login.showPassword')}
            </ThemedText>
          </Button>
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormInput
                label={t('auth.login.password')}
                placeholder=""
                secureTextEntry={!isPasswordVisible}
                autoComplete="password"
                {...field}
                className="rounded-md"
                textContentType="password"
              />
            )}
          />
          <View className="w-full items-start">
            <Button
              variant="link"
              className="-mt-1 pr-0 native:px-1"
              onPress={() => navigate(AUTH_ROUTES.FORGOT_PASSWORD)}
            >
              <ThemedText className="native:text-base underline text-primary">
                {t('auth.login.forgotPassword')}
              </ThemedText>
            </Button>
          </View>
        </View>
        <View>
          <View className="w-full flex items-center">
            <Button
              onPress={form.handleSubmit(onSubmit)}
              disabled={submitting}
              className="w-full py-4 mb-10 flex-row rounded-lg"
            >
              {submitting && (
                <ActivityIndicator className="mr-2" size={'small'} />
              )}
              <ThemedText className="font-medium text-base">
                {t('auth.login.logIn')}
              </ThemedText>
            </Button>
          </View>
          {isRegistrationOpen && (
            <ThemedText className="text-lg -mt-2 mb-2 text-muted-foreground tracking-wider ">
              <TouchableWithoutFeedback
                onPress={() => navigate(AUTH_ROUTES.SIGNUP)}
                className="inline-flex items-center "
              >
                <ThemedText className=" text-lg underline">
                  {t('auth.login.joinCommunity')}
                </ThemedText>
              </TouchableWithoutFeedback>
            </ThemedText>
          )}
        </View>
      </View>
    </Form>
  );
};
