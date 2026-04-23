import Config from 'react-native-config';

export const BASE_URL = Config.BASE_URL;
export const isProduction = Config.APP_ENV === 'production';

export const LOGIN_EMAIL = Config.LOGIN_EMAIL;
export const LOGIN_PASSWORD = Config.LOGIN_PASSWORD;

export type PostBoxTriggeredFrom =
  | 'reply'
  | 'community'
  | 'group'
  | 'my-feed'
  | undefined;

export const jamEmojis = ['💖', '👍🏿', '🎉', '👏🏿', '😂', '😮', '😥', '🤔', '👎🏿'];
