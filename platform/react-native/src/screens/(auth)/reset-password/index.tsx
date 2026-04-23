import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AUTH_ROUTES, AuthStackParamList } from '../../../components/navigation/types';
import { Button } from '../../../components/ui/button';
import { ThemedText } from '../../../components/ui/themed-text';
import { View } from 'react-native';
import { ArrowLeftIcon } from '../../../components/icons';

export const ResetPassword = ({
  navigation: { navigate, goBack },
}: NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>) => {

  return (
    <View className="flex-1 w-full ">
      <Button
        onPress={goBack}
        className="w-28 flex-row items-center"
        variant={'secondary'}>
        <ArrowLeftIcon className="mr-2 text-foreground" />
        <ThemedText className="tracking-wider">Back</ThemedText>
      </Button>
      <View className="my-7">
        <ThemedText className="text-2xl font-semibold">
          Reset password
        </ThemedText>
        <ThemedText className="text-xl mt-4">
          Kindly check the email provided for the link to reset your password.
          If you are done resetting your password, kindly click continue
        </ThemedText>
      </View>
      <View>
        <View className="w-full flex items-center">
          <Button
            onPress={() => {
              navigate(AUTH_ROUTES.LOGIN);
            }}
            className="w-full py-4 mb-10 rounded-lg">
            <ThemedText className="font-medium text-base">
              Continue
            </ThemedText>
          </Button>
        </View>
      </View>

    </View>
  );
};
