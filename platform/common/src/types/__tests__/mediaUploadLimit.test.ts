import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAX_MEDIA_UPLOAD_MB,
  coreConfigSchema,
  mediaUploadLimitBytes,
} from '../config';

const storage = {
  driver: 'openpeeps' as const,
  params: { path: './.media', prefix: '/storage' },
};

describe('media upload limit', () => {
  it('defaults to 1 GiB', () => {
    expect(DEFAULT_MAX_MEDIA_UPLOAD_MB).toBe(1024);
    expect(mediaUploadLimitBytes(DEFAULT_MAX_MEDIA_UPLOAD_MB)).toBe(
      1024 * 1024 * 1024,
    );
  });

  it('converts a positive whole number of megabytes to bytes', () => {
    expect(mediaUploadLimitBytes(2)).toBe(2 * 1024 * 1024);
  });

  it('falls back to the default for a non-positive size', () => {
    expect(mediaUploadLimitBytes(0)).toBe(1024 * 1024 * 1024);
  });

  it('fills a missing media cap from the schema default', () => {
    const parsed = coreConfigSchema.shape.media.parse({ storage });
    expect(parsed.maxUploadMb).toBe(1024);
  });

  it('keeps an admin override and replaces an invalid one', () => {
    const media = coreConfigSchema.shape.media;
    expect(media.parse({ storage, maxUploadMb: 2048 }).maxUploadMb).toBe(2048);
    expect(media.parse({ storage, maxUploadMb: 0 }).maxUploadMb).toBe(1024);
  });
});
