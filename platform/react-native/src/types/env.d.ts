declare module 'react-native-config' {
    export interface NativeConfig {
        BASE_URL?: string;
        APP_ENV?: 'development' | 'staging' | 'production';
        LOGIN_EMAIL?: string;
        LOGIN_PASSWORD?: string;
    }

    export const Config: NativeConfig;
    export default Config;
}
