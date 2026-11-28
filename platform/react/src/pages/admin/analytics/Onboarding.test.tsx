/** @vitest-environment jsdom */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalyticsOnboarding } from '@openpeepshq/common/types';
import { lookup, readLocale } from './localeTestUtils';

// This test pins the en locale only — it asserts resolved *copy*, not key
// presence in de (see onboardingSteps.test.ts). Both share localeTestUtils.ts.
const en = readLocale('en');

// Populated at render time (after this module body has run) so the hoisted
// mock factories never read an uninitialized top-level const.
const { hookState } = vi.hoisted(() => ({
  hookState: {
    isLoading: false,
    data: null as AnalyticsOnboarding | null,
    sections: [] as Array<{
      title: string;
      csvFilename?: string;
      csvRows?: Array<Array<string | number>>;
    }>,
  },
}));

// Five steps in Welcome-checklist order, mirroring the server contract in
// getAnalyticsOnboarding (read.ts): the `label` is the plain-English CSV
// label; the UI re-labels through the Welcome-checklist locale keys.
const steps = (count: number): AnalyticsOnboarding['steps'] => [
  { key: 'email', label: 'Verify your email address', count, rate: 60 },
  { key: 'profile', label: 'Add profile details', count, rate: 40 },
  { key: 'follow', label: 'Connect with others', count, rate: 40 },
  { key: 'post', label: 'Make first post', count, rate: 20 },
  { key: 'group', label: 'Join a group', count, rate: 20 },
];

const data = (
  cohort: number,
  completedAll: number,
  stepCount: number,
): AnalyticsOnboarding => ({
  range: {
    from: '2026-11-01',
    to: '2026-11-30',
    previousFrom: '2026-09-02',
    previousTo: '2026-10-01',
    preset: '30d',
    compiledAt: null,
  },
  cohortSize: {
    key: 'cohortSize',
    value: cohort,
    previousValue: 0,
    deltaPct: cohort === 0 ? 0 : null,
  },
  completedAll: {
    key: 'completedAll',
    value: completedAll,
    previousValue: 0,
    deltaPct: completedAll === 0 ? 0 : null,
  },
  steps: steps(stepCount),
});

vi.mock('../../../index', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    lookup(en, key) ?? opts?.defaultValue ?? key,
  useOpenpeeps: () => ({
    openpeepsApi: {
      admin: {
        useAnalyticsOnboarding: () => ({
          isLoading: hookState.isLoading,
          data: hookState.data,
        }),
      },
    },
  }),
}));

vi.mock('./AnalyticsRangeContext', () => ({
  useAnalyticsRangeContext: () => ({ queryParams: { preset: '30d' } }),
}));

// Capture the section titles + CSV rows the page hands to AnalyticsSection
// so the export contract is pinned without rendering the section chrome.
vi.mock('./AnalyticsLayout', () => ({
  AnalyticsLoading: () =>
    createElement('div', { 'data-testid': 'analytics-loading' }),
  AnalyticsSection: (props: {
    title: string;
    children?: ReactNode;
    csvFilename?: string;
    csvRows?: Array<Array<string | number>>;
  }) => {
    hookState.sections.push({
      title: props.title,
      csvFilename: props.csvFilename,
      csvRows: props.csvRows,
    });
    return createElement(
      'section',
      { 'data-testid': 'analytics-section' },
      props.children,
    );
  },
}));

vi.mock('@openpeepshq/react-ui', () => ({
  AnalyticsInfoBadge: () => null,
  MetricCard: (props: { label: string; value: number; subtitle?: string }) =>
    createElement(
      'div',
      { 'data-testid': 'metric-card', 'data-label': props.label },
      props.subtitle
        ? createElement(
            'span',
            { 'data-testid': 'metric-subtitle' },
            props.subtitle,
          )
        : null,
    ),
  AnalyticsBarChart: (props: {
    data: Array<{ label: string; value: number }>;
  }) =>
    createElement(
      'div',
      { 'data-testid': 'bar-chart' },
      props.data.map((d) =>
        createElement(
          'span',
          { key: d.label, 'data-testid': 'bar-label' },
          d.label,
        ),
      ),
    ),
  Table: (props: {
    data: Array<Record<string, unknown>>;
    columnDefinitions: Array<{
      id: string;
      header?: ReactNode;
      render?: (row: Record<string, unknown>) => ReactNode;
    }>;
  }) =>
    createElement(
      'table',
      { 'data-testid': 'steps-table' },
      createElement(
        'thead',
        null,
        createElement(
          'tr',
          null,
          props.columnDefinitions.map((c) =>
            createElement(
              'th',
              { key: c.id, 'data-testid': `th-${c.id}` },
              c.header,
            ),
          ),
        ),
      ),
      createElement(
        'tbody',
        null,
        props.data.map((row, i) =>
          createElement(
            'tr',
            { key: i, 'data-testid': 'table-row' },
            props.columnDefinitions.map((c) =>
              createElement(
                'td',
                { key: c.id, 'data-testid': `td-${c.id}` },
                c.render ? c.render(row) : String(row[c.id]),
              ),
            ),
          ),
        ),
      ),
    ),
}));

