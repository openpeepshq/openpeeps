import { describe, expect, it } from 'vitest';
import { pluginInstallSourceSchema } from '../plugins';

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

  it('accepts package names rather than arbitrary npm specs', () => {
    expect(
      pluginInstallSourceSchema.safeParse({
        type: 'npm',
        package: 'https://example.com/plugin.tgz',
      }).success,
    ).toBe(false);
  });
});
