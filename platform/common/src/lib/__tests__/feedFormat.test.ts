import { describe, expect, it } from 'vitest';
import { communityConfigSchema } from '../../types/config';
import { profileSettingsDataSchema } from '../../types/models';
import {
  DEFAULT_FEED_FORMAT,
  parseFeedFormat,
  resolveFeedFormat,
} from '../feedFormat';

describe('feedFormat', () => {
  it('defaults omitted and unknown values to threaded', () => {
    expect(parseFeedFormat()).toBe(DEFAULT_FEED_FORMAT);
    expect(parseFeedFormat('nope')).toBe('threaded');
    expect(parseFeedFormat('linear')).toBe('linear');
  });

  it('resolves profile over community over product default', () => {
    expect(resolveFeedFormat('linear', 'threaded')).toBe('linear');
    expect(resolveFeedFormat(undefined, 'linear')).toBe('linear');
    expect(resolveFeedFormat(undefined, undefined)).toBe('threaded');
  });

  it('parses community defaultFeedFormat and profile feedSettings.format', () => {
    const community = communityConfigSchema.parse({
      theme: {
        base: 'OpenpeepsLight',
        light: { primaryHex: '#15678a' },
        dark: { primaryHex: '#15678a' },
      },
      info: { name: 'Test', tagLine: 'Tag' },
      content: {},
      settings: {
        openRegistrations: true,
        defaultFeedFormat: 'linear',
      },
      roles: {
        onRegistration: { add: [], remove: [] },
        onEmailValidation: { add: [], remove: [] },
      },
    });
    expect(community.settings.defaultFeedFormat).toBe('linear');

    const settings = profileSettingsDataSchema.parse({
      id: 'profile-settings-1',
      feedSettings: { format: 'linear' },
    });
    expect(settings.feedSettings?.format).toBe('linear');
  });
});
