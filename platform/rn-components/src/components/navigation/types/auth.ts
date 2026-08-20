export const AUTH_ROUTES = {
  LOGIN: 'Login',
  SIGNUP: 'Signup',
  WELCOME: 'Welcome',
  SUCCESS: 'Success',
  FORGOT_PASSWORD: 'ForgotPassword',
  RESET_PASSWORD: 'ResetPassword',
} as const;

export type AuthStackParamList = {
  [AUTH_ROUTES.LOGIN]: undefined;
  [AUTH_ROUTES.SIGNUP]: undefined;
  [AUTH_ROUTES.WELCOME]: undefined;
  [AUTH_ROUTES.SUCCESS]: {
    type: 'signup' | 'password-reset';
  };
  [AUTH_ROUTES.FORGOT_PASSWORD]: undefined;
  [AUTH_ROUTES.RESET_PASSWORD]: undefined;
};

