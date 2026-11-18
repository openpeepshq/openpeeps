import { createElement } from 'react';
import { render } from '@react-email/render';
import { describe, expect, it } from 'vitest';
import type { EmailGlobals } from '@openpeepshq/common/types';

import { AnalyticsMonthlyReport } from './AnalyticsMonthlyReport';

const globals = {
  communityConfig: {
    info: { name: 'Inside AllPeeP', contactEmail: 'team@allpeep.com' },
    theme: { light: { logoSmall: 'https://example.com/logo.png' } },
  },
  serverData: { rootUrl: 'https://example.com' },
  i18nContext: {
    i18n: {},
    t: (key: string) => key,
  },
} as unknown as EmailGlobals;

describe('Analytics monthly report email', () => {
  it('renders the period range and report body from locals', async () => {
    const html = await render(
      createElement(AnalyticsMonthlyReport, {
        globals,
        locals: {
          periodFrom: '2026-09-01',
          periodTo: '2026-09-30',
          reportText: 'Total membership stood at 120 for the period.',
        },
      }),
    );

    expect(html).toContain('2026-09-01');
    expect(html).toContain('2026-09-30');
    expect(html).toContain('Total membership stood at 120 for the period.');
  });

  it('shows the reporting period exactly once', async () => {
    // #1887: the period must render once in the email. The body no longer
    // carries its own `Period:` line, so the template's line is the only one.
    const html = await render(
      createElement(AnalyticsMonthlyReport, {
        globals,
        locals: {
          periodFrom: '2026-09-01',
          periodTo: '2026-09-30',
          reportText: 'Total membership stood at 120 for the period.',
        },
      }),
    );

    expect((html.match(/Period:/g) ?? []).length).toBe(1);
  });
});
