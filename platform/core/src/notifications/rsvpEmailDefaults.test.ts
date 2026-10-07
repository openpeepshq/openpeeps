import { describe, expect, it } from 'vitest';
import type { ProfileSettings } from '@openpeepshq/common/types';
import { notificationSettings } from './helpers';

const unset = {} as ProfileSettings;

describe('rsvp notification email defaults', () => {
  it('emails the host for a new RSVP unless they turned email off', () => {
    expect(notificationSettings(unset, 'rsvp').email).toBe(true);

    const savedOff = {
      notifications: {
        rsvp: { create: true, push: true, email: false },
      },
    } as ProfileSettings;
    expect(notificationSettings(savedOff, 'rsvp').email).toBe(false);
  });

  it('emails the host for a canceled RSVP unless they turned email off', () => {
    expect(notificationSettings(unset, 'rsvpCanceled').email).toBe(true);

    const savedOff = {
      notifications: {
        rsvpCanceled: { create: true, push: true, email: false },
      },
    } as ProfileSettings;
    expect(notificationSettings(savedOff, 'rsvpCanceled').email).toBe(false);
  });
});
