import { CommunityConfig } from '@openpeepshq/common/types';
import dotenv from 'dotenv';

dotenv.config();

export const defaultCommunityConfig: CommunityConfig = {
  theme: {
    base: 'OpenpeepsLight',
    primaryHex: '#15678a',
    logoFull: '/img/logo-full.png',
    logoSmall: '/img/logo-small.png',
    defaultProfileAvatar: '/img/default-avatar.png',
    defaultGroupAvatar: '/img/default-group-avatar.svg',
    backgroundAuth: '/img/background-auth.png',
    icon: '/img/icon.svg',
    light: {
      primaryHex: '#15678a',
      logoSmall: '/img/logo-small.png',
      defaultProfileAvatar: '/img/default-avatar.png',
      defaultGroupAvatar: '/img/default-group-avatar.svg',
      backgroundAuth: '/img/background-auth.png',
    },
    dark: {
      primaryHex: '#15678a',
      logoSmall: '/img/logo-small-white.png',
      defaultProfileAvatar: '/img/default-avatar.png',
      defaultGroupAvatar: '/img/default-group-avatar.svg',
      backgroundAuth: '/img/background-auth.png',
    },
  },
  info: {
    name: process.env.COMMUNITY_INFO_NAME || 'Your OpenPeeps Community',
    tagLine:
      process.env.COMMUNITY_INFO_TAG_LINE ||
      "Don't build your house on someone else's ground!",
  },
  settings: {
    openRegistrations:
      process.env.COMMUNITY_SETTINGS_OPEN_REGISTRATIONS !== 'false',
  },
  content: {},
  roles: {
    onRegistration: { add: ['pendingmember'], remove: [] },
    onEmailValidation: { add: ['member'], remove: ['pendingmember'] },
  },
};