import { AnalyticsOnboardingPage } from './Onboarding';

describe('AnalyticsOnboardingPage', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    hookState.isLoading = false;
    hookState.data = data(5, 1, 0);
    hookState.sections = [];
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = undefined;
    container = undefined;
  });

  const render = () =>
    act(() => {
      root?.render(createElement(AnalyticsOnboardingPage));
    });

  const all = (testid: string) =>
    Array.from(container!.querySelectorAll(`[data-testid="${testid}"]`));

  it('renders the loading state while the query is in flight', () => {
    hookState.isLoading = true;
    hookState.data = null;
    render();
    expect(all('analytics-loading').length).toBe(1);
    expect(all('metric-card').length).toBe(0);
    expect(all('steps-table').length).toBe(0);
  });

  it('renders two cards, the bar chart, and the three-column steps table', () => {
    render();

    const labels = all('metric-card').map((c) => c.getAttribute('data-label'));
    expect(labels).toEqual(['New members in range', 'Completed all steps']);
    // The completedAll card shows its share of the cohort (1/5 = 20%).
    const completedAllCard = all('metric-card')[1]!;
    expect(
      completedAllCard.querySelector('[data-testid="metric-subtitle"]')
        ?.textContent,
    ).toBe('This period (20%)');

    // Bar chart labels resolve through the Welcome-checklist keys.
    expect(all('bar-label').map((el) => el.textContent)).toEqual([
      'Verify your email address',
      'Add profile details',
      'Connect with others',
      'Make first post',
      'Join a group',
    ]);

    // Steps table: three columns, one row per step, percent rate column.
    const headers = Array.from(
      container!.querySelectorAll(
        '[data-testid="th-step"],[data-testid="th-count"],[data-testid="th-rate"]',
      ),
    ).map((el) => el.textContent?.replace(/\s+/g, ' ').trim());
    expect(headers).toEqual(['Step', 'Members', 'Rate']);
    expect(all('table-row').length).toBe(5);
    expect(all('td-rate').map((el) => el.textContent)).toEqual([
      '60%',
      '40%',
      '40%',
      '20%',
      '20%',
    ]);
    expect(all('td-step').map((el) => el.textContent)).toEqual(
      all('bar-label').map((el) => el.textContent),
    );
  });

  it('pins the section CSV row shapes', () => {
    render();

    const [funnel, stepsSection] = hookState.sections;
    expect(funnel?.csvFilename).toBe('onboarding-funnel.csv');
    expect(funnel?.csvRows).toEqual([
      ['step', 'label', 'count', 'rate'],
      ['email', 'Verify your email address', 0, 60],
      ['profile', 'Add profile details', 0, 40],
      ['follow', 'Connect with others', 0, 40],
      ['post', 'Make first post', 0, 20],
      ['group', 'Join a group', 0, 20],
    ]);
    expect(stepsSection?.csvFilename).toBe('onboarding-steps.csv');
    expect(stepsSection?.csvRows).toEqual([
      ['step', 'count', 'rate'],
      ['email', 0, 60],
      ['profile', 0, 40],
      ['follow', 0, 40],
      ['post', 0, 20],
      ['group', 0, 20],
    ]);
  });

  it('shows 0% for completedAll when the cohort is empty', () => {
    hookState.data = data(0, 0, 0);
    render();
    const completedAllCard = all('metric-card')[1]!;
    expect(
      completedAllCard.querySelector('[data-testid="metric-subtitle"]')
        ?.textContent,
    ).toBe('This period (0%)');
  });

  // The Onboarding page resolves its info texts through the `info()` helper,
  // which interpolates `admin.analytics.info.${key}` — dynamic keys the i18n
  // usage scanner (scripts/i18n-usage-scan.mjs) cannot see. Pinning the set
  // here is what keeps a rename/removal of those keys failing this test
  // instead of silently surfacing the raw defaultValue.
  it('pins the dynamic info() keys against the en locale', () => {
    const infoKeys = [
      'onboardingCohortSize',
      'onboardingCompletedAll',
      'onboardingFunnel',
      'onboardingStepsTable',
      'onboardingColumnStep',
      'onboardingColumnCount',
      'onboardingColumnRate',
    ];
    for (const key of infoKeys) {
      expect(lookup(en, `admin.analytics.info.${key}`), key).not.toBeNull();
    }
  });
});
