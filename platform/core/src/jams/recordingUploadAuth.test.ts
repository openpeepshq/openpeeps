import { describe, expect, it } from 'vitest';
import { deriveJamRecordingUploadSecret } from './recordingUploadAuth';

describe('deriveJamRecordingUploadSecret', () => {
  it('derives a stable secret distinct from the recording id', () => {
    const recordingId = '019aaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const secret = deriveJamRecordingUploadSecret('api-secret', recordingId);
    expect(secret).toHaveLength(64);
    expect(secret).not.toBe(recordingId);
    expect(deriveJamRecordingUploadSecret('api-secret', recordingId)).toBe(
      secret,
    );
    expect(deriveJamRecordingUploadSecret('other', recordingId)).not.toBe(
      secret,
    );
  });
});
