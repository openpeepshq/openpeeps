import { describe, expect, it } from 'vitest';
import {
  configurationPluginPageSlug,
  configurationPluginSlotName,
  humanizeConfigurationPluginSlug,
} from './configurationPluginPages';

describe('configurationPluginPageSlug', () => {
  it('accepts a one-segment plugin slot', () => {
    expect(
      configurationPluginPageSlug('plugins.admin.configuration.peeps-ai'),
    ).toBe('peeps-ai');
  });

  it('rejects host configuration routes', () => {
    expect(
      configurationPluginPageSlug('plugins.admin.configuration.community'),
    ).toBe(null);
    expect(
      configurationPluginPageSlug(
        'plugins.admin.configuration.server-settings',
      ),
    ).toBe(null);
  });

  it('rejects nested or unknown prefixes', () => {
    expect(
      configurationPluginPageSlug('plugins.admin.configuration.peeps-ai.extra'),
    ).toBe(null);
    expect(configurationPluginPageSlug('plugins.header')).toBe(null);
  });
});

describe('configurationPluginSlotName', () => {
  it('builds the approved configuration slot', () => {
    expect(configurationPluginSlotName('peeps-ai')).toBe(
      'plugins.admin.configuration.peeps-ai',
    );
  });
});

describe('humanizeConfigurationPluginSlug', () => {
  it('title-cases kebab slugs and uppercases short tokens', () => {
    expect(humanizeConfigurationPluginSlug('peeps-ai')).toBe('Peeps AI');
    expect(humanizeConfigurationPluginSlug('knowledge-base')).toBe(
      'Knowledge Base',
    );
  });
});
