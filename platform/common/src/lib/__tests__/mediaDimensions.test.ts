import { describe, expect, it } from 'vitest';
import {
  EVENT_HEADER_ASPECT_RATIO,
  HEADER_IMAGE_MAX_WIDTH,
  PROFILE_GROUP_HEADER_ASPECT_RATIO,
} from '../mediaDimensions';

describe('mediaDimensions', () => {
  it('caps header images above the web content column width', () => {
    expect(HEADER_IMAGE_MAX_WIDTH).toBe(800);
  });

  it('uses a 16:9 aspect ratio for event/article headers', () => {
    expect(EVENT_HEADER_ASPECT_RATIO).toBe('16:9');
  });

  it('uses a 3:1 aspect ratio for profile/group covers', () => {
    expect(PROFILE_GROUP_HEADER_ASPECT_RATIO).toBe('3:1');
  });
});
