import { describe, expect, it } from 'vitest';
import {
  pluginInstallSourceSchema,
  pluginStoreListingSchema,
} from '../plugins';

describe('pluginInstallSourceSchema', () => {
  it('accepts npm, HTTPS token, and SSH deploy-key sources', () => {
    const sources = [
      {
        type: 'npm',
        package: '@private/plugin',
        auth: {
          token: 'npm-token',
          registry: 'https://npm.example.com',
        },
      },
      {
        type: 'git',
        url: 'https://git.example.com/org/plugin.git',
        auth: {
          type: 'token',
          username: 'git-user',
          token: 'git-token',
        },
      },
      {
        type: 'git',
        url: 'ssh://git@git.example.com/org/plugin.git',
        auth: {
          type: 'ssh',
          privateKey: 'private-key',
        },
      },
    ];

    expect(
      sources.every(
        (source) => pluginInstallSourceSchema.safeParse(source).success,
      ),
    ).toBe(true);
  });

  it('rejects credentials embedded in HTTPS repository URLs', () => {
    expect(
      pluginInstallSourceSchema.safeParse({
        type: 'git',
        url: 'https://secret@git.example.com/org/plugin.git',
      }).success,
    ).toBe(false);
  });

  it('requires the authentication type to match the repository protocol', () => {
    expect(
      pluginInstallSourceSchema.safeParse({
        type: 'git',
        url: 'ssh://git@git.example.com/org/plugin.git',
        auth: {
          type: 'token',
          username: 'git-user',
          token: 'git-token',
        },
      }).success,
    ).toBe(false);
    expect(
      pluginInstallSourceSchema.safeParse({
        type: 'git',
        url: 'https://git.example.com/org/plugin.git',
        auth: {
          type: 'ssh',
          privateKey: 'private-key',
        },
      }).success,
    ).toBe(false);
  });

  it('requires custom npm registries to use HTTPS', () => {
    expect(
      pluginInstallSourceSchema.safeParse({
        type: 'npm',
        package: '@private/plugin',
        auth: {
          token: 'npm-token',
          registry: 'http://npm.example.com',
        },
      }).success,
    ).toBe(false);
    expect(
      pluginInstallSourceSchema.safeParse({
        type: 'npm',
        package: '@private/plugin',
        auth: {
          token: 'npm-token',
          registry: 'https://secret@npm.example.com',
        },
      }).success,
    ).toBe(false);
  });

  it('accepts marketplace listings', () => {
    expect(
      pluginInstallSourceSchema.safeParse({
        type: 'marketplace',
        listing: 'peeps/greeter',
        version: '1.0.0',
      }).success,
    ).toBe(true);
    expect(
      pluginInstallSourceSchema.safeParse({
        type: 'marketplace',
        listing: 'peeps/greeter',
        version: '1.0.0',
        sha256: 'a'.repeat(64),
      }).success,
    ).toBe(true);
    expect(
      pluginInstallSourceSchema.safeParse({
        type: 'marketplace',
        listing: 'peeps/greeter',
        sha256: 'not-hex',
      }).success,
    ).toBe(false);
    expect(
      pluginInstallSourceSchema.safeParse({
        type: 'marketplace',
        listing: 'Not A Listing',
      }).success,
    ).toBe(false);
  });

  it('strips extra store listing fields', () => {
    const parsed = pluginStoreListingSchema.parse({
      id: 'peeps/greeter',
      title: 'Greeter',
      description: 'Hello',
      category: 'utility',
      priceCents: 0,
      currency: 'usd',
      latest: {
        version: '1.0.0',
        hostRange: '>=0.4.0',
        sha256: 'abc',
        capabilities: ['slots'],
        status: 'approved',
      },
      versions: [],
      reviews: [],
    });
    expect(parsed.latest).toEqual({
      version: '1.0.0',
      hostRange: '>=0.4.0',
      sha256: 'abc',
    });
  });

  it('accepts package names rather than arbitrary npm specs', () => {
    expect(
      pluginInstallSourceSchema.safeParse({
        type: 'npm',
        package: 'https://example.com/plugin.tgz',
      }).success,
    ).toBe(false);
  });
});
