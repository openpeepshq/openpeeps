import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AUTH_ROUTES,
  AuthStackParamList,
  MAIN_ROUTES,
  ROOT_ROUTES,
  RootStackParamList,
} from '../../../components/navigation/types';
import { Button } from '../../../components/ui/button';
import { ThemedText } from '../../../components/ui/themed-text';
import { Image } from 'react-native';
import { View } from 'react-native';
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

  const renderContent = () => {
    switch (type) {
      case 'signup':
        return (
          <View className="w-full bg-background p-2 flex-1 items-center">
            <View className="mb-4 p-5 w-full flex-1 bg-alpha justify-center items-center rounded-md">
              <View className="space-y-4 items-center bg-transparent">
                <Image
                  source={require('../../../assets/images/success.webp')}
                  className="rounded-md object-bottom"
                  resizeMode="cover"
                />
                <ThemedText className="text-xl text-center text-muted-foreground my-10">
                  Account created successfully. To verify your email, click the
                  button below to open your email app.
                </ThemedText>
              </View>
              <View className="w-full gap-7 flex items-center">
                {/* TODO uncomment if email verification is implemented */}
                {/* <Button
                  onPress={() => navigate(ROOT_ROUTES.MAIN)}
                  className="w-full py-4 rounded-lg">
                  <ThemedText className="font-medium text-base">
                    Open email app
                  </ThemedText>
                </Button> */}
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
                  className="w-full py-4 rounded-lg">
                  <ThemedText className="font-medium text-base">
                    Welcome
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
                source={require('../../../assets/images/success.webp')}
                className="rounded-md object-bottom"
                resizeMode="cover"
              />
              <ThemedText className="text-xl text-center  my-10">
                Password reset done.
              </ThemedText>
            </View>
            <View className="w-full gap-7 flex items-center">
              <Button
                onPress={() => navigate(AUTH_ROUTES.LOGIN)}
                className="w-full py-4 rounded-lg">
                <ThemedText className="font-medium text-base">
                  Go to login
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
