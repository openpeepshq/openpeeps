import {MainScreenProps} from '../../../../components/navigation/types';
import {useOpenpeeps} from '@openpeeps/react';
import {GenericHeader} from '../../../../components/custom';
import React, {useEffect, useState} from 'react';
import {ThemedText} from '../../../../components/ui/themed-text';
import {ThemedView} from '../../../../components/ui/themed-view';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {Form, FormField, FormInput} from '../../../../components/ui/form';
import Toast from 'react-native-toast-message';
import {Button} from '../../../../components/ui/button';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {Account, updateAccountPasswordFormSchema} from '@openpeeps/common';
import {View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {ThemedSafeAreaView} from '../../../../components/ui/themed-safe-area-view';

type AccountSettingsProps = MainScreenProps<'AccountSettings'>;

export const AccountSettings: React.FC<AccountSettingsProps> = ({}) => {
  const {openpeepsApi, queryClient} = useOpenpeeps();
  const {data: currentAccount} = openpeepsApi.useCurrentAccount();
  const logout = openpeepsApi.logoutAction();
  const [isOldPasswordVisible, setIsOldPasswordVisible] = React.useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = React.useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    React.useState(false);
  const updateCurrentAccount = openpeepsApi.updateCurrentAccountAction();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {t} = useTranslation();

  const form = useForm({
    resolver: zodResolver(updateAccountPasswordFormSchema),
    defaultValues: {
      email: (currentAccount as Account)?.email ?? '',
      oldPassword: '',
      newPassword: undefined,
      confirmPassword: undefined,
    },
  });

  const onSubmit = async (values: {
    email: string;
    oldPassword: string;
    newPassword: string | undefined;
    confirmPassword: string | undefined;
  }) => {
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
        await logout();
      })
      .catch(err => {
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
  const handleSubmit = async () => {
    const values = form.getValues();
    await onSubmit(values);
  };

  useEffect(() => {
    form.setValue('email', (currentAccount as Account)?.email ?? '');
  }, [currentAccount, form]);

  return (
    <ThemedSafeAreaView style={{flex: 1}}>
      <GenericHeader
        title="Account"
        rightButtonTitle={
          isSubmitting ? t('common.form.loading') : t('common.form.save')
        }
        onRightButtonPress={handleSubmit}
        rightButtonDisabled={isSubmitting}
      />
      <ThemedView style={{flex: 1}}>
        <KeyboardAwareScrollView
          contentContainerStyle={{flexGrow: 1}}
          className="w-full flex p-2">
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
                  render={({field}) => (
                    <FormInput
                      label={t('settings.account.email')}
                      placeholder={t('settings.account.emailPlaceholder')}
                      {...field}
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
                    setIsNewPasswordVisible(!isNewPasswordVisible)
                  }>
                  <ThemedText className="text-sm text-muted-foreground">
                    {isNewPasswordVisible
                      ? t('common.form.password.hide')
                      : t('common.form.password.show')}
                  </ThemedText>
                </Button>
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({field}) => (
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
                  }>
                  <ThemedText className="text-sm text-muted-foreground">
                    {isConfirmPasswordVisible
                      ? t('common.form.password.hide')
                      : t('common.form.password.show')}
                  </ThemedText>
                </Button>
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({field}) => (
                    <FormInput
                      label={t('settings.account.confirmPassword')}
                      placeholder={t(
                        'settings.account.confirmPasswordPlaceholder',
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
                  onPress={() =>
                    setIsOldPasswordVisible(!isOldPasswordVisible)
                  }>
                  <ThemedText className="text-sm text-muted-foreground">
                    {isOldPasswordVisible
                      ? t('common.form.password.hide')
                      : t('common.form.password.show')}
                  </ThemedText>
                </Button>
                <FormField
                  control={form.control}
                  name="oldPassword"
                  render={({field}) => (
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
            </ThemedView>
          </Form>
        </KeyboardAwareScrollView>
      </ThemedView>
    </ThemedSafeAreaView>
  );
};
