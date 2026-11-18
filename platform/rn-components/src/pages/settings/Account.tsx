import { MainScreenProps } from '../../components/navigation/types/index';
import { useOpenpeeps, useAccountExport } from '@openpeepshq/react';
import { HeaderActionButton, useSetPageHeader } from '../../components/layout';
import React, { useCallback, useEffect, useState } from 'react';
import { ThemedText } from '../../components/ui/themed-text';
import { ThemedView } from '../../components/ui/themed-view';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormInput } from '../../components/ui/form';
import Toast from 'react-native-toast-message';
import { Button } from '../../components/ui/button';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Account } from '@openpeepshq/common';
import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { downloadDocument } from '../../lib/downloadFile';
import { unregisterPushForLogout } from '../../lib/push-notifications';

type AccountSettingsProps = MainScreenProps<'AccountSettings'>;

type AccountFormValues = {
  email: string;
  oldPassword: string;
  newPassword: string | undefined;
  confirmPassword: string | undefined;
};

export const AccountSettings: React.FC<AccountSettingsProps> = () => {
  const { openpeepsApi, queryClient, client } = useOpenpeeps();
  const { data: currentAccount } = openpeepsApi.useCurrentAccount();
  const logout = openpeepsApi.logoutAction();
  const [isOldPasswordVisible, setIsOldPasswordVisible] = React.useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = React.useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    React.useState(false);
  const updateCurrentAccount = openpeepsApi.updateCurrentAccountAction();
  const validateEmail = openpeepsApi.validationEmailAction();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { t } = useTranslation();

  // RN has no fetch/blob, so the shared hook's web download step is replaced
  // with an external handler. `download` must stay stable across renders:
  // the hook closes over it in its memoized run callback.
  const download = useCallback(
    async (url: string) => {
      const opened = await downloadDocument(url);
      if (!opened) {
        throw new Error(
          t('settings.account.exportDownloadFailed', {
            defaultValue:
              'No app was found to download the file. Please try again.',
          })
        );
      }
    },
    [t]
  );
  const { exporting, status, startExport } = useAccountExport({
    client,
    t,
    download,
  });

  // The hook reports export failures through its `status` (the web page
  // renders it as an inline toast); RN has no such surface, so mirror the
  // change to the imperative toast.
  useEffect(() => {
    if (!status) return;
    Toast.show({
      type: status.type,
      text1: status.message,
    });
  }, [status]);

  const form = useForm<AccountFormValues>({
    defaultValues: {
      email: (currentAccount as Account)?.email ?? '',
      oldPassword: '',
      newPassword: undefined,
      confirmPassword: undefined,
    },
  });

  const onSubmit = async (values: AccountFormValues) => {
    setIsSubmitting(true);
    const parsedValues: {
      email?: string | undefined;
      oldPassword: string;
      newPassword: string | undefined;
      confirmPassword: string | undefined;
    } = {
      email: values.email,
      oldPassword: values.oldPassword,
      newPassword: values.newPassword,
      confirmPassword: values.confirmPassword,
    };

    if (values.oldPassword === '') {
      Toast.show({
        type: 'error',
        text1: t('settings.account.updateError'),
        text2: t('settings.account.oldPasswordRequired'),
      });
      setIsSubmitting(false);
      return;
    }
    if (values.oldPassword === values.newPassword) {
      Toast.show({
        type: 'error',
        text1: t('settings.account.updateError'),
        text2: t('settings.account.samePasswordError'),
      });
      setIsSubmitting(false);
      return;
    }

    if (values.newPassword === '' || values.newPassword === ' ') {
      parsedValues.newPassword = undefined;
      parsedValues.confirmPassword = undefined;
    }

    if (
      values.newPassword !== '' &&
      values.newPassword === values.confirmPassword
    ) {
      Toast.show({
        type: 'error',
        text1: t('settings.account.updateError'),
        text2: t('settings.account.samePasswordError'),
      });
    }

    updateCurrentAccount(parsedValues)
      .then(async () => {
        Toast.show({
          type: 'success',
          text1: t('settings.account.updateSuccess'),
          text2: t('settings.account.updateSuccessMessage'),
        });
        await queryClient.invalidateQueries({
          queryKey: ['profile'],
        });
        // Best-effort cleanup (never throws); logout always follows. The RN
        // side owns FCM cleanup, so this outcome — not the web pushCleanup
        // flag — is what the logout toast reflects on native.
        const pushResult = await unregisterPushForLogout(client);
        await logout();
        if (pushResult === 'failed') {
          Toast.show({
            type: 'error',
            text1: t('settings.notifications.pushCleanupFailed', {
              defaultValue:
                'Could not remove push notifications for this device.',
            }),
          });
        }
      })
      .catch((err) => {
        console.log('response', err);
        Toast.show({
          type: 'error',
          text1: t('settings.account.updateError'),
          text2: err.message,
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };
  const handleVerifyEmail = async () => {
    setVerifying(true);
    try {
      await validateEmail();
      Toast.show({
        type: 'success',
        text1: t('settings.account.verifyEmailSent', {
          defaultValue: 'Verification email sent',
        }),
      });
    } catch {
      Toast.show({
        type: 'error',
        text1: t('settings.account.verifyEmailError', {
          defaultValue: 'Failed to send verification email',
        }),
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async () => {
    const values = form.getValues();
    await onSubmit(values);
  };

  useEffect(() => {
    form.setValue('email', (currentAccount as Account)?.email ?? '');
  }, [currentAccount, form]);

  useSetPageHeader(
    t('settings.account.title', { defaultValue: 'Account' }),
    <HeaderActionButton
      title={
        isSubmitting ? t('common.states.loading') : t('common.actions.save')
      }
      onPress={() => void handleSubmit()}
      disabled={isSubmitting}
      loading={isSubmitting}
    />
  );

  return (
    <ThemedView className="flex-1">
      <ThemedView className="flex-1">
        <KeyboardAwareScrollView
          contentContainerClassName="grow"
          className="w-full flex p-2"
        >
          <Form {...form}>
            {/* {isLoading && <ActivityIndicator size={'small'} />} */}

            <ThemedText className="text-lg text-muted-foreground">
              {t('settings.account.description')}
            </ThemedText>
            <ThemedView className=" gap-7 py-4 w-full  items-center rounded-md">
              <View className="relative w-full">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormInput
                      label={t('common.labels.email')}
                      placeholder={t('settings.account.emailPlaceholder')}
                      {...field}
                      value={field.value || ''}
                      className="rounded-md"
                      autoCapitalize="none"
                    />
                  )}
                />
              </View>
              {!(currentAccount as Account)?.emailValidated ? (
                <View className="w-full gap-y-2">
                  <ThemedText className="text-sm text-muted-foreground">
                    {t('settings.account.verifyEmailDescription')}
                  </ThemedText>
                  <Button
                    variant="outline"
                    onPress={() => void handleVerifyEmail()}
                    disabled={verifying}
                  >
                    {verifying ? (
                      <ActivityIndicator size={16} />
                    ) : (
                      <ThemedText className="text-sm">
                        {t('settings.account.verifyEmailButton')}
                      </ThemedText>
                    )}
                  </Button>
                </View>
              ) : null}

              <View className="relative w-full">
                <Button
                  variant="link"
                  className="absolute -top-3 -right-2 z-10"
                  onPress={() => setIsNewPasswordVisible(!isNewPasswordVisible)}
                >
                  <ThemedText className="text-sm text-muted-foreground">
                    {isNewPasswordVisible
                      ? t('common.form.password.hide')
                      : t('common.form.password.show')}
                  </ThemedText>
                </Button>
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormInput
                      label={t('settings.account.newPassword')}
                      placeholder={t('settings.account.newPasswordPlaceholder')}
                      {...field}
                      secureTextEntry={!isNewPasswordVisible}
                      autoComplete="password"
                      value={field.value || ''}
                      className="rounded-md"
                      autoCapitalize="none"
                    />
                  )}
                />
              </View>
              <View className="relative w-full">
                <Button
                  variant="link"
                  className="absolute -top-3 -right-2 z-10"
                  onPress={() =>
                    setIsConfirmPasswordVisible(!isConfirmPasswordVisible)
                  }
                >
                  <ThemedText className="text-sm text-muted-foreground">
                    {isConfirmPasswordVisible
                      ? t('common.form.password.hide')
                      : t('common.form.password.show')}
                  </ThemedText>
                </Button>
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormInput
                      label={t('settings.account.confirmPassword')}
                      placeholder={t(
                        'settings.account.confirmPasswordPlaceholder'
                      )}
                      {...field}
                      secureTextEntry={!isConfirmPasswordVisible}
                      autoComplete="password"
                      value={field.value || ''}
                      className="rounded-md"
                      autoCapitalize="none"
                    />
                  )}
                />
              </View>
              <View className="relative w-full my-4" />
              <View className="relative w-full">
                <Button
                  variant="link"
                  className="absolute -top-3 -right-2 z-10"
                  onPress={() => setIsOldPasswordVisible(!isOldPasswordVisible)}
                >
                  <ThemedText className="text-sm text-muted-foreground">
                    {isOldPasswordVisible
                      ? t('common.form.password.hide')
                      : t('common.form.password.show')}
                  </ThemedText>
                </Button>
                <FormField
                  control={form.control}
                  name="oldPassword"
                  render={({ field }) => (
                    <FormInput
                      label={t('settings.account.oldPassword')}
                      placeholder={t('settings.account.oldPasswordPlaceholder')}
                      secureTextEntry={!isOldPasswordVisible}
                      autoComplete="password"
                      {...field}
                      value={field.value || ''}
                      className="rounded-md"
                      autoCapitalize="none"
                    />
                  )}
                />
              </View>
              <View className="relative w-full">
                <ThemedText>
                  {t('settings.account.oldPasswordReason')}
                </ThemedText>
              </View>
              <ThemedText className="text-sm text-muted-foreground">
                {t('settings.account.exportData', {
                  defaultValue: 'Download my content',
                })}
              </ThemedText>
              <ThemedText className="text-xs text-muted-foreground">
                {t('settings.account.exportDataDescription', {
                  defaultValue:
                    'Download a copy of your data: your posts (with their thread context), posts you reacted to, and your profile and media, as a zip archive.',
                })}
              </ThemedText>
              <View className="w-full">
                <Button
                  variant="outline"
                  onPress={() => void startExport()}
                  disabled={exporting}
                >
                  {exporting ? (
                    <ThemedText className="text-sm">
                      {t('settings.account.exportPreparing', {
                        defaultValue: 'Preparing your export…',
                      })}
                    </ThemedText>
                  ) : (
                    <ThemedText className="text-sm">
                      {t('settings.account.downloadData', {
                        defaultValue: 'Download',
                      })}
                    </ThemedText>
                  )}
                </Button>
              </View>
            </ThemedView>
          </Form>
        </KeyboardAwareScrollView>
      </ThemedView>
    </ThemedView>
  );
};
