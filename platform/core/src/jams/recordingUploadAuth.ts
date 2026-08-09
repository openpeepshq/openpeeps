import { createHmac } from 'node:crypto';
import { config } from '../config';

/**
 * S3 secret LiveKit egress uses for jam recording uploads.
 *
 * Access key / session token remain the recording id (path-bound). The secret
 * is derived from the LiveKit API secret so knowing a recording id alone is
 * not enough to forge SigV4 uploads.
 */
export const deriveJamRecordingUploadSecret = (
  apiSecret: string,
  recordingId: string,
): string =>
  createHmac('sha256', apiSecret)
    .update(`jam-recording-upload:${recordingId}`)
    .digest('hex');

export const jamRecordingUploadSecret = async (
  recordingId: string,
): Promise<string> => {
  const apiSecret = (await config()).jams.livekit.apiSecret;
  if (!apiSecret) {
    throw new Error('LiveKit API secret is not configured');
  }
  return deriveJamRecordingUploadSecret(apiSecret, recordingId);
};
