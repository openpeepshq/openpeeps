import { initializeApp, cert } from "firebase-admin/app";
import { config } from "../config";

export const initializeFirebase = async () =>
    config().then(async ({ apps }) => apps.android.fcmCredentials && initializeApp({
        credential: cert(JSON.parse(apps.android.fcmCredentials)),
    })).catch(console.error);
