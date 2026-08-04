import type { CoreConfig } from '@openpeeps/common/types';
import db from './db';
import redis from './redis';
import { readEnvInteger, resolveJwtSecret } from '../helpers';
import logs from './logs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

export const defaultConfig: CoreConfig = {
  version: process.env.VERSION || 'dev',
  environment: process.env.ENVIRONMENT || 'dev',
  server: {
    host: process.env.SERVER_HOST || 'localhost:5174',
    signUpsOpen: true,
    publicContent: false,
    maxProfiles: readEnvInteger('SERVER_MAX_PROFILES', 0) || undefined,
  },
  db,
  redis,
  email: {
    renderHostBaseUrl: process.env.EMAIL_RENDER_HOST_BASE_URL || undefined,
    service: 'smtp',
    defaultTemplatePath: 'assets/email/templates',
    defaultFrom: process.env.EMAIL_DEFAULT_FROM,
    transportConfig: {
      host: process.env.EMAIL_CONFIG_HOST || 'localhost',
      port: readEnvInteger('EMAIL_CONFIG_PORT', 465),
      secure: process.env.EMAIL_CONFIG_SECURE !== 'false',
      ...(process.env.EMAIL_CONFIG_AUTH_USER
        ? {
            auth: {
              user: process.env.EMAIL_CONFIG_AUTH_USER,
              pass: process.env.EMAIL_CONFIG_AUTH_PASS,
            },
          }
        : {}),
    },
  },
  logs,
  media: {
    storage: {
      driver: 'openpeeps',
      params: {
        host: process.env.MEDIA_STORAGE_PARAMS_HOST,
        prefix: process.env.MEDIA_STORAGE_PARAMS_PREFIX || '/storage',
        path: process.env.MEDIA_STORAGE_PARAMS_PATH || './.media',
      },
    },
  },
  network: {
    port: readEnvInteger('NETWORK_PORT', 5173),
  },
  plugins: {
    path: path.resolve(process.env.PLUGINS_PATH || '../plugins'),
  },
  secrets: {
    jwt: resolveJwtSecret(),
  },
  jams: {
    livekit: {
      // Shared test SFU when unset; jams still need API key/secret to enable.
      url:
        process.env.JAMS_LIVEKIT_URL || 'https://livekit.test.allpeep.cloud',
      apiKey: process.env.JAMS_LIVEKIT_API_KEY,
      apiSecret: process.env.JAMS_LIVEKIT_API_SECRET,
      recordingEnabled: process.env.JAMS_LIVEKIT_RECORDING_ENABLED === 'true',
    },
  },
  vapid: {
    privateKey: process.env.VAPID_PRIVATE_KEY,
    publicKey: process.env.VAPID_PUBLIC_KEY,
  },
  federation: {
    active: false,
  },
  activityPub: {
    defaultDomain: process.env.ACTIVITY_PUB_DEFAULT_DOMAIN || 'localhost',
    itemsPerPage: readEnvInteger('ACTIVITY_PUB_ITEMS_PER_PAGE', 40),
    threadDepth: readEnvInteger('ACTIVITY_PUB_THRED_DEPTH', 10),
    federation: {
      requestTimeout: readEnvInteger(
        'ACTIVITY_PUB_FEDERATION_REQUEST_TIMEOUT',
        5000,
      ),
    },
  },
  sso: { generic: [], oidc: [] },
  services: {
    sentry: {
      enabled: true,
      replayEnabled: true,
      dsn:
        process.env.SENTRY_DSN ||
        'https://b27e3069e23abcf3c158ef9a34892458@sentry.allpeep-hq.com/4',
    },
    location: {
      type: 'nominatim',
      url: 'https://nominatim.allpeep.cloud/',
      apiKey: process.env.NOMINATIM_API_KEY,
    },
  },
  apps: {
    ios: {
      teamId: process.env.APPS_IOS_TEAM_ID,
      bundleIdentifier: process.env.APPS_IOS_BUNDLE_IDENTIFIER,
      apnKeyId: process.env.APPS_IOS_APN_KEY_ID,
      apnSigningKey: process.env.APPS_IOS_APN_SIGNING_KEY,
    },
    android: {
      packageName: process.env.APPS_ANDROID_PACKAGE_NAME,
    },
  },
  payments: {
    stripe: {
      paidMembership: {
        enabled: false,
        productId: process.env.PAYMENTS_STRIPE_PRODUCT_ID,
        trialPeriodDays: readEnvInteger('PAYMENTS_STRIPE_TRIAL_PERIOD_DAYS', 0),
      },
      publishableKey: process.env.PAYMENTS_STRIPE_PUBLISHABLE_KEY,
      secretKey: process.env.PAYMENTS_STRIPE_SECRET_KEY,
      webhookSecret: process.env.PAYMENTS_STRIPE_WEBHOOK_SECRET,
    },
  },
};
