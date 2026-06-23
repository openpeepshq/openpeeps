import https from 'node:https';
import { initializeApp } from 'firebase-admin/app';
import { config } from '../config';
import { logger } from '../log';
import { createFcmCredential } from './fcmCredential';

const log = logger('core:notifications:firebase');

const fcmHttpAgent = new https.Agent({ keepAlive: true });

export const initializeFirebase = async () => {
  try {
    const { apps } = await config();
    const fcmCredentials = apps.android.fcmCredentials;
    if (!fcmCredentials) {
      return;
    }

    const serviceAccount = JSON.parse(fcmCredentials) as {
      client_email: string;
      private_key: string;
    };

    initializeApp({
      credential: createFcmCredential(serviceAccount, fcmHttpAgent),
      httpAgent: fcmHttpAgent,
    });
  } catch (error) {
    log.error('Failed to initialize Firebase', error);
  }
};
