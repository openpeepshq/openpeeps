declare module 'react-native-config' {
  export interface NativeConfig {
    BASE_URL?: string;
    APP_ENV?: 'development' | 'staging' | 'production';
    LOGIN_EMAIL?: string;
    LOGIN_PASSWORD?: string;
    OAUTH_CLIENT_ID?: string;
    OAUTH_REDIRECT_URI?: string;
  }

  export const Config: NativeConfig;
  export default Config;
}
