import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  registerRequestSchema,
  type RegisterRequest,
} from '@openpeepshq/common';
import {
  calculatePasswordStrength,
  getStrengthMessage,
  useRegisterAccount,
  useServerInfo,
} from '@openpeepshq/react';
import { EyeOffIcon, EyeOnIcon } from '~/components/icons';
import { AUTH_ROUTES, AuthStackParamList } from '~/components/navigation/types';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import { Form, FormField, FormInput } from '~/components/ui/form';
import { ThemedText } from '~/components/ui/themed-text';

const INVITE_INACTIVE_MESSAGES = new Set([
  'auth.register.inviteInactive',
  'Max Uses Reached',
  'Invalid Invite Code',
]);

const buildRegisterFormSchema = (t: TFunction) =>
  registerRequestSchema
    .refine((d) => d.password === d.confirmPassword, {
      message: t('auth.register.passwordsDoNotMatch'),
      path: ['confirmPassword'],
    })
    .refine((d) => d.privacyPolicyAccepted, {
      message: t('auth.register.mustAgreePrivacyPolicy'),
      path: ['privacyPolicyAccepted'],
    });

const registerErrorCopy = (raw: string, t: TFunction) =>
  INVITE_INACTIVE_MESSAGES.has(raw)
    ? t('auth.register.inviteInactive')
    : t(raw);

type RegisterProps = NativeStackScreenProps<
  AuthStackParamList,
  'Signup' | 'SignupInvitation'
> & { invite?: boolean };

export const Register = ({
  navigation,
  route,
  invite = false,
}: RegisterProps) => {
  const { t } = useTranslation();
  const { register } = useRegisterAccount();
  const serverInfo = useServerInfo();
  const registerFormSchema = useMemo(() => buildRegisterFormSchema(t), [t]);

  const form = useForm<RegisterRequest>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: '',
      handle: '',
      displayName: '',
      password: '',
      privacyPolicyAccepted: false,
      confirmPassword: '',
    },
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inviteCode = route.params?.inviteCode;
  useEffect(() => {
    if (inviteCode) form.setValue('inviteCode', inviteCode);
  }, [inviteCode, form]);

  // Invited sign-ups stay open even when public registration is closed.
  const registrationOpen =
    serverInfo.communityConfig?.settings?.openRegistrations;
  useEffect(() => {
    if (!invite && registrationOpen === false) {
      navigation.replace(AUTH_ROUTES.LOGIN);
    }
  }, [invite, registrationOpen, navigation]);

  const privacyPolicyLink =
    serverInfo.communityConfig?.info?.privacyPolicy || '/docs/privacy';

  const password = form.watch('password');
  const confirmPassword = form.watch('confirmPassword');

  const onSubmit = form.handleSubmit(async (data) => {
    setError(null);
    try {
      await register(data);
      navigation.navigate(AUTH_ROUTES.SUCCESS, { type: 'signup' });
    } catch (err) {
      setError(registerErrorCopy((err as Error).message, t));
    }
  });

  return (
    <Form {...form}>
      <View className="gap-3">
        <ThemedText className="text-xl">
          {t('auth.register.createAccount')}
        </ThemedText>

        {invite ? (
          <ThemedText className="my-2">
            {t('auth.register.inviteMessage', {
              communityName: serverInfo.communityConfig?.info?.name,
            })}
          </ThemedText>
        ) : null}

        <FormField
          control={form.control}
          name="handle"
          render={({ field }) => (
            <FormInput
              label={t('auth.register.handle')}
              placeholder={t('auth.register.handlePlaceholder')}
              autoCapitalize="none"
              {...field}
            />
          )}
        />
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormInput
              label={t('auth.register.name')}
              placeholder={t('auth.register.namePlaceholder')}
              {...field}
            />
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormInput
              label={t('auth.register.email')}
              placeholder={t('auth.register.emailPlaceholder')}
              autoCapitalize="none"
              keyboardType="email-address"
              {...field}
            />
          )}
        />
        <View className="relative">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormInput
                label={t('auth.register.password')}
                placeholder=""
                secureTextEntry={!showPassword}
                autoComplete="password-new"
                {...field}
              />
            )}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              showPassword
                ? t('auth.register.hidePassword')
                : t('auth.register.showPassword')
            }
            className="absolute right-2 top-9"
            onPress={() => setShowPassword((v) => !v)}
          >
            {showPassword ? (
              <EyeOffIcon size={20} className="text-foreground" />
            ) : (
              <EyeOnIcon size={20} className="text-foreground" />
            )}
          </Pressable>
        </View>
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormInput
              label={t('auth.register.confirmPassword')}
              placeholder=""
              secureTextEntry
              {...field}
            />
          )}
        />

        {(password ?? '').length > 0 && (confirmPassword ?? '').length === 0 ? (
          <View className="w-full items-center rounded border border-border py-2">
            <ThemedText>
              {getStrengthMessage(calculatePasswordStrength(password))}
            </ThemedText>
          </View>
        ) : null}

        <FormField
          control={form.control}
          name="privacyPolicyAccepted"
          render={({ field, fieldState }) => (
            <View className="gap-1">
              <View className="flex-row items-center gap-2">
                <Checkbox
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                />
                <ThemedText className="flex-1">
                  {t('auth.register.privacyPolicyAgreement')}{' '}
                  <ThemedText
                    className="text-sm text-primary underline"
                    onPress={() => void Linking.openURL(privacyPolicyLink)}
                  >
                    {t('auth.register.privacyPolicy')}
                  </ThemedText>
                </ThemedText>
              </View>
              {fieldState.error ? (
                <ThemedText className="text-sm text-destructive">
                  {fieldState.error.message}
                </ThemedText>
              ) : null}
            </View>
          )}
        />

        {error ? (
          <ThemedText className="text-sm text-destructive">{error}</ThemedText>
        ) : null}

        <Button
          onPress={() => void onSubmit()}
          disabled={form.formState.isSubmitting}
          className="w-full"
        >
          <ThemedText className="font-medium">
            {form.formState.isSubmitting
              ? t('auth.register.loading')
              : t('auth.register.signUp')}
          </ThemedText>
        </Button>

        <View className="flex-row justify-center pt-1">
          <ThemedText>
            {t('auth.register.alreadyHaveAccount')}{' '}
            <ThemedText
              className="text-sm text-primary underline"
              onPress={() => navigation.navigate(AUTH_ROUTES.LOGIN)}
            >
              {t('auth.register.signIn')}
            </ThemedText>
          </ThemedText>
        </View>
      </View>
    </Form>
  );
};
