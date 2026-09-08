import { describe, expect, it } from 'vitest';
import {
  analyticsPluginSlotName,
  analyticsPluginTabSlug,
  humanizeAnalyticsPluginSlug,
} from './analyticsPluginTabs';

describe('analyticsPluginTabSlug', () => {
  it('accepts a one-segment plugin slot', () => {
    expect(analyticsPluginTabSlug('plugins.admin.analytics.ai-insights')).toBe(
      'ai-insights',
    );
  });

  it('rejects host analytics routes', () => {
    expect(analyticsPluginTabSlug('plugins.admin.analytics.members')).toBe(
      null,
    );
  });

  it('rejects nested or unknown prefixes', () => {
    expect(
      analyticsPluginTabSlug('plugins.admin.analytics.ai-insights.extra'),
    ).toBe(null);
    expect(analyticsPluginTabSlug('plugins.header')).toBe(null);
  });
});

describe('analyticsPluginSlotName', () => {
  it('builds the approved analytics slot', () => {
    expect(analyticsPluginSlotName('ai-insights')).toBe(
      'plugins.admin.analytics.ai-insights',
    );
  });
});

describe('humanizeAnalyticsPluginSlug', () => {
  it('title-cases kebab slugs', () => {
    expect(humanizeAnalyticsPluginSlug('ai-insights')).toBe('Ai Insights');
  });
});
