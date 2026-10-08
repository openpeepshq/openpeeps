import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import {
  Login,
  Register,
  RegisterInvitation,
  ValidateEmail,
  AuthWelcome,
  Success,
  RequestResetPassword,
  ResetPassword,
} from '../../pages';
import { AUTH_ROUTES } from './types';
import { AuthWrapper } from './auth-wrapper';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'fade' }}
      screenLayout={({ children }) => <AuthWrapper>{children}</AuthWrapper>}
    >
      <Stack.Screen name={AUTH_ROUTES.WELCOME} component={AuthWelcome} />
      <Stack.Screen name={AUTH_ROUTES.LOGIN} component={Login} />
      <Stack.Screen name={AUTH_ROUTES.SIGNUP} component={Register} />
      <Stack.Screen
        name={AUTH_ROUTES.SIGNUP_INVITATION}
        component={RegisterInvitation}
      />
      <Stack.Screen
        name={AUTH_ROUTES.VALIDATE_EMAIL}
        component={ValidateEmail}
      />
      <Stack.Screen name={AUTH_ROUTES.SUCCESS} component={Success} />
      <Stack.Screen
        name={AUTH_ROUTES.FORGOT_PASSWORD}
        component={RequestResetPassword}
      />
      <Stack.Screen
        name={AUTH_ROUTES.RESET_PASSWORD}
        component={ResetPassword}
      />
    </Stack.Navigator>
  );
};
