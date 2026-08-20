import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import {
  Login,
  Signup,
  Welcome,
  Success,
  ForgotPassword,
  ResetPassword,
} from '../../screens';
import { AUTH_ROUTES } from './types';
import { AuthWrapper } from './auth-wrapper';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'fade' }}
      screenLayout={({ children }) => <AuthWrapper>{children}</AuthWrapper>}
    >
      <Stack.Screen name={AUTH_ROUTES.WELCOME} component={Welcome} />
      <Stack.Screen name={AUTH_ROUTES.LOGIN} component={Login} />
      <Stack.Screen name={AUTH_ROUTES.SIGNUP} component={Signup} />
      <Stack.Screen name={AUTH_ROUTES.SUCCESS} component={Success} />
      <Stack.Screen
        name={AUTH_ROUTES.FORGOT_PASSWORD}
        component={ForgotPassword}
      />
      <Stack.Screen
        name={AUTH_ROUTES.RESET_PASSWORD}
        component={ResetPassword}
      />
    </Stack.Navigator>
  );
};
