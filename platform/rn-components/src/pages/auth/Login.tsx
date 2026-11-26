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
  useCredentialsStore,
  useOpenpeeps,
  usePasswordLogin,
  useServerInfo,
} from '@openpeepshq/react';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { unregisterPushForLogout } from '../../lib/push-notifications';
import { isSupersededLogin, loginInBrowser } from '../../lib/oauthLogin';
import {
  BASE_URL,
  LOGIN_EMAIL,
  LOGIN_PASSWORD,
  OAUTH_CLIENT_ID,
  OAUTH_REDIRECT_URI,
} from '../../lib/constants';

export const Login = ({
  navigation: { navigate },
}: NativeStackScreenProps<AuthStackParamList, 'Login'>) => {
  const { t } = useTranslation();
  const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);
  const { login, submitting } = usePasswordLogin();
  const { openpeepsApi, client } = useOpenpeeps();
  const logout = openpeepsApi.logoutAction();
  const { credentialsStore } = useCredentialsStore();
  const browserLogin =
    OAUTH_CLIENT_ID && OAUTH_REDIRECT_URI
      ? { clientId: OAUTH_CLIENT_ID, redirectUri: OAUTH_REDIRECT_URI }
      : undefined;
  const isRegistrationOpen =
    !!useServerInfo().communityConfig?.settings?.openRegistrations;

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: {
      email: LOGIN_EMAIL ?? '',
      password: LOGIN_PASSWORD ?? '',
    },
  });

  const endPreviousSession = async () => {
    // Best-effort cleanup (never throws); clears stale subscriptions from
    // any previous session before switching accounts. The RN side owns FCM
    // cleanup, so this outcome — not the web pushCleanup flag — is what the
    // logout toast reflects on native.
    const pushResult = await unregisterPushForLogout(client);
    await logout();
    if (pushResult === 'failed') {
      Toast.show({
        type: 'error',
        text1: t('settings.notifications.pushCleanupFailed', {
          defaultValue: 'Could not remove push notifications for this device.',
        }),
      });
    }
  };

  const onSubmit = async (values: LoginRequest) => {
    try {
      await endPreviousSession();
      await login(values);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('auth.login.error', { defaultValue: 'Error' }),
        text2: (err as Error).message,
      });
    }
  };

  const onBrowserLogin = async () => {
    if (!browserLogin) return;
    try {
      const credentials = await loginInBrowser({
        serverUrl: BASE_URL ?? '',
        ...browserLogin,
      });
      await endPreviousSession();
      await credentialsStore.set(credentials);
    } catch (err) {
      if (isSupersededLogin(err)) return;
      Toast.show({
        type: 'error',
        text1: t('auth.login.browserError'),
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
                label={t('common.labels.email')}
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
              className={`w-full py-4 flex-row rounded-lg ${browserLogin ? 'mb-4' : 'mb-10'}`}
            >
              {submitting && (
                <ActivityIndicator className="mr-2" size={'small'} />
              )}
              <ThemedText className="font-medium text-base">
                {t('auth.login.logIn')}
              </ThemedText>
            </Button>
            {browserLogin && (
              <Button
                variant="outline"
                onPress={onBrowserLogin}
                className="w-full py-4 mb-10 rounded-lg"
              >
                <ThemedText className="font-medium text-base">
                  {t('auth.login.continueInBrowser')}
                </ThemedText>
              </Button>
            )}
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
