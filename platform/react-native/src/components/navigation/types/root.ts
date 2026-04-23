import { NavigatorScreenParams } from '@react-navigation/native';
import { MainStackParamList } from './main';
import { AuthStackParamList } from './auth';

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainStackParamList>;
};

export const ROOT_ROUTES = {
  AUTH: 'Auth',
  MAIN: 'Main',
} as const;
