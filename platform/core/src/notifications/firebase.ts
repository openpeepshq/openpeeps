import https from 'node:https';
import { getApps, initializeApp } from 'firebase-admin/app';
import { config } from '../config';
import { logger } from '../log';
import { createFcmCredential } from './fcmCredential';

const log = logger('core:notifications:firebase');

const fcmHttpAgent = new https.Agent({ keepAlive: true });

export const initializeFirebase = async () => {
  try {
    if (getApps().length > 0) {
      return;
    }

    const { apps } = await config();
    const fcmCredentials = apps.android.fcmCredentials;
    if (!fcmCredentials) {
      return;
    }

    const serviceAccount = JSON.parse(fcmCredentials) as {
      client_email: string;
      private_key: string;
      project_id?: string;
    };

    if (!serviceAccount.project_id) {
      log.error(
        'FCM credentials JSON is missing project_id; Firebase Messaging cannot send pushes',
      );
      return;
    }

    initializeApp({
      credential: createFcmCredential(serviceAccount, fcmHttpAgent),
      projectId: serviceAccount.project_id,
      httpAgent: fcmHttpAgent,
    });

    log.info(`Firebase initialized for project ${serviceAccount.project_id}`);
  } catch (error) {
    log.error('Failed to initialize Firebase', error);
  }
};
