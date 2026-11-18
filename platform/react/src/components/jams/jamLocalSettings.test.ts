// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getJamLocalSettings, setJamLocalSettings } = await import(
  './jamLocalSettings'
);

describe('jamLocalSettings', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults micEnabled to true', () => {
    expect(getJamLocalSettings().micEnabled).toBe(true);
  });

  it('persists micEnabled and keeps other settings', () => {
    setJamLocalSettings({ micEnabled: false, speakerEnabled: false });
    expect(getJamLocalSettings().micEnabled).toBe(false);
    expect(getJamLocalSettings().speakerEnabled).toBe(false);
    setJamLocalSettings({ micEnabled: true });
    expect(getJamLocalSettings().micEnabled).toBe(true);
    expect(getJamLocalSettings().speakerEnabled).toBe(false);
  });

  it('applies the micEnabled default to a pre-upgrade stored entry', async () => {
    // A payload written before `micEnabled` existed: the defaults-merge in
    // `read()` must fill it in rather than return `undefined`. Re-import the
    // module so the read is not served from the module-level cache.
    window.localStorage.setItem(
      'openpeeps:jam-settings',
      JSON.stringify({
        speakerDeviceId: 'speakers-1',
        speakerEnabled: false,
        blur: true,
      }),
    );
    vi.resetModules();
    const { getJamLocalSettings: readFresh } = await import(
      './jamLocalSettings'
    );
    const settings = readFresh();
    expect(settings.micEnabled).toBe(true);
    expect(settings.speakerDeviceId).toBe('speakers-1');
    expect(settings.speakerEnabled).toBe(false);
    expect(settings.blur).toBe(true);
  });
});
