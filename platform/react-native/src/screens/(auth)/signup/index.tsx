import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AUTH_ROUTES, AuthStackParamList } from '~/components/navigation/types';
import { Button } from '~/components/ui/button';
import { ThemedText } from '~/components/ui/themed-text';
import { Form, FormCheckbox, FormField, FormInput } from '~/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ActivityIndicator, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { BottomSheetDefaultBackdropProps } from '@gorhom/bottom-sheet/lib/typescript/components/bottomSheetBackdrop/types';
import { registerFormSchema, RegisterRequest } from '@openpeeps/common';
import { ArrowLeftIcon } from '~/components/icons';
import { useOpenpeeps } from '@openpeeps/react';
import Toast from 'react-native-toast-message';
import { useTheme } from '@react-navigation/native';

export const Signup = ({
  navigation: { navigate },
}: NativeStackScreenProps<AuthStackParamList, 'Signup'>) => {
  const { colors: { background, border } } = useTheme();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['25%', '50%', '85%'], []);
  const [isLoading, setIsLoading] = React.useState(false);

  const [step, setStep] = useState(1);

  const { openpeepsApi } = useOpenpeeps();

  const register = openpeepsApi.registerAction();

  const form = useForm<RegisterRequest>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      handle: '',
      email: '',
      password: '',
      confirmPassword: '',
      privacyPolicyAccepted: false,
    },
  });

  async function onSubmit(values: RegisterRequest) {
    setIsLoading(true);
    await register(values).catch(err => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err.message,
      });
    });
    setIsLoading(false);
    navigate(AUTH_ROUTES.SUCCESS, {
      type: 'signup',
    });
  }

  const password = form.watch('password');

  useEffect(() => {
    if (password && password.length > 8) {
      form.setValue('confirmPassword', password);
    }
  }, [password, form]);

  const handleNextStep = () => {
    setStep(2);
  };

  const handlePrevStep = () => {
    if (step === 1) {
      navigate(AUTH_ROUTES.LOGIN);
      return;
    }
    setStep(1);
  };

  const handlePresentModalPress = useCallback(() => {
    bottomSheetModalRef.current?.present();
  }, []);

  const handleSheetChanges = useCallback((index: number) => {
    console.log('handleSheetChanges', index);
  }, []);

  const renderBackdrop = useCallback(
    (
      props: React.JSX.IntrinsicAttributes & BottomSheetDefaultBackdropProps,
    ) => (
      <BottomSheetBackdrop
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        {...props}
      />
    ),
    [],
  );
  return (
    <>
      <View className="flex-1 w-full">
        <Form {...form}>
          <View className="gap-7 relative h-full">
            <View className="flex-1 justify-center">
              {step === 1 ? (
                // Step 1: Handle

                <View className="relative gap-7 w-full">
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormInput
                        label="Name"
                        placeholder=""
                        {...field}
                        className="rounded-md"
                        autoCapitalize="none"
                      />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="handle"
                    render={({ field }) => (
                      <FormInput
                        label="Handle"
                        placeholder=""
                        {...field}
                        className="rounded-md"
                        autoCapitalize="none"
                      />
                    )}
                  />
                </View>
              ) : (
                // Step 2: Email and Password
                <>
                  <View className="relative w-full">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormInput
                          label="Email"
                          placeholder=""
                          {...field}
                          className="rounded-md"
                          autoCapitalize="none"
                        />
                      )}
                    />
                  </View>
                  <View className="relative w-full">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormInput
                          label="Password"
                          placeholder=""
                          secureTextEntry={!isPasswordVisible}
                          autoComplete="password"
                          {...field}
                          className="rounded-md"
                        />
                      )}
                    />
                    <Button
                      variant="link"
                      className="absolute -top-3 -right-2"
                      onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                      <ThemedText className="text-sm text-muted-foreground">
                        {isPasswordVisible ? 'Hide password' : 'Show password'}
                      </ThemedText>
                    </Button>
                  </View>
                  <View className="flex w-full h-[38px] mt-2 relative flex-row items-center gap-3 pr-7">
                    <FormField
                      control={form.control}
                      name="privacyPolicyAccepted"
                      render={({ field }) => (
                        <FormCheckbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          {...field}
                          custom={true}
                          handleOnLabelPress={handlePresentModalPress}
                        />
                      )}
                    />
                  </View>
                </>
              )}
            </View>

            <View className=" w-full">
              <View className="w-full flex items-center">
                <View className="w-full flex-row gap-10">
                  <Button
                    onPress={handlePrevStep}
                    variant="outline"
                    className=" py-4 native:w-16 rounded-lg">
                    <ArrowLeftIcon className="text-foreground" />
                  </Button>
                  <Button
                    onPress={() => {
                      if (step === 1) {
                        handleNextStep();
                      } else {
                        form.handleSubmit(onSubmit)();
                      }
                    }}
                    disabled={isLoading}
                    className="flex-1 py-4 mb-10 flex-row rounded-lg">
                    {isLoading && (
                      <View>
                        <ActivityIndicator
                          size={20}
                          className="mr-2 native:text-foreground animate-spin"
                        />
                      </View>
                    )}
                    <ThemedText className="font-medium text-base">
                      Continue
                    </ThemedText>
                  </Button>
                </View>
              </View>
            </View>
          </View>
        </Form>
      </View>
      <BottomSheetModal
        style={{
          borderRadius: 13,
          borderWidth: 1,
          borderColor: border,
        }}
        index={1}
        ref={bottomSheetModalRef}
        onChange={handleSheetChanges}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: background,
        }}
        handleIndicatorStyle={{
          backgroundColor: background,
        }}
        snapPoints={snapPoints}>
        <BottomSheetView className="flex-1 bg-background items-center justify-center">
          <ThemedText>Privacy Policy</ThemedText>
        </BottomSheetView>
      </BottomSheetModal>
    </>);
};
