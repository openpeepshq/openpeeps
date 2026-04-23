import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AUTH_ROUTES, AuthStackParamList } from '~/components/navigation/types';
import { Button } from '~/components/ui/button';
import { ThemedText } from '~/components/ui/themed-text';
import { Form, FormField, FormInput } from '~/components/ui/form';
import {
  requestResetPasswordRequestSchema,
  type RequestResetPasswordRequest,
} from '@openpeeps/common';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ActivityIndicator, View } from 'react-native';
import { ArrowLeftIcon } from '~/components/icons';
import { useOpenpeeps } from '@openpeeps/react';
import Toast from 'react-native-toast-message';

export const ForgotPassword = ({
  navigation: { navigate, goBack },
}: NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>) => {
  const { openpeepsApi } = useOpenpeeps();
  const [isLoading, setIsLoading] = React.useState(false);

  const requestPasswordReset = openpeepsApi.requestResetPasswordAction();

  const form = useForm<RequestResetPasswordRequest>({
    resolver: zodResolver(requestResetPasswordRequestSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: RequestResetPasswordRequest) {
    setIsLoading(true);
    await requestPasswordReset(values).catch(err => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err.message,
      });
    });
    setIsLoading(false);
    navigate(AUTH_ROUTES.RESET_PASSWORD);
  }
  return (
    <View className="flex-1 w-full flex justify-center">
      <Button
        onPress={goBack}
        className="w-28 flex-row items-center"
        variant={'secondary'}>
        <ArrowLeftIcon className="mr-2 text-foreground" />
        <ThemedText className="tracking-wider">Back</ThemedText>
      </Button>
      <View className="my-7">
        <ThemedText className="text-2xl font-semibold">
          Forgot Password
        </ThemedText>
        <ThemedText className="text-xl mt-4">
          Enter email below to get link to reset your password
        </ThemedText>
      </View>
      <Form {...form}>
        <View className="gap-7">
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
          <View>
            <View className="w-full flex items-center">
              <Button
                onPress={form.handleSubmit(onSubmit)}
                className="w-full py-4 mb-10 flex-row rounded-lg">
                {isLoading && (
                  <ActivityIndicator className="mr-2" size={'small'} />
                )}
                <ThemedText className="font-medium text-base">
                  Get Link
                </ThemedText>
              </Button>
            </View>
          </View>
        </View>
      </Form>
    </View>
  );
};
