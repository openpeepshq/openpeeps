import { describe, expect, it } from 'vitest';
import { configurationLabelKey } from '../configuration/helpers';

describe('configurationLabelKey', () => {
  it('prefixes the configuration namespace', () => {
    expect(configurationLabelKey(['server', 'host'])).toBe(
      'configuration.server.host',
    );
  });

  it('drops array indices so list entries share labels', () => {
    expect(
      configurationLabelKey([
        'sso',
        'generic',
        '0',
        'userProfilePaths',
        'handle',
      ]),
    ).toBe('configuration.sso.generic.userProfilePaths.handle');
    expect(
      configurationLabelKey(['sso', 'oidc', 1, 'claimMapping', 'email']),
    ).toBe('configuration.sso.oidc.claimMapping.email');
  });

  it('keeps keys that merely contain digits', () => {
    expect(configurationLabelKey(['apps', 'ios2'])).toBe(
      'configuration.apps.ios2',
    );
  });
});
