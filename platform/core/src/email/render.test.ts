import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmailGlobals } from '@openpeepshq/common/types';

vi.mock('../config', () => ({
  config: vi.fn(),
  communityConfig: vi.fn(),
}));

vi.mock('../i18n', () => ({
  initI18nEmailContext: vi.fn(),
}));

import { config, communityConfig } from '../config';
import { initI18nEmailContext } from '../i18n';
import { registerEmailRenderer, registeredTemplates } from './registry';
import { render } from './render';

describe('email render globals.rootUrl', () => {
  beforeEach(() => {
    registeredTemplates.clear();
    vi.mocked(config).mockReset();
    vi.mocked(communityConfig).mockReset();
    vi.mocked(initI18nEmailContext).mockReset();

    vi.mocked(communityConfig).mockResolvedValue({
      info: { name: 'Test Community' },
    } as never);
    vi.mocked(initI18nEmailContext).mockResolvedValue({
      i18n: {},
      t: ((key: string) => key) as never,
    } as never);
  });

  it('uses server.host for public email links', async () => {
    vi.mocked(config).mockResolvedValue({
      server: { host: 'community.example.com' },
      email: {},
      apps: {
        ios: { url: undefined },
        android: { url: undefined },
      },
    } as never);

    let captured: EmailGlobals | undefined;
    registerEmailRenderer('root-url-probe', async (opts) => {
      captured = opts.globals;
      return { subject: 'probe', html: '<p>probe</p>' };
    });

    await render({ to: 'user@example.com', template: 'root-url-probe' });

    expect(captured?.serverData.rootUrl).toBe('https://community.example.com');
  });

  it('uses http for localhost server.host', async () => {
    vi.mocked(config).mockResolvedValue({
      server: { host: 'localhost:5174' },
      email: {},
      apps: {
        ios: { url: undefined },
        android: { url: undefined },
      },
    } as never);

    let captured: EmailGlobals | undefined;
    registerEmailRenderer('root-url-probe', async (opts) => {
      captured = opts.globals;
      return { subject: 'probe', html: '<p>probe</p>' };
    });

    await render({ to: 'user@example.com', template: 'root-url-probe' });

    expect(captured?.serverData.rootUrl).toBe('http://localhost:5174');
  });
});
