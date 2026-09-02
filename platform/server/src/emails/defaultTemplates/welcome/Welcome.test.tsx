import { createElement } from 'react';
import { render } from '@react-email/render';
import { describe, expect, it } from 'vitest';
import type { EmailGlobals } from '@openpeepshq/common/types';

import { Welcome } from './Welcome';

const globals = {
  communityConfig: {
    info: { name: 'Test Community', contactEmail: 'team@example.com' },
    theme: { light: { logoSmall: 'https://example.com/logo.png' } },
    content: {
      welcomeEmail:
        'We are a test site.\n\nThis is a link: [Docs](https://example.com)\n\nHere are some links to help you get started:',
    },
  },
  serverData: { rootUrl: 'https://example.com' },
  i18nContext: {
    i18n: {},
    t: (key: string) => key,
  },
} as unknown as EmailGlobals;

describe('Welcome email markdown', () => {
  it('applies body font size and line-height to included markdown', async () => {
    const html = await render(createElement(Welcome, { globals }));

    expect(html).toContain('email-markdown');
    expect(html).toMatch(/\.email-markdown p[\s\S]*?font-size:\s*16px/);
    expect(html).toMatch(/\.email-markdown p[\s\S]*?line-height:\s*1\.5/);
    expect(html).toContain('Here are some links to help you get started');
  });
});
