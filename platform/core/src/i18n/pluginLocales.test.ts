import { afterEach, describe, expect, it } from 'vitest';
import type { Resource } from 'i18next';
import {
  clearPluginLocales,
  mergeHostAndPluginLocales,
  registerPluginLocales,
  registeredPluginLocales,
} from './pluginLocales';

const host: Resource = {
  en: {
    configuration: { title: 'Configuration' },
    navigation: { logOut: 'Log out' },
  },
  de: {
    configuration: { title: 'Konfiguration' },
    navigation: { logOut: 'Abmelden' },
  },
};

afterEach(() => {
  clearPluginLocales();
});

describe('mergeHostAndPluginLocales', () => {
  it('returns host locales when no plugin packs are registered', () => {
    expect(mergeHostAndPluginLocales(host, [])).toEqual(host);
  });

  it('adds plugin keys and keeps host translations available', () => {
    const merged = mergeHostAndPluginLocales(host, [
      {
        en: {
          configuration: {
            plugins: { 'peeps-ai': { title: 'Peeps AI' } },
          },
          plugins: { peepsAi: { knowledgeBase: { title: 'Knowledge Base' } } },
        },
      },
    ]);

    expect(merged.en).toMatchObject({
      configuration: {
        title: 'Configuration',
        plugins: { 'peeps-ai': { title: 'Peeps AI' } },
      },
      navigation: { logOut: 'Log out' },
      plugins: { peepsAi: { knowledgeBase: { title: 'Knowledge Base' } } },
    });
  });

  it('lets the host win when a plugin redefines a host key', () => {
    const merged = mergeHostAndPluginLocales(host, [
      { en: { navigation: { logOut: 'hijacked' } } },
    ]);

    expect(merged.en).toMatchObject({ navigation: { logOut: 'Log out' } });
  });
});

describe('registerPluginLocales', () => {
  it('stores packs for later host merge', () => {
    registerPluginLocales('allpeep/peeps-ai', {
      en: { plugins: { peepsAi: { title: 'Peeps AI' } } },
    });

    expect(registeredPluginLocales()).toEqual([
      { en: { plugins: { peepsAi: { title: 'Peeps AI' } } } },
    ]);
  });
});
