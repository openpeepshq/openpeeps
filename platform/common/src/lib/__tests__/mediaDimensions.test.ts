import { describe, expect, it } from 'vitest';
import {
  EVENT_HEADER_ASPECT_RATIO,
  HEADER_IMAGE_MAX_WIDTH,
  PROFILE_GROUP_HEADER_ASPECT_RATIO,
  VOICE_NOTE_AUTO_STOP_SECONDS,
  VOICE_NOTE_MAX_SECONDS,
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

  it('auto-stops voice notes half a second under the cap', () => {
    // Round-20 item 3: the recorders tick every 500 ms and the stop check runs
    // against the raw wall-clock span, so stopping at exactly the cap would
    // let ~half of honest cap-length takes probe above the server's
    // `> VOICE_NOTE_MAX_SECONDS` check. The shared threshold keeps every
    // honest take strictly under the cap (the 500 ms tick makes the file
    // ≤ 89.999 s) while still rejecting genuinely-overshot uploads.
    expect(VOICE_NOTE_MAX_SECONDS).toBe(90);
    expect(VOICE_NOTE_AUTO_STOP_SECONDS).toBe(VOICE_NOTE_MAX_SECONDS - 0.5);
    expect(VOICE_NOTE_AUTO_STOP_SECONDS * 1000).toBe(89500);
    // The 500 ms tick guarantees an honest take stopped at the threshold
    // probes in [89.5 s, 90.0 s) — strictly under the cap, so the server's
    // `> VOICE_NOTE_MAX_SECONDS` accepts it — while threshold + one tick
    // fills exactly to the cap, leaving no gap where a stopped take could
    // overshoot.
    expect(VOICE_NOTE_AUTO_STOP_SECONDS * 1000 + 500).toBe(
      VOICE_NOTE_MAX_SECONDS * 1000,
    );
  });
});
