import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  View,
} from 'react-native';
import React from 'react';
import { useOpenpeeps } from '@openpeeps/react';
import { useForm } from 'react-hook-form';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Form, FormField, FormInput } from '~/components/ui/form';
import { ThemedText } from '~/components/ui/themed-text';
import { Button } from '~/components/ui/button';
import { Event, PublicPost } from '@openpeeps/common';

interface GuestDataFormProps {
  jamPost: PublicPost;
}

export const GuestDataForm: React.FC<GuestDataFormProps> = ({ jamPost }) => {
  const jamEvent = jamPost.data as Event;
  const { openpeepsApi } = useOpenpeeps();
  const { data: server, isLoading } = openpeepsApi.useServerInfo();
  const { width } = Dimensions.get('window');
  const getGuestPass = openpeepsApi.guestPassAction();

  const form = useForm({
    defaultValues: {
      displayName: '',
      email: '',
      resource: {
        type: 'jam' as const,
        id: jamPost.id,
      },
    },
  });

  const guestData = form.getValues();

  const onSubmit = () => getGuestPass(guestData);

  return (
    <KeyboardAwareScrollView className="flex h-full w-full">
      {isLoading && <ActivityIndicator size={'small'} />}
      <Form {...form}>
        <Image
          source={{ uri: server?.communityConfig.theme.logoSmall }}
          style={{ width, height: width * 0.6 }}
          resizeMode="cover"
        />
        <ThemedText className="text-2xl mt-2 text-center">
          {jamEvent?.name || 'Jam'}
        </ThemedText>
        <ThemedText className="my-4 text-center">
          Enter your details below to proceed to waiting room
        </ThemedText>
        <View className="flex gap-y-6 w-full px-4">
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
          </View>

          <View className="flex flex-row">
            <ThemedText>By continuing, you agree to the</ThemedText>
            <ThemedText
              className="underline ml-2"
              onPress={() => Linking.openURL('/docs/terms-and-conditions')}>
              Terms of Service
            </ThemedText>
          </View>

          <Button onPress={onSubmit} variant="outline" className="w-full">
            <ThemedText>Continue</ThemedText>
          </Button>
        </View>
      </Form>
    </KeyboardAwareScrollView>
  );
};
