import { describe, expect, it } from 'vitest';
import { communityConfigSchema } from '../config';
import {
  classifyAdditionalForbiddenHandle,
  collectAdditionalForbiddenHandles,
  forbiddenHandles,
  isForbiddenHandle,
} from '../forbiddenHandles';

const communityBase = {
  theme: {
    base: 'OpenpeepsLight',
    light: { primaryHex: '#15678a' },
    dark: { primaryHex: '#15678a' },
  },
  info: { name: 'Test', tagLine: 'Tag' },
  content: {},
  settings: { openRegistrations: true },
  roles: {
    onRegistration: { add: [], remove: [] },
    onEmailValidation: { add: [], remove: [] },
  },
};

describe('isForbiddenHandle', () => {
  it('blocks built-in names regardless of capitalization', () => {
    expect(isForbiddenHandle('admin')).toBe(true);
    expect(isForbiddenHandle('JamStarted')).toBe(true);
    expect(isForbiddenHandle('ok_name')).toBe(false);
  });

  it('blocks community additions as exact usernames', () => {
    expect(isForbiddenHandle('slur', ['slur'])).toBe(true);
    expect(isForbiddenHandle('SLUR', ['slur'])).toBe(true);
    expect(isForbiddenHandle('slurface', ['slur'])).toBe(false);
  });
});

describe('collectAdditionalForbiddenHandles', () => {
  it('keeps community names and drops built-ins, blanks, and duplicates', () => {
    expect(
      collectAdditionalForbiddenHandles([
        ' Admin ',
        'slur',
        'SLUR',
        'not a name',
        '',
        'ok-name',
      ]),
    ).toEqual({
      handles: ['slur', 'ok-name'],
      issues: [
        { index: 3, issue: 'invalid' },
        { index: 4, issue: 'empty' },
      ],
    });
  });

  it('classifies a built-in name as locked', () => {
    expect(classifyAdditionalForbiddenHandle('api', [])).toBe('builtIn');
    expect(forbiddenHandles).toContain('api');
  });
});

describe('communityConfigSchema additionalForbiddenHandles', () => {
  it('accepts a community list of forbidden usernames', () => {
    const parsed = communityConfigSchema.parse({
      ...communityBase,
      settings: {
        openRegistrations: true,
        additionalForbiddenHandles: ['slur', 'hate-speech'],
      },
    });
    expect(parsed.settings.additionalForbiddenHandles).toEqual([
      'slur',
      'hate-speech',
    ]);
  });
});
