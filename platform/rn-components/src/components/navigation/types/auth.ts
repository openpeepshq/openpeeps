export const AUTH_ROUTES = {
  LOGIN: 'Login',
  SIGNUP: 'Signup',
  SIGNUP_INVITATION: 'SignupInvitation',
  VALIDATE_EMAIL: 'ValidateEmail',
  WELCOME: 'Welcome',
  SUCCESS: 'Success',
  FORGOT_PASSWORD: 'ForgotPassword',
  RESET_PASSWORD: 'ResetPassword',
} as const;

export type AuthStackParamList = {
  [AUTH_ROUTES.LOGIN]: undefined;
  [AUTH_ROUTES.SIGNUP]: { inviteCode?: string } | undefined;
  [AUTH_ROUTES.SIGNUP_INVITATION]: { inviteCode?: string } | undefined;
  [AUTH_ROUTES.VALIDATE_EMAIL]: { token?: string } | undefined;
  [AUTH_ROUTES.WELCOME]: undefined;
  [AUTH_ROUTES.SUCCESS]: {
    type: 'signup' | 'password-reset';
  };
  [AUTH_ROUTES.FORGOT_PASSWORD]: undefined;
  [AUTH_ROUTES.RESET_PASSWORD]: undefined;
};
